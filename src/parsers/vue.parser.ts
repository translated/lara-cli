import { flatten as flat, unflatten as unflat } from 'flat';
import type { Parser } from '../interface/parser.js';
import type { VueParserOptionsType } from './parser.types.js';
import { deepMerge, markNumericKeyObjects, restoreNumericKeys } from '#utils/parser.js';

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
  private delimiter = '\0';

  parse(content: string | Buffer, options?: VueParserOptionsType): Record<string, unknown> {
    const strContent = content.toString();
    const i18nContent = VueParser.extractI18nBlock(strContent);

    if (!i18nContent) {
      return {};
    }

    let messagesObj: Record<string, unknown>;
    try {
      messagesObj = JSON.parse(i18nContent);
    } catch (error) {
      console.error('Failed to parse i18n JSON content in Vue file', error);
      return {};
    }

    const marked = markNumericKeyObjects(messagesObj);
    const flattened = flat(marked, { delimiter: this.delimiter }) as Record<string, unknown>;

    if (options?.targetLocale) {
      const localePrefix = options.targetLocale + this.delimiter;
      const filtered: Record<string, unknown> = {};

      for (const key in flattened) {
        if (key === options.targetLocale) {
          filtered[key] = flattened[key];
        } else if (key.startsWith(localePrefix)) {
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
    const i18nContent = VueParser.extractI18nBlock(strContent);
    let messagesObj: Record<string, unknown> = {};

    if (i18nContent) {
      try {
        messagesObj = JSON.parse(i18nContent);
      } catch (error) {
        console.error('Failed to parse i18n JSON content in Vue file', error);
        // Fall back to an empty messages object to mirror parse() behavior
        messagesObj = {};
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

    const unflattenedData = restoreNumericKeys(
      unflat(dataToMerge, { delimiter: this.delimiter })
    ) as Record<string, unknown>;

    // If a locale is specified, replace that locale's content entirely (to handle key removal)
    // Otherwise, merge with existing messages
    if (locale && unflattenedData[locale] !== undefined) {
      messagesObj[locale] = unflattenedData[locale];
    } else {
      messagesObj = deepMerge(messagesObj, unflattenedData);
    }

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
  static hasI18nTag(content: string): boolean {
    return VueParser.extractI18nBlock(content) !== null;
  }

  /**
   * Checks if a position in the content is inside an HTML comment.
   *
   * @param content - The Vue SFC file content
   * @param position - The position to check
   * @returns True if the position is inside an HTML comment, false otherwise
   */
  private static isInsideComment(content: string, position: number): boolean {
    const commentRegex = /<!--[\s\S]*?-->/g;
    let commentMatch: RegExpExecArray | null;
    
    while ((commentMatch = commentRegex.exec(content)) !== null) {
      const commentStart = commentMatch.index;
      const commentEnd = commentMatch.index + commentMatch[0].length;
      
      if (position >= commentStart && position < commentEnd) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extracts the content between <i18n> and </i18n> tags.
   * Skips i18n tags that appear inside HTML comments.
   *
   * @param content - The Vue SFC file content
   * @returns The content inside the i18n block, or null if not found
   */
  private static extractI18nBlock(content: string): string | null {
    const i18nTagRegex = /<i18n(?:\s[^>]*)?>/gi;
    let match: RegExpExecArray | null;
    
    while ((match = i18nTagRegex.exec(content)) !== null) {

      if (match.index === undefined) {
        continue;
      }

      const matchPosition = match.index;
      
      if (VueParser.isInsideComment(content, matchPosition)) {
        continue;
      }

      const startIndex = matchPosition + match[0].length;
      const endTagRegex = /<\/i18n>/i;
      const endMatch = content.substring(startIndex).match(endTagRegex);
      if (!endMatch) continue;

      const endIndex = startIndex + endMatch.index!;
      const i18nContent = content.substring(startIndex, endIndex).trim();
      return i18nContent || null;
    }
    
    return null;
  }

  /**
   * Replaces the content inside the <i18n> block with new JSON content.
   * Skips i18n tags that appear inside HTML comments.
   *
   * @param content - The original Vue SFC file content
   * @param newJsonContent - The new JSON content to insert
   * @returns The updated Vue SFC content
   */
  private replaceI18nBlock(content: string, newJsonContent: string): string {
    const i18nTagRegex = /<i18n(?:\s[^>]*)?>/gi;
    let match: RegExpExecArray | null;
    let validMatch: RegExpExecArray | null = null;
    
    while ((match = i18nTagRegex.exec(content)) !== null) {
      const matchPosition = match.index!;
      
      if (VueParser.isInsideComment(content, matchPosition)) {
        continue;
      }
      
      const startIndex = matchPosition + match[0].length;
      const endTagRegex = /<\/i18n>/i;
      const endMatch = content.substring(startIndex).match(endTagRegex);
      
      if (endMatch) {
        validMatch = match;
        break;
      }
    }
    
    if (!validMatch) {
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

    const startIndex = validMatch.index! + validMatch[0].length;
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
}

