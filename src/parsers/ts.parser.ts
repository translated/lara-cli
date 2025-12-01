import { flatten as flat, unflatten as unflat } from 'flat';
import type { Parser } from '../interface/parser.js';
import type { TsParserOptionsType } from './parser.types.js';
import { deepMerge } from '#utils/parser.js';

export class TsParser implements Parser<Record<string, unknown>, TsParserOptionsType> {
  private readonly fallbackContent = 'const messages = {};\n\nexport default messages;';
  private delimiter = '/';

  parse(content: string | Buffer, options?: TsParserOptionsType): Record<string, unknown> {
    const strContent = content.toString();
    const messagesObj = this.extractMessagesObject(strContent);

    if (!messagesObj) {
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

  serialize(data: Record<string, unknown>, options: TsParserOptionsType): string | Buffer {
    const { originalContent } = options;
    if (!originalContent) {
      throw new Error('Original content is required for TS serialization');
    }
    const strContent = originalContent.toString();
    let messagesObj = this.extractMessagesObject(strContent) || {};

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
    messagesObj = deepMerge(messagesObj, unflattenedData as Record<string, unknown>);

    // Serialize the object back to string
    const serializedObj = JSON.stringify(messagesObj, null, 4);

    // Replace in original content
    return this.replaceMessagesObject(strContent, serializedObj);
  }

  getFallback(): string {
    return this.fallbackContent;
  }

  private extractMessagesObject(content: string): Record<string, unknown> | null {
    const match = content.match(/const\s+messages\s*=\s*/);
    if (!match) return null;

    const startIndex = match.index! + match[0].length;
    let braceCount = 0;
    let foundStart = false;
    let endIndex = -1;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
        foundStart = true;
      } else if (char === '}') {
        braceCount--;
      }

      if (foundStart && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex === -1) return null;

    const objStr = content.substring(startIndex, endIndex);
    try {
      // Use Function to evaluate the object string
      const fn = new Function(`return ${objStr}`);
      return fn() as Record<string, unknown>;
    } catch (e) {
      console.error('Failed to parse messages object in TS file', e);
      return null;
    }
  }

  private replaceMessagesObject(content: string, newObjStr: string): string {
    const match = content.match(/const\s+messages\s*=\s*/);
    if (!match) return content;

    const startIndex = match.index! + match[0].length;
    let braceCount = 0;
    let foundStart = false;
    let endIndex = -1;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
        foundStart = true;
      } else if (char === '}') {
        braceCount--;
      }

      if (foundStart && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex === -1) return content;

    return content.substring(0, startIndex) + newObjStr + content.substring(endIndex);
  }
}
