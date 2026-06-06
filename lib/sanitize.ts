import sanitizeHtml from 'sanitize-html'

// Clean post HTML before we render it with dangerouslySetInnerHTML.
//
// WHY: body_html is raw HTML. Rendering raw HTML can run any <script> or
// onclick that's hidden inside it — that's an XSS (cross-site scripting) hole.
// Only admins write posts, so the risk is low, but "low" isn't "none": an admin
// could paste in something nasty by accident, or a future change could let
// other roles post. Sanitising at render is cheap insurance, so we do it.
//
// We use `sanitize-html` (a Node-server sanitiser with NO jsdom dependency) —
// the jsdom-based DOMPurify build crashed in Vercel's serverless runtime.
//
// We allow exactly the tags our TipTap editor produces, plus safe link
// attributes. Anything else (script, iframe, onclick, style, etc.) is stripped,
// and links are limited to safe protocols (no javascript: URLs).
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h2', 'h3', 'ul', 'ol', 'li',
      'a', 'blockquote', 'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Harden every link: open in a new tab and block tab-nabbing.
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    },
  })
}
