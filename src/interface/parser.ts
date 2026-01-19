/**
 * Generic parser interface for handling different file formats.
 *
 * @template T - The type of data structure returned by parse and accepted by serialize
 * @template TOptions - The type of formatting/options accepted by serialize (use void for parsers that don't need options)
 *
 * @example
 * ```typescript
 * class JsonParser implements Parser<Record<string, unknown>, JsonParserFormattingType> {
 *   parse(content: string): Record<string, unknown> {
 *     return JSON.parse(content);
 *   }
 *   serialize(data: Record<string, unknown>, formatting?: JsonParserFormattingType): string {
 *     return JSON.stringify(data);
 *   }
 * }
 *
 * class PoParser implements Parser<Record<string, unknown>, void> {
 *   parse(content: Buffer): Record<string, unknown> { ... }
 *   serialize(data: Record<string, unknown>): Buffer { ... }
 * }
 * ```
 */
export interface Parser<T = Record<string, unknown>, TOptions = void> {
  /**
   * Parses the content from a string or Buffer into the target data structure.
   *
   * @param content - The raw content to parse (string or Buffer)
   * @returns The parsed data structure of type T
   */
  parse(content: string | Buffer, options?: TOptions): T;

  /**
   * Serializes the data structure back into a string or Buffer.
   *
   * @param data - The data structure to serialize
   * @param options - Optional formatting/serialization options (type depends on parser implementation)
   * @returns The serialized content as string or Buffer
   */
  serialize(data: T, options: TOptions): string | Buffer;

  /**
   * Returns the fallback content for the file format.
   *
   * @returns The default content string
   */
  getFallback(): string;
}
