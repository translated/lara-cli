import type { Parser } from '../interface/parser.js';
import type { XcodeStringsParserOptionsType } from './parser.types.js';

const KV_PATTERN = /^"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/;
const HEX_4_PATTERN = /^[0-9a-fA-F]{4}$/;

/**
 * Represents a parsed entry from a .strings file, preserving its comment and order.
 */
interface StringsEntry {
  key: string;
  value: string;
  comment?: string;
}

/**
 * Xcode .strings parser for handling Apple localization string files.
 *
 * This parser handles the standard .strings format used in iOS/macOS applications,
 * organized by locale in `.lproj` directories (e.g., `en.lproj/Localizable.strings`).
 *
 * @example
 * ```
 * /* App Name *\/
 * "app_name" = "My App";
 *
 * /* Greeting *\/
 * "hello" = "Hello World";
 * ```
 */
export class XcodeStringsParser
  implements Parser<Record<string, unknown>, XcodeStringsParserOptionsType>
{
  private readonly fallbackContent = '';

  /**
   * Unescapes a .strings file value, converting escape sequences to their actual characters.
   */
  private unescapeValue(value: string): string {
    let result = '';
    let i = 0;
    while (i < value.length) {
      if (value[i] === '\\' && i + 1 < value.length) {
        const next = value[i + 1];
        switch (next) {
          case 'n':
            result += '\n';
            i += 2;
            break;
          case 't':
            result += '\t';
            i += 2;
            break;
          case 'r':
            result += '\r';
            i += 2;
            break;
          case '\\':
            result += '\\';
            i += 2;
            break;
          case '"':
            result += '"';
            i += 2;
            break;
          case 'U':
          case 'u': {
            // Unicode escape: \Uxxxx or \uxxxx (4 hex digits)
            const hex = value.substring(i + 2, i + 6);
            if (hex.length === 4 && HEX_4_PATTERN.test(hex)) {
              result += String.fromCharCode(parseInt(hex, 16));
              i += 6;
            } else {
              result += value[i];
              i++;
            }
            break;
          }
          default:
            result += value[i];
            i++;
            break;
        }
      } else {
        result += value[i]!;
        i++;
      }
    }
    return result;
  }

  /**
   * Escapes a string value for use in a .strings file.
   */
  private escapeValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r');
  }

  /**
   * Parses the entries from .strings content, preserving comments and order.
   */
  private parseEntries(content: string): StringsEntry[] {
    const entries: StringsEntry[] = [];
    const lines = content.split('\n');
    let currentComment: string | undefined;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Skip empty lines
      if (trimmed === '') {
        i++;
        continue;
      }

      // Capture block comments (/* ... */)
      if (trimmed.startsWith('/*')) {
        const commentLines = [line];
        while (!commentLines[commentLines.length - 1]!.includes('*/') && i + 1 < lines.length) {
          i++;
          commentLines.push(lines[i]!);
        }
        currentComment = commentLines.join('\n');
        i++;
        continue;
      }

      // Skip single-line comments (//)
      if (trimmed.startsWith('//')) {
        currentComment = line;
        i++;
        continue;
      }

      // Match key-value pairs: "key" = "value";
      const kvMatch = trimmed.match(KV_PATTERN);
      if (kvMatch && kvMatch[1] !== undefined && kvMatch[2] !== undefined) {
        entries.push({
          key: this.unescapeValue(kvMatch[1]),
          value: this.unescapeValue(kvMatch[2]),
          comment: currentComment,
        });
        currentComment = undefined;
      }

      i++;
    }

    return entries;
  }

  /**
   * Parses Xcode .strings content into a flat key-value structure.
   *
   * @param content - The .strings file content
   * @returns A record mapping string keys to their values
   */
  parse(content: string | Buffer): Record<string, unknown> {
    const strContent = content.toString();
    if (!strContent.trim()) {
      return {};
    }

    const entries = this.parseEntries(strContent);
    const translations: Record<string, unknown> = {};

    for (const entry of entries) {
      translations[entry.key] = entry.value;
    }

    return translations;
  }

  /**
   * Serializes a flat key-value object back into .strings format.
   *
   * @param data - A record mapping keys to translated values
   * @param options - Serialization options including originalContent
   * @returns The serialized .strings content
   */
  serialize(
    data: Record<string, unknown>,
    options: XcodeStringsParserOptionsType
  ): string | Buffer {
    const { originalContent } = options;
    if (originalContent === undefined || originalContent === null) {
      throw new Error('Original content is required for Xcode .strings serialization');
    }

    const strContent = originalContent.toString();
    const originalEntries = this.parseEntries(strContent);

    // Build a set of keys from data for quick lookup
    const dataKeys = new Set(Object.keys(data));

    // Build output preserving original order and comments
    const lines: string[] = [];

    for (const entry of originalEntries) {
      // Skip keys that are not in the translated data (deleted)
      if (!dataKeys.has(entry.key)) {
        continue;
      }

      // Add the comment if present
      if (entry.comment) {
        lines.push(entry.comment);
      }

      const value = data[entry.key];
      const escapedKey = this.escapeValue(entry.key);
      const escapedValue = this.escapeValue(String(value ?? ''));
      lines.push(`"${escapedKey}" = "${escapedValue}";`);
      lines.push('');

      dataKeys.delete(entry.key);
    }

    // Append any new keys that weren't in the original
    for (const key of dataKeys) {
      const value = data[key];
      const escapedKey = this.escapeValue(key);
      const escapedValue = this.escapeValue(String(value ?? ''));
      lines.push(`"${escapedKey}" = "${escapedValue}";`);
      lines.push('');
    }

    // Remove trailing empty line if present, then add one back
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    const result = lines.join('\n');
    return result ? result + '\n' : '';
  }

  /**
   * Returns the fallback content for an empty .strings file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }
}
