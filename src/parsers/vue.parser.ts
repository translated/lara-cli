import { flatten as flat, unflatten as unflat } from 'flat';
import type { Parser } from '../interface/parser.js';
import type { VueParserOptionsType } from './parser.types.js';

/**
 * Vue Single File Component parser that extracts and manages i18n blocks.
 *
 * This parser extracts the JSON content from `<i18n>` blocks in Vue SFC files,
 * flattens it for translation, and can serialize it back while preserving the
 * Vue SFC structure.
 *
 * @example
 * ```vue
 * <i18n>
 * {
 *   "en": {
 *     "hello": "Hello World"
 *   }
 * }
 * </i18n>
 * ```
 */
export class VueParser implements Parser<Record<string, unknown>, VueParserOptionsType> {
  private readonly fallbackContent = '<i18n>\n{}\n</i18n>';
  private delimiter = '/';

  parse(content: string | Buffer, options?: VueParserOptionsType): Record<string, unknown> {
    const strContent = content.toString();
    const i18nContent = this.extractI18nBlock(strContent);

    if (!i18nContent) {
      return {};
    }

    // Parse the JSON content from the i18n block
    let messagesObj: Record<string, unknown>;
    try {
      messagesObj = JSON.parse(i18nContent);
    } catch (e) {
      console.error('Failed to parse i18n JSON content in Vue file', e);
      return {};
    }

    // Flatten the whole object
    const flattened = flat(messagesObj, { delimiter: this.delimiter }) as Record<string, unknown>;

    // If a specific locale is requested, filter and unprefix
    if (options?.targetLocale) {
      const localePrefix = options.targetLocale + this.delimiter;
      const filtered: Record<string, unknown> = {};

      for (const key in flattened) {
        if (key === options.targetLocale) {
          // Exact match (unlikely for locale root but possible)
          filtered[key] = flattened[key];
        } else if (key.startsWith(localePrefix)) {
          // Remove the locale prefix to make it relative to the locale
          const relativeKey = key.substring(localePrefix.length);
          filtered[relativeKey] = flattened[key];
        }
      }
      return filtered;
    }

    return flattened;
  }

  serialize(data: Record<string, unknown>, options: VueParserOptionsType): string | Buffer {
    const { originalContent } = options;
    if (!originalContent) {
      throw new Error('Original content is required for Vue serialization');
    }
    const strContent = originalContent.toString();
    const i18nContent = this.extractI18nBlock(strContent);
    let messagesObj: Record<string, unknown> = {};

    // Parse existing i18n content if it exists
    if (i18nContent) {
      try {
        messagesObj = JSON.parse(i18nContent);
      } catch (e) {
        console.error('Failed to parse existing i18n JSON content', e);
      }
    }

    // If options.locale is set, prefix keys back
    let dataToMerge = data;
    const locale = options?.targetLocale;

    if (locale) {
      const prefixed: Record<string, unknown> = {};
      for (const key in data) {
        prefixed[`${locale}${this.delimiter}${key}`] = data[key];
      }
      dataToMerge = prefixed;
    }

    const unflattenedData = unflat(dataToMerge, { delimiter: this.delimiter });

    // Merge with existing messages
    messagesObj = this.deepMerge(messagesObj, unflattenedData as Record<string, unknown>);

    // Serialize the object back to JSON string
    const serializedObj = JSON.stringify(messagesObj, null, 2);

    // Replace the i18n block in the original content
    return this.replaceI18nBlock(strContent, serializedObj);
  }

  getFallback(): string {
    return this.fallbackContent;
  }

  /**
   * Checks if a Vue file contains an i18n tag.
   *
   * @param content - The Vue SFC file content
   * @returns True if the file contains an i18n tag, false otherwise
   */
  hasI18nTag(content: string): boolean {
    return this.extractI18nBlock(content) !== null;
  }

  /**
   * Extracts the content between <i18n> and </i18n> tags.
   *
   * @param content - The Vue SFC file content
   * @returns The content inside the i18n block, or null if not found
   */
  private extractI18nBlock(content: string): string | null {
    const i18nTagRegex = /<i18n(?:\s[^>]*)?>/i;
    const match = content.match(i18nTagRegex);
    if (!match) return null;

    const startIndex = match.index! + match[0].length;
    const endTagRegex = /<\/i18n>/i;
    const endMatch = content.substring(startIndex).match(endTagRegex);
    if (!endMatch) return null;

    const endIndex = startIndex + endMatch.index!;
    const i18nContent = content.substring(startIndex, endIndex).trim();
    return i18nContent || null;
  }

  /**
   * Replaces the content inside the <i18n> block with new JSON content.
   *
   * @param content - The original Vue SFC file content
   * @param newJsonContent - The new JSON content to insert
   * @returns The updated Vue SFC content
   */
  private replaceI18nBlock(content: string, newJsonContent: string): string {
    const i18nTagRegex = /<i18n(?:\s[^>]*)?>/i;
    const match = content.match(i18nTagRegex);
    if (!match) {
      // If no i18n block exists, add one before </template> or at the end
      const templateEndMatch = content.match(/<\/template>/i);
      if (templateEndMatch) {
        const insertIndex = templateEndMatch.index! + templateEndMatch[0].length;
        return (
          content.substring(0, insertIndex) +
          '\n\n<i18n>\n' +
          newJsonContent +
          '\n</i18n>\n' +
          content.substring(insertIndex)
        );
      }
      // If no template tag, append at the end
      return content + '\n\n<i18n>\n' + newJsonContent + '\n</i18n>\n';
    }

    const startIndex = match.index! + match[0].length;
    const endTagRegex = /<\/i18n>/i;
    const endMatch = content.substring(startIndex).match(endTagRegex);
    if (!endMatch) {
      // If opening tag exists but no closing tag, add closing tag
      return content.substring(0, startIndex) + '\n' + newJsonContent + '\n</i18n>\n';
    }

    const endIndex = startIndex + endMatch.index!;
    return (
      content.substring(0, startIndex) +
      '\n' +
      newJsonContent +
      '\n' +
      content.substring(endIndex)
    );
  }

  /**
   * Deep merges two objects, combining nested properties.
   *
   * @param target - The target object to merge into
   * @param source - The source object to merge from
   * @returns The merged object
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return source;

    const output = { ...target };
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (key in target && typeof target[key] === 'object' && typeof source[key] === 'object') {
          output[key] = this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          output[key] = source[key];
        }
      }
    }
    return output;
  }
}

