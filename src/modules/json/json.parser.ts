import { flatten, unflatten } from 'flat';

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
   *     "content": ["content 1", "content 2"]
   *   }
   * }
   *
   * Will be parsed as:
   * {
   *   "dashboard.title": "Dashboard",
   *   "dashboard.content.0": "content 1",
   *   "dashboard.content.1": "content 2",
   * }
   */
  public static parseFlattened(json: string): Record<string, string> {
    const parsed = JSON.parse(json);
    return flatten(parsed);
  }

  /**
   * Unflattens a flattened object
   * 
   * @param flattened - The flattened object to unflatten
   * @returns The unflattened object
   * 
   * Example:
   * {
   *   "dashboard.title": "Dashboard",
   *   "dashboard.content.0": "content 1",
   *   "dashboard.content.1": "content 2",
   * }
   * 
   * Will be unflattened as:
   * {
   *   "dashboard": {
   *     "title": "Dashboard",
   *     "content": ["content 1", "content 2"]
   *   }
   * }
   */
  public static unflatten(flattened: Record<string, string>): Record<string, unknown> {
    return unflatten(flattened);
  }
}
