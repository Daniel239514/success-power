// Shared price formatter. Always import this rather than formatting inline
// so every price display in the app changes together when the format changes.
export function formatPrice(amount: number, currency: string): string {
  const n = Number(amount)
  if (currency === 'NGN') {
    return `₦${n.toLocaleString('en-NG')}`
  }
  return `$${n.toLocaleString('en-US')}`
}
