import Stripe from 'stripe'

let stripeClient: Stripe | null = null

// Created on first use (not at import time), so the production build never
// needs STRIPE_SECRET_KEY — only live requests do.
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return stripeClient
}
