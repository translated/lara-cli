/**
 * Heuristic detection of HTML-like markup in a string. Matches an opening tag
 * that starts with an ASCII letter — e.g. `<b>`, `<a href="...">`, `<br/>`.
 * Deliberately conservative: bare `<` followed by whitespace or a digit
 * (e.g. `5 < 10`) does not match.
 */
const HTML_TAG_RE = /<[a-zA-Z][^>]*>/;

export function hasHtmlMarkup(text: string): boolean {
  return HTML_TAG_RE.test(text);
}

/**
 * Picks the Lara `contentType` for a single translatable value.
 *
 * If the value contains inline HTML markup, it must be sent as `text/html`
 * regardless of the parser's default — otherwise Lara's plain-text path
 * may strip or escape the tags. If the value has no markup, fall back to
 * the parser's declared default (typically `text/plain` for JSON/PO/etc.,
 * or `text/html` for Android XML where the whole format permits markup).
 */
export function resolveContentType(text: string, defaultType: string): string {
  return hasHtmlMarkup(text) ? 'text/html' : defaultType;
}
