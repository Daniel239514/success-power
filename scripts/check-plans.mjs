// One-off audit: confirm Stripe and Paystack subscriptions never mix.
// Read-only. Run: node scripts/check-plans.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local by hand (a plain node script doesn't get Next's env loading).
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const { data, error } = await supabase
  .from('profiles')
  .select('subscription_status, subscription_plan, paystack_customer_code, stripe_customer_id')

if (error) {
  console.error('Query failed:', error.message)
  process.exit(1)
}

// Group active users by their plan.
const byPlan = {}
for (const p of data) {
  if (p.subscription_status !== 'active') continue
  const plan = p.subscription_plan ?? '(null)'
  byPlan[plan] ??= { count: 0, hasStripeId: 0, hasPaystackCode: 0 }
  byPlan[plan].count++
  if (p.stripe_customer_id) byPlan[plan].hasStripeId++
  if (p.paystack_customer_code) byPlan[plan].hasPaystackCode++
}

const ngn = (p) => p.endsWith('_ngn')
console.log('\nACTIVE subscribers by plan:\n')
console.log('plan'.padEnd(16), 'count'.padEnd(7), 'processor'.padEnd(12), 'stripe_id  paystack_code')
console.log('-'.repeat(64))
for (const [plan, s] of Object.entries(byPlan)) {
  const processor = plan === '(null)' ? '?' : ngn(plan) ? 'Paystack' : 'Stripe'
  console.log(
    plan.padEnd(16),
    String(s.count).padEnd(7),
    processor.padEnd(12),
    String(s.hasStripeId).padEnd(10),
    String(s.hasPaystackCode),
  )
}

// The cross-contamination check: a _ngn plan should NEVER have a stripe id, and
// a non-_ngn plan should NEVER have a paystack code.
const mixed = data.filter(
  (p) =>
    p.subscription_status === 'active' &&
    p.subscription_plan &&
    ((ngn(p.subscription_plan) && p.stripe_customer_id) ||
      (!ngn(p.subscription_plan) && p.paystack_customer_code)),
)
console.log('\n' + (mixed.length === 0
  ? '✅ No crossover: every active plan matches exactly one processor.'
  : `⚠️  ${mixed.length} row(s) have BOTH processors set — investigate.`))
