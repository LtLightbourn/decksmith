import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'
import { createClerkClient } from '@clerk/backend'
import { Redis } from '@upstash/redis'
import {
  sendLimitReachedEmail,
  sendWelcomeArcaneEmail,
  sendWelcomeEmail,
} from './src/utils/emailService.js'

// Load .env relative to this file's location, not process.cwd()
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT ?? 3001

// Force HTTPS in production (Railway terminates TLS and sets x-forwarded-proto)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`)
    }
    next()
  })
}
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const USAGE_LIMIT = 3

// ── Upstash Redis ─────────────────────────────────────────────────────────
// Falls back to in-memory for local dev without Redis credentials.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let redis = null
if (UPSTASH_URL && UPSTASH_TOKEN) {
  redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
} else {
  console.warn('[decksmith] Upstash not configured — pro status and usage counts will not persist across restarts')
}

// In-memory fallback stores (used when Redis is not configured)
const proUsersMemory = new Set()
const usageCountsMemory = new Map()
const sentEmailsMemory = new Set() // tracks email:* keys in no-Redis mode

// ── Pro status helpers ────────────────────────────────────────────────────
async function isPro(userId) {
  if (redis) {
    const val = await redis.get(`pro:${userId}`)
    return val === true || val === 'true' || val === 1 || val === '1'
  }
  return proUsersMemory.has(userId)
}

async function setPro(userId, value) {
  if (redis) {
    if (value) {
      await redis.set(`pro:${userId}`, true)
    } else {
      await redis.del(`pro:${userId}`)
    }
    return
  }
  if (value) {
    proUsersMemory.add(userId)
  } else {
    proUsersMemory.delete(userId)
  }
}

// ── Usage count helpers ───────────────────────────────────────────────────
async function getUsageCount(userId) {
  if (redis) {
    const val = await redis.get(`usage:${userId}`)
    return parseInt(val ?? '0', 10)
  }
  return usageCountsMemory.get(userId) ?? 0
}

// Returns the new count after increment
async function incrementUsage(userId) {
  if (redis) {
    return await redis.incr(`usage:${userId}`)
  }
  const next = (usageCountsMemory.get(userId) ?? 0) + 1
  usageCountsMemory.set(userId, next)
  return next
}

// ── One-shot email flag helpers ────────────────────────────────────────────
// Returns true if the email has NOT been sent yet (and marks it sent).
async function claimEmailSlot(key) {
  if (redis) {
    // SET ... NX returns 'OK' on success, null if key already exists
    const result = await redis.set(key, true, { nx: true })
    return result !== null
  }
  if (sentEmailsMemory.has(key)) return false
  sentEmailsMemory.add(key)
  return true
}

// ── Clerk ─────────────────────────────────────────────────────────────────
const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null

// Returns { email, firstName } for a Clerk user ID, gracefully.
async function getUserInfo(userId) {
  if (!clerkClient) return { email: null, firstName: 'Planeswalker' }
  try {
    const user = await clerkClient.users.getUser(userId)
    return {
      email: user.emailAddresses[0]?.emailAddress ?? null,
      firstName: user.firstName ?? 'Planeswalker',
    }
  } catch {
    return { email: null, firstName: 'Planeswalker' }
  }
}

// ── Stripe ────────────────────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

// ── CORS ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    exposedHeaders: ['X-Usage-Remaining'],
  }))
} else if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, exposedHeaders: ['X-Usage-Remaining'] }))
}

// ── Stripe webhook — MUST be before express.json() ───────────────────────
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    res.status(400).send('Webhook not configured')
    return
  }

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe] webhook signature error:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id || session.metadata?.userId
    if (userId) {
      await setPro(userId, true)
      console.log(`[stripe] user ${userId} is now Pro`)

      // Fire welcome-arcane email (non-blocking)
      getUserInfo(userId).then(({ email, firstName }) => {
        sendWelcomeArcaneEmail(email, firstName)
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const userId = subscription.metadata?.userId
    if (userId) {
      await setPro(userId, false)
      console.log(`[stripe] Pro removed for user ${userId}`)
    }
  }

  res.json({ received: true })
})

// ── Body parser (after webhook route) ────────────────────────────────────
app.use(express.json())

// ── Auth middleware ───────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  if (!clerkClient) {
    req.userId = 'dev-user'
    return next()
  }

  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const payload = await clerkClient.verifyToken(token)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ── Pro-only middleware ───────────────────────────────────────────────────
async function requirePro(req, res, next) {
  const pro = await isPro(req.userId)
  if (!pro) {
    return res.status(402).json({
      error: 'pro_required',
      feature: req.path.replace('/api/', ''),
    })
  }
  next()
}

// Shared Claude proxy logic (no usage counting — used by Pro routes)
async function proxyToClaude(req, res) {
  const apiKey = process.env.ANTHROPIC_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_KEY not set in server environment' })
    return
  }
  try {
    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    if (!upstream.ok) { res.status(upstream.status).json(data); return }
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed', detail: String(err) })
  }
}

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// ── Waitlist ──────────────────────────────────────────────────────────────────
const WAITLIST_FILE = join(__dirname, 'waitlist.json')

app.post('/api/waitlist', async (req, res) => {
  const { email, tier } = req.body ?? {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' })
  }

  // Append to waitlist.json
  try {
    const existing = existsSync(WAITLIST_FILE)
      ? JSON.parse(readFileSync(WAITLIST_FILE, 'utf8'))
      : []
    existing.push({ email, tier: tier ?? 'grandmaster', joinedAt: Date.now() })
    writeFileSync(WAITLIST_FILE, JSON.stringify(existing, null, 2))
  } catch (err) {
    console.error('[waitlist] file write error:', err)
  }

  // Send confirmation email if Resend is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: "You're on the Decksmith Grandmaster waitlist ✦",
        html: `<p style="font-family:Georgia,serif;color:#b8a882;">
          Thanks for your interest in Decksmith Grandmaster. We'll reach out before it goes
          public with an exclusive early-access offer.
          </p><p style="font-family:Georgia,serif;color:#6a5a40;">— The Decksmith Guild</p>`,
      })
    } catch (err) {
      console.error('[waitlist] email error:', err)
    }
  }

  return res.json({ success: true })
})

// ── Stripe: create checkout session ──────────────────────────────────────
app.post('/api/stripe/create-checkout-session', requireAuth, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) {
    res.status(501).json({ error: 'Stripe not configured' })
    return
  }

  const userId = req.userId
  const appOrigin = process.env.APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? `https://${req.headers.host}`
      : 'http://localhost:5173')

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${appOrigin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/`,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('[stripe] checkout error:', err)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// ── Stripe: subscription status ───────────────────────────────────────────
app.get('/api/stripe/status', requireAuth, async (req, res) => {
  const userId = req.userId
  const [count, pro] = await Promise.all([
    getUsageCount(userId),
    isPro(userId),
  ])

  // Welcome email: fires on first touch if they haven't received one yet
  if (count === 0 && clerkClient) {
    claimEmailSlot(`email:welcome:${userId}`).then(claimed => {
      if (claimed) {
        getUserInfo(userId).then(({ email, firstName }) => {
          sendWelcomeEmail(email, firstName)
        })
      }
    })
  }

  res.json({ isPro: pro, usageCount: count, limit: USAGE_LIMIT })
})

// ── Usage endpoint ────────────────────────────────────────────────────────
app.get('/api/usage', requireAuth, async (req, res) => {
  const userId = req.userId
  const [count, pro] = await Promise.all([
    getUsageCount(userId),
    isPro(userId),
  ])

  // Welcome email: same trigger as /api/stripe/status (belt-and-suspenders)
  if (count === 0 && clerkClient) {
    claimEmailSlot(`email:welcome:${userId}`).then(claimed => {
      if (claimed) {
        getUserInfo(userId).then(({ email, firstName }) => {
          sendWelcomeEmail(email, firstName)
        })
      }
    })
  }

  res.json({ remaining: pro ? 9999 : Math.max(0, USAGE_LIMIT - count), limit: USAGE_LIMIT })
})

// ── Pro-gated Claude routes (no usage counting) ───────────────────────────
for (const route of [
  '/api/analyze-playgroup',
  '/api/tune-for-pod',
  '/api/upgrade-suggestions',
  '/api/budget-swaps',
  '/api/commander-finder',
  '/api/surprise-deck',
]) {
  app.post(route, requireAuth, requirePro, proxyToClaude)
}

// ── Claude API proxy (free tier — deck builds only) ───────────────────────
app.post('/api/claude', requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_KEY not set in server environment' })
    return
  }

  const userId = req.userId
  const [count, userIsPro] = await Promise.all([getUsageCount(userId), isPro(userId)])

  // Strip client-only flag before forwarding to Anthropic
  const { isChatMessage, ...anthropicBody } = req.body

  // Chat refinement requires Pro
  if (clerkClient && !userIsPro && isChatMessage) {
    return res.status(402).json({ error: 'pro_required', feature: 'merlin_chat' })
  }

  if (clerkClient && !userIsPro && count >= USAGE_LIMIT) {
    // Send limit-reached email once (non-blocking)
    claimEmailSlot(`email:limit:${userId}`).then(claimed => {
      if (claimed) {
        getUserInfo(userId).then(({ email, firstName }) => {
          sendLimitReachedEmail(email, firstName)
        })
      }
    })

    res.status(402).json({ error: 'Usage limit reached', limit: USAGE_LIMIT })
    return
  }

  try {
    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      res.status(upstream.status).json(data)
      return
    }

    const newCount = await incrementUsage(userId)
    const remaining = userIsPro ? 9999 : Math.max(0, USAGE_LIMIT - newCount)
    res.setHeader('X-Usage-Remaining', String(remaining))

    res.json(data)
  } catch (err) {
    console.error('[proxy] fetch error:', err)
    res.status(502).json({ error: 'Upstream request failed', detail: String(err) })
  }
})

// ── Serve built frontend in production ───────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
  app.use((_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[decksmith] listening on http://localhost:${PORT}`)
})
