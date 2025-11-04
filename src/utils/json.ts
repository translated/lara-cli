import { flatten as flat, unflatten as unflat } from 'flat';

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
function parseFlattened(json: string): Record<string, unknown> {
  const parsed = JSON.parse(json);
  return flat(parsed, { delimiter: '/' });
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
function unflatten(flattened: Record<string, unknown>): Record<string, unknown> {
  return unflat(flattened, { delimiter: '/' });
}

export { parseFlattened, unflatten };
