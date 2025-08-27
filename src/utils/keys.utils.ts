/**
 * Finds the keys that need to be translated.
 * 
 * @param allKeys - The keys in the source file.
 * @param targetKeys - The keys in the target file.
 * @param changedKeys - The keys that have been changed in the source file.
 * @returns The keys that need to be translated.
 */
function findDiff(allKeys: string[], targetKeys: string[], changedKeys: string[]) {
  const keysToTranslate: string[] = [];

  allKeys.forEach(key => {
    // Case 1: The key is not present in the target file
    if(!targetKeys.includes(key)) {
      keysToTranslate.push(key);
      return;
    }

    // Case 2: The key has been changed
    if(changedKeys.includes(key)) {
      keysToTranslate.push(key);
    }
  });

  return keysToTranslate;
}

/**
 * Orders an object by keys.
 * 
 * @param map - The object to order.
 * @param keys - The keys to order the object by.
 * @returns The ordered object.
 */
function orderObjectByKeys(map: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return keys.reduce((acc, key) => {
    acc[key] = map[key];
    return acc;
  }, {} as Record<string, unknown>);
}

export { findDiff, orderObjectByKeys };
