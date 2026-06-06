import DOMPurify from 'isomorphic-dompurify'

// Clean post HTML before we render it with dangerouslySetInnerHTML.
//
// WHY: body_html is raw HTML. Rendering raw HTML can run any <script> or
// onclick that's hidden inside it — that's an XSS (cross-site scripting) hole.
// Only admins write posts, so the risk is low, but "low" isn't "none": an admin
// could paste in something nasty by accident, or a future change could let
// other roles post. Sanitising at render is cheap insurance, so we do it now.
//
// We allow exactly the tags our TipTap editor produces, plus safe link
// attributes. Anything else (script, iframe, onclick, style, etc.) is stripped.
export function sanitizePostHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h2', 'h3', 'ul', 'ol', 'li',
      'a', 'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    // Only allow safe link protocols (blocks javascript: URLs).
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  })
}
