import { getFileExtension } from './path.js';
import { JsonParser } from './json.js';
import { PoParser } from './po.js';
import { Parser } from './parser.js';
import { SUPPORTED_FILE_TYPES } from '#modules/common/common.const.js';
import { JsonParserFormattingType, SupportedExtensionEnum } from '#modules/common/common.types.js';

export type FileConnectorOptions = {
  /**
   * The file extension. If not provided, it will be extracted from the filePath
   */
  extension?: SupportedExtensionEnum;

  /**
   * Formatting options for JSON files (indentation and trailing newline)
   */
  formatting?: JsonParserFormattingType;
};

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
export class FileConnector {
  private readonly filePath: string;
  private readonly extension: SupportedExtensionEnum;
  private readonly parser: Parser<Record<string, unknown>>;

  /**
   * Creates a new FileConnector instance.
   *
   * @param filePath - The path to the file to parse
   * @param options - Optional configuration options
   * @throws {Error} If the file extension is not supported
   */
  constructor(filePath: string, options?: FileConnectorOptions) {
    this.filePath = filePath;

    // Step 1: Determine the extension (calculate if not provided)
    if (options?.extension) {
      this.extension = options.extension;
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
   * @param formatting - Optional formatting options for JSON files
   * @returns The parser instance for the given extension
   */
  private getParserForExtension(
    extension: SupportedExtensionEnum
  ): Parser<Record<string, unknown>> {
    switch (extension) {
      case SupportedExtensionEnum.JSON: {
        return new JsonParser('/');
      }
      case SupportedExtensionEnum.PO:
        return new PoParser('utf-8', {});
      default:
        throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  /**
   * Parses the file content and returns the parsed data
   *
   * @returns The parsed data as a Record<string, unknown>
   */
  parse(targetContent: string): Record<string, unknown> {
    return this.parser.parse(targetContent);
  }

  /**
   * Parses the provided content using the appropriate parser
   *
   * @param content - The content to parse
   * @returns The parsed data as a Record<string, unknown>
   */
  parseContent(content: string | Buffer): Record<string, unknown> {
    return this.parser.parse(content);
  }

  /**
   * Serializes the data back to the file format
   *
   * @param data - The data to serialize
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
}
