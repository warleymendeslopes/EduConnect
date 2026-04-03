import DOMPurify from "isomorphic-dompurify"

/** Sanitize HTML from Trix / rich description before save or display. */
export function sanitizeActivityHtml(html: string): string {
  if (!html?.trim()) return ""
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["figure", "figcaption"],
    ADD_ATTR: ["class", "language"],
  })
}
