export class JsonParser {
 
  /**
   * Parses a JSON string and returns a flattened object
   *
   * @param json - The JSON string to parse
   * @returns The flattened object with the keys being the path to the value.
   * 
   * Example: 
   * {
   *   "dashboard": {
   *     "title": "Dashboard",
   *     "content": [
   *       "content 1",
   *       "content 2",
   *     ]
   *   }
   * }
   *
   * Will be parsed as:
   * {
   *   "dashboard/title": "Dashboard",
   *   "dashboard/content/0": "content 1",
   *   "dashboard/content/1": "content 2",
   * }
   */
  public static parseFlattened(json: string): Record<string, string> {
    const parsed = JSON.parse(json);

    return this.flatten(parsed);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static flatten(obj: any, prefix: string = ''): Record<string, string> {
    const result: Record<string, string> = {}

    Object.keys(obj).forEach(key => {
      const value = obj[key]
      const newKey = prefix ? `${prefix}/${key}` : key

      this.processValue(value, newKey, result)
    })

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static processValue(value: any, key: string, result: Record<string, string>): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.processValue(item, `${key}/${index}`, result)
      })
      return
    }

    if (typeof value === 'object' && value !== null) {
      const flattened = this.flatten(value, key)
      Object.assign(result, flattened)
      return
    }

    result[key] = String(value)
  }
}
