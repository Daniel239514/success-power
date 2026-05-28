import Stripe from 'stripe'

// One shared Stripe client, created from our SECRET key (server-only).
// Imported by the checkout endpoint and the webhook.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
