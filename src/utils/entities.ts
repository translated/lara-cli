const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const ENTITY_RE = /&(?:[a-zA-Z][a-zA-Z0-9]+|#\d+|#[xX][0-9a-fA-F]+);/g;

function decodeEntity(match: string): string {
  const body = match.slice(1, -1);
  if (body[0] === '#') {
    const isHex = body[1] === 'x' || body[1] === 'X';
    const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
      return match;
    }
    try {
      return String.fromCodePoint(code);
    } catch {
      return match;
    }
  }
  return NAMED_ENTITIES[body.toLowerCase()] ?? match;
}

/**
 * Decode HTML entities in `translated` only when `source` contains none.
 *
 * Lara's translation endpoint auto-detects structured input (TextBlock[])
 * as HTML-flavored content and is free to emit entities like `&nbsp;` or
 * `&amp;`. When the source was plain text, those entities end up written
 * verbatim into JSON/PO/etc. as literal characters (`&`, `n`, `b`, ...).
 * This function undoes that insertion while leaving translations alone
 * whenever the source already uses entities (e.g., Android XML with inline
 * markup the user intentionally encoded).
 */
export function normalizeEntities(source: string, translated: string): string {
  ENTITY_RE.lastIndex = 0;
  if (ENTITY_RE.test(source)) {
    ENTITY_RE.lastIndex = 0;
    return translated;
  }
  ENTITY_RE.lastIndex = 0;
  return translated.replace(ENTITY_RE, decodeEntity);
}
