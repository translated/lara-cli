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
      // If both target and source values are arrays, merge them
      if (Array.isArray(target[key]) && Array.isArray(source[key])) {
        output[key] = [...(target[key] as unknown[]), ...(source[key] as unknown[])];
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
