// Shared Paystack helpers. Paystack has no official SDK we need here — every
// call is a plain REST request authorised with the SECRET key, exactly like the
// checkout route does.

const PAYSTACK_BASE = 'https://api.paystack.co'

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
    'Content-Type': 'application/json',
  }
}

// What we need to manage a subscription: its code (SUB_xxx) plus the email
// token Paystack requires to enable/disable it. Both live on the subscription
// object, which we read off the customer record.
export type PaystackSubscription = {
  subscriptionCode: string
  emailToken: string
  status: string
}

// Fetch a customer and return their current subscription, if any. We don't
// store the subscription code ourselves, so we look it up on demand. Returns
// null if the customer has no subscription Paystack still considers live.
export async function getActiveSubscription(
  customerCode: string,
): Promise<PaystackSubscription | null> {
  const res = await fetch(
    `${PAYSTACK_BASE}/customer/${encodeURIComponent(customerCode)}`,
    { headers: authHeaders() },
  )
  const data = await res.json()
  if (!data.status) {
    console.error('❌ Paystack fetch customer failed:', data)
    throw new Error(data.message ?? 'Could not fetch customer.')
  }

  const subs: Array<{
    subscription_code: string
    email_token: string
    status: string
  }> = data.data?.subscriptions ?? []

  // "active" = billing normally; "non-renewing" = cancelled but still valid
  // until period end. Either one is still manageable. "completed"/"cancelled"
  // ones are dead, so skip them.
  const live = subs.find(
    (s) => s.status === 'active' || s.status === 'non-renewing',
  )
  if (!live) return null

  return {
    subscriptionCode: live.subscription_code,
    emailToken: live.email_token,
    status: live.status,
  }
}

// Ask Paystack for a hosted link where the customer can update the card on
// this subscription. This is the closest thing Paystack offers to Stripe's
// portal — but it ONLY updates the card.
export async function getUpdateCardLink(
  subscriptionCode: string,
): Promise<string> {
  const res = await fetch(
    `${PAYSTACK_BASE}/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
    { headers: authHeaders() },
  )
  const data = await res.json()
  if (!data.status) {
    console.error('❌ Paystack manage-link failed:', data)
    throw new Error(data.message ?? 'Could not generate update link.')
  }
  return data.data.link as string
}

// Disable (cancel) a subscription. Paystack requires BOTH the code and the
// email token together. After this the subscription stops renewing.
export async function disableSubscription(
  subscriptionCode: string,
  emailToken: string,
): Promise<void> {
  const res = await fetch(`${PAYSTACK_BASE}/subscription/disable`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  })
  const data = await res.json()
  if (!data.status) {
    console.error('❌ Paystack disable subscription failed:', data)
    throw new Error(data.message ?? 'Could not cancel subscription.')
  }
}
