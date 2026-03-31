/**
 * Decksmith email service — wraps Resend.
 * All functions are fire-and-forget safe: they never throw.
 * If RESEND_API_KEY is not set the module is a complete no-op.
 */
import { Resend } from 'resend'
import { limitReachedEmail } from '../emails/limitReached.js'
import { welcomeArcaneEmail } from '../emails/welcomeArcane.js'
import { welcomeEmail } from '../emails/welcome.js'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

// ── Internal send helper ──────────────────────────────────────────────────────

async function sendEmail(to, template) {
  if (!resend || !to) {
    console.log('[email] Resend not configured — skipping email')
    return
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: template.subject,
      html: template.html,
    })
    if (error) {
      console.error('[email] send error:', error)
    } else {
      console.log(`[email] sent "${template.subject}" to ${to} (id: ${data?.id})`)
    }
  } catch (err) {
    // Never let email failure propagate to the caller
    console.error('[email] unexpected error:', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendLimitReachedEmail(email, firstName) {
  await sendEmail(email, limitReachedEmail({ firstName, appUrl: APP_URL }))
}

export async function sendWelcomeArcaneEmail(email, firstName) {
  await sendEmail(email, welcomeArcaneEmail({ firstName, appUrl: APP_URL }))
}

export async function sendWelcomeEmail(email, firstName) {
  await sendEmail(email, welcomeEmail({ firstName, appUrl: APP_URL }))
}
