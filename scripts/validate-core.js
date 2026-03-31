/**
 * Shared validation logic for validate-env.js and validate-env-railway.js
 */

const VARS = [
  {
    key: 'ANTHROPIC_KEY',
    description: 'Anthropic API key for Merlin',
    validate: v => v.startsWith('sk-ant-'),
    hint: 'Get from console.anthropic.com → API Keys',
  },
  {
    key: 'VITE_CLERK_PUBLISHABLE_KEY',
    description: 'Clerk publishable key',
    validate: v => v.startsWith('pk_'),
    hint: 'Get from clerk.com → Dashboard → API Keys',
  },
  {
    key: 'CLERK_SECRET_KEY',
    description: 'Clerk secret key',
    validate: v => v.startsWith('sk_'),
    hint: 'Get from clerk.com → Dashboard → API Keys',
  },
  {
    key: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key',
    validate: v => v.startsWith('sk_'),
    hint: 'Get from stripe.com → Developers → API Keys',
  },
  {
    key: 'STRIPE_PRICE_ID',
    description: 'Stripe price ID for Arcane tier',
    validate: v => v.startsWith('price_'),
    hint: 'Get from stripe.com → Products → Decksmith Arcane → Price ID',
  },
  {
    key: 'VITE_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key',
    validate: v => v.startsWith('pk_'),
    hint: 'Get from stripe.com → Developers → API Keys',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    description: 'Stripe webhook signing secret',
    validate: v => v.startsWith('whsec_'),
    hint: 'Get from stripe.com → Developers → Webhooks → your endpoint',
    optional: true,
  },
  {
    key: 'UPSTASH_REDIS_REST_URL',
    description: 'Upstash Redis REST URL',
    validate: v => v.startsWith('https://'),
    hint: 'Get from console.upstash.com → your database → REST API',
  },
  {
    key: 'UPSTASH_REDIS_REST_TOKEN',
    description: 'Upstash Redis REST token',
    validate: v => v.length > 20,
    hint: 'Get from console.upstash.com → your database → REST API',
  },
  {
    key: 'RESEND_API_KEY',
    description: 'Resend email API key',
    validate: v => v.startsWith('re_'),
    hint: 'Get from resend.com → API Keys',
  },
  {
    key: 'EMAIL_FROM',
    description: 'From email address for transactional emails',
    validate: v => v.includes('@'),
    hint: 'e.g. merlin@decksmith.gg or onboarding@resend.dev',
  },
]

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GRAY   = '\x1b[90m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'

export function runValidation(env) {
  console.log(`\n${BOLD}Decksmith — Environment Validation${RESET}\n`)

  const results = VARS.map(spec => {
    const value = env[spec.key]
    if (!value) {
      return { ...spec, status: spec.optional ? 'optional-missing' : 'missing' }
    }
    const valid = spec.validate(value)
    return { ...spec, status: valid ? 'valid' : 'invalid', value }
  })

  for (const r of results) {
    if (r.status === 'valid') {
      console.log(`${GREEN}✅${RESET} ${BOLD}${r.key}${RESET} ${GRAY}— ${r.description}${RESET}`)
    } else if (r.status === 'optional-missing') {
      console.log(`${YELLOW}⚠️  ${BOLD}${r.key}${RESET} ${GRAY}— optional, add after first deploy${RESET}`)
    } else if (r.status === 'missing') {
      console.log(`${RED}❌ ${BOLD}${r.key}${RESET} ${GRAY}— ${r.description}${RESET}`)
      console.log(`   ${GRAY}not set${RESET}`)
      console.log(`   ${YELLOW}Hint: ${r.hint}${RESET}`)
    } else if (r.status === 'invalid') {
      console.log(`${RED}❌ ${BOLD}${r.key}${RESET} ${GRAY}— ${r.description}${RESET}`)
      console.log(`   ${GRAY}set but failed format check${RESET}`)
      console.log(`   ${YELLOW}Hint: ${r.hint}${RESET}`)
    }
  }

  const required   = results.filter(r => !r.optional)
  const passing    = required.filter(r => r.status === 'valid')
  const failing    = required.filter(r => r.status === 'missing' || r.status === 'invalid')
  const optMissing = results.filter(r => r.status === 'optional-missing')

  console.log()
  console.log(`${passing.length === required.length ? GREEN : RED}${BOLD}${passing.length}/${required.length}${RESET} required vars configured`)

  if (optMissing.length > 0) {
    console.log(`${YELLOW}${optMissing.length} optional var${optMissing.length !== 1 ? 's' : ''} missing ${GRAY}(safe to deploy without)${RESET}`)
  }

  console.log()
  if (failing.length > 0) {
    console.log(`${RED}${BOLD}❌ NOT READY TO DEPLOY${RESET}${RED} — fix the above errors first${RESET}\n`)
    process.exit(1)
  } else {
    console.log(`${GREEN}${BOLD}✅ READY TO DEPLOY${RESET}\n`)
    process.exit(0)
  }
}
