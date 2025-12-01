  /**
   * Checks if a value is a plain object (not null, not an array).
   *
   * @param value - The value to check
   * @returns True if the value is a plain object
   */
  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
        if (key in target && isPlainObject(target[key]) && isPlainObject(source[key])) {
          output[key] = deepMerge(
            target[key],
            source[key]
          );
        } else {
          output[key] = source[key];
        }
      }
    }
    return output;
  }