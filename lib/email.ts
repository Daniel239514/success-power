import { Resend } from 'resend'

let resendClient: Resend | null = null

// Created on first use (not at import time), so the production build never needs
// RESEND_API_KEY — only live email sends do. Same lazy pattern as lib/stripe.ts.
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY!)
  }
  return resendClient
}

export type SendEmailArgs = {
  to: string
  subject: string
  html: string
}

// The ONE place the whole app sends email through. Everything (newsletters now,
// receipts/resets later) goes via this function. Why centralise:
//   - swap providers: change this file, not 20 call sites.
//   - test/log: one spot to add logging, dry-run flags, or a fake in tests.
//   - consistency: the "from" address is set once, here, not copy-pasted around.
//
// Returns { ok } so callers can tally successes without try/catching everywhere.
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailArgs): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      html,
    })

    if (error) {
      console.error(`Email to ${to} failed:`, error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    // Network blip, bad API key, etc. Log and report failure rather than throw,
    // so a send loop over many recipients doesn't die on one bad address.
    console.error(`Email to ${to} threw:`, err)
    return { ok: false, error: (err as Error).message }
  }
}
