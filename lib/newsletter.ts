import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

// The ONE place a newsletter email gets sent for a post. Every publish path
// calls this same function:
//   - "Publish now" in the create/edit form
//   - the manual re-send API route (/api/admin/posts/[id]/send-email)
//   - the cron that publishes scheduled posts (Step K)
//
// Keeping it in one function means the email behaviour (who gets it, the
// template, the test-mode guard) is defined once and can't drift between paths.

// Where the app lives, for absolute links inside the email. Emails open in
// external clients, so relative URLs won't work — they need the full origin.
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  // Vercel sets this automatically on every deployment.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// Strip HTML down to plain text, so we can take a clean preview snippet from a
// body that's full of <p>, <strong>, etc.
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ') // drop tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

// First N characters of plain text, with an ellipsis if we cut it short.
export function previewText(html: string, max: number): string {
  const text = htmlToText(html)
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

// The email body. Table-based with inline styles — that's the only thing that
// renders reliably across email clients (Gmail, Outlook, Apple Mail). We use a
// slightly-lighter-than-black background (#1a1a1a) because pure #000 renders
// oddly / gets "dark-mode inverted" in some clients.
function buildEmailHtml({
  title,
  preview,
  url,
}: {
  title: string
  preview: string
  url: string
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0f0f0f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a1a1a;border-radius:12px;overflow:hidden;">
            <!-- gold accent line -->
            <tr><td style="height:4px;background:#c9a84c;"></td></tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#c9a84c;">Success Power</p>
                <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:#ffffff;">${title}</h1>
                <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#cccccc;">${preview}</p>
                <a href="${url}" style="display:inline-block;background:#c9a84c;color:#000000;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:12px 24px;border-radius:8px;">Read full post →</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#777777;">You're receiving this because you have a Success Power account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

// Send the newsletter email for a post to all subscribers.
//
// TEST MODE: while NEWSLETTER_TEST_EMAIL is set, we simulate the full loop
// (logging who WOULD get it) but only actually deliver one email — to that test
// address. This matches Resend's free tier, which only delivers to your own
// signed-up email until you verify a sending domain. To go live: verify a domain
// in Resend, point RESEND_FROM_EMAIL at it, and remove NEWSLETTER_TEST_EMAIL.
export async function sendNewsletterForPost(
  postId: string,
): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient()

  const { data: post } = await supabase
    .from('posts')
    .select('id, title, slug, body_html')
    .eq('id', postId)
    .single()

  if (!post) {
    console.error(`[newsletter] post ${postId} not found — nothing sent.`)
    return { sent: 0, failed: 0 }
  }

  // All registered users (free and paid) get the newsletter.
  const { data: usersData, error: usersError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (usersError) {
    console.error('[newsletter] could not load subscribers:', usersError.message)
    return { sent: 0, failed: 0 }
  }

  const emails = (usersData?.users ?? [])
    .map((u) => u.email)
    .filter((e): e is string => Boolean(e))

  const url = `${getBaseUrl()}/newsletter/${post.slug}`
  const html = buildEmailHtml({
    title: post.title,
    preview: previewText(post.body_html, 200),
    url,
  })
  const subject = post.title

  const testEmail = process.env.NEWSLETTER_TEST_EMAIL?.trim()

  // --- TEST MODE: simulate the loop, deliver only to you ---
  if (testEmail) {
    for (const email of emails) {
      console.log(`[newsletter] (test mode) would send to ${email}`)
    }
    const result = await sendEmail({ to: testEmail, subject, html })
    console.log(
      `[newsletter] test mode: simulated ${emails.length} subscriber(s); delivered 1 to ${testEmail} (${
        result.ok ? 'ok' : `failed: ${result.error}`
      })`,
    )
    return { sent: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 }
  }

  // --- PRODUCTION: deliver to every subscriber ---
  let sent = 0
  let failed = 0
  for (const email of emails) {
    const result = await sendEmail({ to: email, subject, html })
    if (result.ok) sent++
    else failed++
  }

  console.log(
    `[newsletter] post "${post.slug}": ${sent} sent, ${failed} failed of ${emails.length} subscriber(s).`,
  )
  return { sent, failed }
}
