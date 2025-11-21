import { flatten as flat, unflatten as unflat } from 'flat';
import type { Parser } from '../interface/parser.js';
import type { JsonParserOptionsType } from './parser.types.js';

/**
 * JSON parser that handles flattening and unflattening of JSON objects.
 *
 * This parser converts nested JSON structures into flat key-value pairs and vice versa,
 * making it easier to work with translations and other hierarchical data.
 *
 * @example
 * const parser = new JsonParser();
 * const flattened = parser.parse('{"dashboard": {"title": "Dashboard"}}');
 * // Returns: { "dashboard/title": "Dashboard" }
 *
 * const json = parser.serialize(flattened);
 * // Returns: '{"dashboard": {"title": "Dashboard"}}'
 */
export class JsonParser implements Parser<Record<string, unknown>, JsonParserOptionsType> {
  private readonly fallbackContent: string = '{}';
  private delimiter: string = '/';

  /**
   * Parses a JSON string and returns a flattened object.
   *
   * @param content - The JSON string to parse
   * @param options - Optional parsing options (unused in JSON parser)
   * @returns The flattened object with the keys being the path to the value.
   *
   * @example
   * Input:
   * {
   *   "dashboard": {
   *     "title": "Dashboard",
   *     "content": ["content 1", "content 2"]
   *   }
   * }
   *
   * Output:
   * {
   *   "dashboard/title": "Dashboard",
   *   "dashboard/content/0": "content 1",
   *   "dashboard/content/1": "content 2",
   * }
   */
  parse(
    content: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: JsonParserOptionsType
  ): Record<string, unknown> {
    const parsed = JSON.parse(content);
    return flat(parsed, { delimiter: this.delimiter });
  }

  /**
   * Serializes a flattened object back into a JSON string.
   *
   * @param data - The flattened object to serialize
   * @param formatting - Formatting options (indentation and trailingNewline)
   * @returns The JSON string with formatting applied
   *
   * @example
   * Input:
   * {
   *   "dashboard/title": "Dashboard",
   *   "dashboard/content/0": "content 1",
   *   "dashboard/content/1": "content 2",
   * }
   *
   * Output:
   * {
   *   "dashboard": {
   *     "title": "Dashboard",
   *     "content": ["content 1", "content 2"]
   *   }
   * }
   */
  serialize(
    data: Record<string, unknown>,
    options: JsonParserOptionsType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _originalContent?: string
  ): string {
    const unflattened = unflat(data, { delimiter: this.delimiter });
    const formatted = JSON.stringify(unflattened, null, options.indentation);
    return formatted + options.trailingNewline;
  }

  /**
   * Returns the fallback content for a JSON file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }
}
