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
        if (key in target && typeof target[key] === 'object' && typeof source[key] === 'object') {
          if (Array.isArray(target[key]) || Array.isArray(source[key])) {
            output[key] = source[key];
          } else {
            output[key] = deepMerge(
              target[key] as Record<string, unknown>,
              source[key] as Record<string, unknown>
            );
          }
        } else {
          output[key] = source[key];
        }
      }
    }
    return output;
  }