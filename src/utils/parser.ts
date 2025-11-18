/**
 * Generic parser interface for handling different file formats.
 *
 * @template T - The type of data structure returned by parse and accepted by serialize
 *
 * @example
 * ```typescript
 * class JsonParser implements Parser<Record<string, unknown>> {
 *   parse(content: string): Record<string, unknown> {
 *     return JSON.parse(content);
 *   }
 *   serialize(data: Record<string, unknown>): string {
 *     return JSON.stringify(data);
 *   }
 * }
 * ```
 */
export interface Parser<T> {
  /**
   * Parses the content from a string or Buffer into the target data structure.
   *
   * @param content - The raw content to parse (string or Buffer)
   * @returns The parsed data structure of type T
   */
  parse(content: string | Buffer): T;

  /**
   * Serializes the data structure back into a string or Buffer.
   *
   * @param data - The data structure to serialize
   * @param formatting - The formatting options to apply
   * @returns The serialized content as string or Buffer
   */
  serialize(
    data: T,
    formatting?: { indentation: string | number; trailingNewline: string }
  ): string | Buffer;
}
