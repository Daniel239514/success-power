import { getCountry } from '@/lib/geo'
import type { PaywallConfig } from '@/app/paywall'

// Stripe for the world, Paystack for Nigeria. Both pages that show the paywall
// (/subscribe and the locked episode page) resolve their config through here so
// the routing rule lives in exactly one place.
export const STRIPE_CONFIG: PaywallConfig = {
  processor: 'stripe',
  checkoutUrl: '/api/checkout',
  monthly: { price: '$7', per: '/month' },
  annual: { price: '$63', per: '/year', badge: 'SAVE 25%' },
  footer: 'Cancel anytime. Secure payment via Stripe.',
}

export const PAYSTACK_CONFIG: PaywallConfig = {
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

// For the subscribe page, where the user may CHOOSE their currency. `primary`
// is the geo-default (what's pre-selected); `alt` is the other option offered
// behind the currency toggle. Both processors work regardless of location —
// geo only decides which is shown first.
export async function getSubscribeConfigs(
  override?: string | null,
): Promise<{ primary: PaywallConfig; alt: PaywallConfig }> {
  const country = await getCountry(override)
  return country === 'NG'
    ? { primary: PAYSTACK_CONFIG, alt: STRIPE_CONFIG }
    : { primary: STRIPE_CONFIG, alt: PAYSTACK_CONFIG }
}
