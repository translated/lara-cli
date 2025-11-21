import { getFileExtension } from '../utils/path.js';
import { JsonParser } from './json.parser.js';
import { PoParser } from './po.parser.js';
import { TsParser } from './ts.parser.js';
import { Parser } from '../interface/parser.js';
import { SUPPORTED_FILE_TYPES } from '#modules/common/common.const.js';
import { SupportedExtensionEnum } from '#modules/common/common.types.js';
import type { ParserOptionsType } from './parser.types.js';

/**
 * Parser factory that automatically detects file type and uses the appropriate parser.
 *
 * This factory acts as a facade for different file format parsers, determining which
 * parser to use based on the file extension.
 *
 * @example
 * ```typescript
 * const parser = new ParserFactory('/path/to/translations/en.json');
 * const data = parser.parse();
 * // Returns parsed JSON data
 *
 * const poParser = new ParserFactory('/path/to/translations/en.po');
 * const translations = poParser.parse();
 * // Returns parsed PO translations
 *
 * const formattedParser = new ParserFactory('/path/to/translations/en.json', {
 *   formatting: { indentation: 2, trailingNewline: '\n' }
 * });
 * ```
 */
export class ParserFactory {
  private readonly parser: Parser<Record<string, unknown>, ParserOptionsType>;

  /**
   * Creates a new ParserFactory instance.
   *
   * @param filePath - The path to the file to parse
   * @throws {Error} If the file extension is not supported
   */
  constructor(filePath: string) {
    // Step 1: Determine the extension (calculate if not provided)
    const detectedExtension = getFileExtension(filePath).toLowerCase();
    if (!this.isSupportedExtension(detectedExtension)) {
      throw new Error(
        `Unsupported file extension: ${detectedExtension}. Supported extensions: json, po`
      );
    }

    // Step 2: Get the appropriate parser based on extension
    this.parser = this.getParserForExtension(detectedExtension);
  }

  /**
   * Checks if the extension is supported
   *
   * @param extension - The file extension to check
   * @returns True if the extension is supported, false otherwise
   */
  private isSupportedExtension(extension: string): extension is SupportedExtensionEnum {
    return SUPPORTED_FILE_TYPES.includes(extension);
  }

  /**
   * Gets the appropriate parser based on the file extension
   *
   * @param extension - The file extension
   * @returns The parser instance for the given extension
   */
  private getParserForExtension(
    extension: SupportedExtensionEnum
  ): Parser<Record<string, unknown>, ParserOptionsType> {
    switch (extension) {
      case SupportedExtensionEnum.JSON:
        return new JsonParser();
      case SupportedExtensionEnum.PO:
        return new PoParser();
      case SupportedExtensionEnum.TS:
        return new TsParser();
    }
  }

  /**
   * Parses the file content and returns the parsed data
   *
   * @param targetContent - The raw file content to parse (string or Buffer)
   * @param options - Optional parsing options
   * @returns The parsed data as a Record<string, unknown>
   */
  parse(targetContent: string | Buffer, options?: ParserOptionsType): Record<string, unknown> {
    return this.parser.parse(targetContent, options);
  }

  /**
   * Serializes the data back to the file format
   *
   * @param data - The data to serialize
   * @param options - Optional formatting/serialization options
   * @param originalContent - Optional original content to preserve (used for merging in some formats like TS)
   * @returns The serialized content as string or Buffer
   */
  serialize(
    data: Record<string, unknown>,
    options: ParserOptionsType,
    originalContent?: string | Buffer
  ): string | Buffer {
    return this.parser.serialize(data, options, originalContent);
  }

  getFallback(): string {
    return this.parser.getFallback();
  }
}
