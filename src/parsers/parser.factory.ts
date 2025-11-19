import { getFileExtension } from '../utils/path.js';
import { JsonParser } from './json.parser.js';
import { PoParser } from './po.parser.js';
import { Parser } from '../interface/parser.js';
import { SUPPORTED_FILE_TYPES } from '#modules/common/common.const.js';
import { JsonParserFormattingType, SupportedExtensionEnum } from '#modules/common/common.types.js';

/**
 * File connector that automatically detects file type and uses the appropriate parser.
 *
 * This connector acts as a facade for different file format parsers, determining which
 * parser to use based on the file extension.
 *
 * @example
 * ```typescript
 * const connector = new FileConnector('/path/to/translations/en.json');
 * const data = connector.parse();
 * // Returns parsed JSON data
 *
 * const poConnector = new FileConnector('/path/to/translations/en.po');
 * const translations = poConnector.parse();
 * // Returns parsed PO translations
 *
 * const formattedConnector = new FileConnector('/path/to/translations/en.json', {
 *   formatting: { indentation: 2, trailingNewline: '\n' }
 * });
 * ```
 */
export class ParserFactory {
  private readonly filePath: string;
  private readonly extension: SupportedExtensionEnum;
  private readonly parser: Parser<Record<string, unknown>, unknown>;

  /**
   * Creates a new FileConnector instance.
   *
   * @param filePath - The path to the file to parse
   * @param options - Optional configuration options
   * @throws {Error} If the file extension is not supported
   */
  constructor(filePath: string, extension?: SupportedExtensionEnum) {
    this.filePath = filePath;

    // Step 1: Determine the extension (calculate if not provided)
    if (extension) {
      this.extension = extension;
    } else {
      const detectedExtension = getFileExtension(filePath).toLowerCase();
      if (!this.isSupportedExtension(detectedExtension)) {
        throw new Error(
          `Unsupported file extension: ${detectedExtension}. Supported extensions: json, po`
        );
      }
      this.extension = detectedExtension as SupportedExtensionEnum;
    }

    // Step 2: Get the appropriate parser based on extension
    this.parser = this.getParserForExtension(this.extension);
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
  ): Parser<Record<string, unknown>, unknown> {
    switch (extension) {
      case SupportedExtensionEnum.JSON:
        return new JsonParser();
      case SupportedExtensionEnum.PO:
        return new PoParser();
    }
  }

  /**
   * Parses the file content and returns the parsed data
   *
   * @param targetContent - The raw file content to parse (string or Buffer)
   * @returns The parsed data as a Record<string, unknown>
   */
  parse(targetContent: string | Buffer): Record<string, unknown> {
    return this.parser.parse(targetContent);
  }

  /**
   * Serializes the data back to the file format
   *
   * @param data - The data to serialize
   * @param formatting - Optional formatting options (only used for JSON files)
   * @returns The serialized content as string or Buffer
   */
  serialize(data: Record<string, unknown>, formatting?: JsonParserFormattingType): string | Buffer {
    return this.parser.serialize(data, formatting);
  }

  /**
   * Gets the file extension being used
   *
   * @returns The file extension
   */
  getExtension(): SupportedExtensionEnum {
    return this.extension;
  }

  /**
   * Gets the file path
   *
   * @returns The file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Gets the default fallback content for when a file doesn't exist.
   * Each parser type defines its own appropriate fallback.
   *
   * @returns The default fallback string for the file type
   */
  getDefaultFallback(): string {
    switch (this.extension) {
      case SupportedExtensionEnum.JSON:
        return '{}';
      case SupportedExtensionEnum.PO:
        return '';
    }
  }
}
