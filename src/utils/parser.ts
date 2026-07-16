/**
 * CLDR plural form categories supported by Apple localization formats.
 */
export const PLURAL_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/**
 * Weaves "orphan" entries (present in the target but absent from the source) back
 * into a source-ordered list at their original target position.
 *
 * `base` is the source-ordered output. `target` is the target file's entries in
 * their original order. Each target entry whose key is NOT an `anchor` (i.e. not
 * shared with the source) — and that passes the optional `kept` filter — is an
 * orphan; it is re-inserted right after the nearest preceding shared entry
 * (`anchors`), or at the front if none precedes it. Source-order for shared
 * entries is preserved. Returns `base` unchanged when there are no orphans.
 *
 * Used by the translation engine and the merge-based parsers, which all reconcile
 * source vs. target the same way but over different element types.
 */
export function weaveOrphans<T>(
  base: T[],
  target: T[],
  keyOf: (item: T) => string,
  anchors: Set<string>,
  kept?: Set<string>
): T[] {
  const byAnchor = new Map<string | null, T[]>();
  let anchor: string | null = null;
  for (const item of target) {
    const key = keyOf(item);
    if (anchors.has(key)) {
      anchor = key;
      continue;
    }
    if (kept && !kept.has(key)) continue;
    const bucket = byAnchor.get(anchor) ?? [];
    bucket.push(item);
    byAnchor.set(anchor, bucket);
  }

  if (byAnchor.size === 0) return base;

  const woven: T[] = [...(byAnchor.get(null) ?? [])];
  for (const item of base) {
    woven.push(item);
    const orphans = byAnchor.get(keyOf(item));
    if (orphans) woven.push(...orphans);
  }
  return woven;
}

/**
 * Returns the root-entry name of a flattened key, i.e. the part before the first
 * `/` separator (`item_count/one` -> `item_count`, `title` -> `title`).
 */
export function rootKey(key: string): string {
  const slash = key.indexOf('/');
  return slash >= 0 ? key.substring(0, slash) : key;
}

/**
 * Escapes XML special characters for use in both attributes and text content.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Checks if a value is a plain object (not null, not an array).
 *
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Marker prefix used to prevent `flat` from treating numeric string keys as array indices.
 * Uses the STX (Start of Text) control character which won't appear in normal translation keys.
 */
export const NUMERIC_KEY_MARKER = '\x02';

const NUMERIC_KEY_RE = /^\d+$/;

/**
 * Recursively walks an object tree and prefixes all keys in plain objects that contain
 * at least one numeric key with NUMERIC_KEY_MARKER. Arrays are left untouched.
 *
 * @param obj - The value to process
 * @returns The processed value with marked numeric keys
 */
export function markNumericKeyObjects(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(markNumericKeyObjects);
  }
  if (!isPlainObject(obj)) {
    return obj;
  }

  const keys = Object.keys(obj);
  const hasNumericKey = keys.some((k) => NUMERIC_KEY_RE.test(k));

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const newKey = hasNumericKey ? NUMERIC_KEY_MARKER + key : key;
    result[newKey] = markNumericKeyObjects(obj[key]);
  }
  return result;
}

/**
 * Recursively walks an object tree and strips the NUMERIC_KEY_MARKER prefix from keys.
 *
 * @param obj - The value to process
 * @returns The processed value with restored keys
 */
export function restoreNumericKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(restoreNumericKeys);
  }
  if (!isPlainObject(obj)) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const newKey = key.startsWith(NUMERIC_KEY_MARKER) ? key.slice(NUMERIC_KEY_MARKER.length) : key;
    result[newKey] = restoreNumericKeys(obj[key]);
  }
  return result;
}

/**
 * Deep merges two objects, combining nested properties.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged object
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return source;

  const output = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      // If source value is an array, replace target (don't concatenate),
      // but shallow-clone to avoid sharing references.
      if (Array.isArray(source[key])) {
        output[key] = [...(source[key] as unknown[])];
        continue;
      }
      // If both are plain objects, deep merge them
      if (key in target && isPlainObject(target[key]) && isPlainObject(source[key])) {
        output[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
        continue;
      }
      // Otherwise, replace with source value
      output[key] = source[key];
    }
  }
  return output;
}
