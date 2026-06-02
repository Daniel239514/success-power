import { getCountry } from '@/lib/geo'
import type { PaywallConfig } from '@/app/paywall'

// Stripe for the world, Paystack for Nigeria. Both pages that show the paywall
// (/subscribe and the locked episode page) resolve their config through here so
// the routing rule lives in exactly one place.
const STRIPE_CONFIG: PaywallConfig = {
  processor: 'stripe',
  checkoutUrl: '/api/checkout',
  monthly: { price: '$7', per: '/month' },
  annual: { price: '$63', per: '/year', badge: 'SAVE 25%' },
  footer: 'Cancel anytime. Secure payment via Stripe.',
}

const PAYSTACK_CONFIG: PaywallConfig = {
  processor: 'paystack',
  checkoutUrl: '/api/paystack/checkout',
  monthly: { price: '₦2,000', per: '/month' },
  annual: { price: '₦18,000', per: '/year', badge: 'SAVE 25%' },
  footer: 'Cancel anytime. Secure payment via Paystack.',
}

// override comes from ?country=NG (local test hook); null/absent in production.
export async function getPaywallConfig(
  override?: string | null,
): Promise<PaywallConfig> {
  const country = await getCountry(override)
  return country === 'NG' ? PAYSTACK_CONFIG : STRIPE_CONFIG
}
