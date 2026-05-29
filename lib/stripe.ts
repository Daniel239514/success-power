import Stripe from 'stripe'

let stripeClient: Stripe | null = null

// Created on first use (not at import time), so the production build never
// needs STRIPE_SECRET_KEY — only live requests do.
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Use fetch instead of Node's built-in https client. The default client
      // was throwing "connection to Stripe" errors on Vercel's serverless
      // runtime; the fetch client is more reliable there.
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return stripeClient
}
