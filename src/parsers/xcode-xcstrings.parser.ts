import type { Parser } from '../interface/parser.js';
import type { XcodeXcstringsParserOptionsType } from './parser.types.js';
import { PLURAL_FORMS } from '../utils/parser.js';

/**
 * Represents a stringUnit in an .xcstrings file.
 */
interface StringUnit {
  state: string;
  value: string;
}

/**
 * Represents a localization entry which can be either a simple stringUnit
 * or contain plural variations.
 */
interface LocalizationEntry {
  stringUnit?: StringUnit;
  variations?: {
    plural?: Record<string, { stringUnit?: StringUnit }>;
  };
}

/**
 * Represents a single string entry in the xcstrings file.
 */
interface XcstringsStringEntry {
  shouldTranslate?: boolean;
  extractionState?: string;
  comment?: string;
  localizations?: Record<string, LocalizationEntry>;
}

/**
 * Represents the root structure of an .xcstrings file.
 */
interface XcstringsFile {
  sourceLanguage: string;
  version: string;
  strings: Record<string, XcstringsStringEntry>;
}

/**
 * Xcode .xcstrings parser for handling Xcode String Catalogs (Xcode 15+).
 *
 * This parser handles the JSON-based .xcstrings format where ALL locales are
 * stored in a single file. It follows the same multi-locale pattern as TS/Vue parsers,
 * filtering by `targetLocale` during parse and merging back during serialize.
 *
 * Flattening strategy:
 * - Simple strings: `"key"` -> `"value"`
 * - Plural variations: `"key/one"` -> `"%lld item"`, `"key/other"` -> `"%lld items"`
 *
 * @example
 * ```json
 * {
 *   "sourceLanguage": "en",
 *   "version": "1.0",
 *   "strings": {
 *     "app_name": {
 *       "localizations": {
 *         "en": { "stringUnit": { "state": "translated", "value": "My App" } }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class XcodeXcstringsParser implements Parser<
  Record<string, unknown>,
  XcodeXcstringsParserOptionsType
> {
  private readonly fallbackContent = JSON.stringify(
    { sourceLanguage: 'en', strings: {}, version: '1.0' },
    null,
    2
  );

  /**
   * Detects the indentation used in JSON content.
   */
  private detectIndentation(content: string): number {
    const match = content.match(/\n(\s+)"/);
    if (match && match[1]) {
      return match[1].length;
    }
    return 2;
  }

  /**
   * Parses .xcstrings JSON content into a flat key-value structure for a specific locale.
   *
   * @param content - The .xcstrings JSON content
   * @param options - Must include `targetLocale` to filter entries for that locale
   * @returns A flat record of translatable key-value pairs for the target locale
   */
  parse(
    content: string | Buffer,
    options?: XcodeXcstringsParserOptionsType
  ): Record<string, unknown> {
    const strContent = content.toString();
    if (!strContent.trim()) {
      return {};
    }

    let xcstrings: XcstringsFile;
    try {
      xcstrings = JSON.parse(strContent) as XcstringsFile;
    } catch (error) {
      console.error('Failed to parse .xcstrings content', error);
      return {};
    }

    if (!xcstrings.strings || typeof xcstrings.strings !== 'object') {
      return {};
    }

    const targetLocale = options?.targetLocale;
    if (!targetLocale) {
      // Without a target locale, return source language entries
      return this.extractLocaleEntries(xcstrings, xcstrings.sourceLanguage);
    }

    return this.extractLocaleEntries(xcstrings, targetLocale);
  }

  /**
   * Extracts flattened entries for a specific locale.
   */
  private extractLocaleEntries(xcstrings: XcstringsFile, locale: string): Record<string, unknown> {
    const translations: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(xcstrings.strings)) {
      // Skip non-translatable entries
      if (entry.shouldTranslate === false) {
        continue;
      }

      const localizations = entry.localizations;
      if (!localizations || !localizations[locale]) {
        continue;
      }

      const localization = localizations[locale]!;

      // Handle plural variations
      if (localization.variations?.plural) {
        for (const [form, formEntry] of Object.entries(localization.variations.plural)) {
          if (!PLURAL_FORMS.has(form)) continue;
          if (formEntry.stringUnit) {
            translations[`${key}/${form}`] = formEntry.stringUnit.value;
          }
        }
        continue;
      }

      // Handle simple stringUnit
      if (localization.stringUnit) {
        translations[key] = localization.stringUnit.value;
      }
    }

    return translations;
  }

  /**
   * Serializes a flat key-value object back into .xcstrings JSON format.
   *
   * Updates only the target locale's entries while preserving all other locales,
   * metadata, and file structure.
   *
   * @param data - A flat record of translated key-value pairs
   * @param options - Must include `targetLocale` and `originalContent`
   * @returns The serialized .xcstrings JSON content
   */
  serialize(
    data: Record<string, unknown>,
    options: XcodeXcstringsParserOptionsType
  ): string | Buffer {
    const { originalContent, targetLocale } = options;
    if (originalContent === undefined || originalContent === null) {
      throw new Error('Original content is required for Xcode .xcstrings serialization');
    }

    const strContent = originalContent.toString();
    const baseContent = strContent.trim().length > 0 ? strContent : this.getFallback();
    const indentation = this.detectIndentation(baseContent);

    let xcstrings: XcstringsFile;
    try {
      xcstrings = JSON.parse(baseContent) as XcstringsFile;
    } catch (error) {
      console.error('Failed to parse original .xcstrings content', error);
      return baseContent;
    }

    if (!xcstrings.strings) {
      xcstrings.strings = {};
    }

    // Group data keys: separate simple keys from plural keys (key/form)
    const simpleKeys = new Map<string, string>();
    const pluralKeys = new Map<string, Map<string, string>>();

    for (const [flatKey, value] of Object.entries(data)) {
      const lastSlash = flatKey.lastIndexOf('/');
      if (lastSlash >= 0) {
        const baseKey = flatKey.substring(0, lastSlash);
        const form = flatKey.substring(lastSlash + 1);
        if (PLURAL_FORMS.has(form)) {
          if (!pluralKeys.has(baseKey)) {
            pluralKeys.set(baseKey, new Map());
          }
          pluralKeys.get(baseKey)!.set(form, String(value ?? ''));
          continue;
        }
      }
      simpleKeys.set(flatKey, String(value ?? ''));
    }

    const ensureEntry = (key: string): XcstringsStringEntry => {
      if (!xcstrings.strings[key]) {
        xcstrings.strings[key] = { localizations: {} };
      }
      const entry = xcstrings.strings[key]!;
      if (!entry.localizations) {
        entry.localizations = {};
      }
      return entry;
    };

    // Update simple string entries
    for (const [key, value] of simpleKeys) {
      const entry = ensureEntry(key);
      entry.localizations![targetLocale] = {
        stringUnit: {
          state: 'translated',
          value: value,
        },
      };
    }

    // Update plural string entries
    for (const [key, forms] of pluralKeys) {
      const entry = ensureEntry(key);

      const pluralVariations: Record<string, { stringUnit: StringUnit }> = {};
      for (const [form, value] of forms) {
        pluralVariations[form] = {
          stringUnit: {
            state: 'translated',
            value: value,
          },
        };
      }

      entry.localizations![targetLocale] = {
        variations: {
          plural: pluralVariations,
        },
      };
    }

    // Remove keys from target locale that are not in data
    // (handles deleted keys)
    const allDataKeys = new Set([...simpleKeys.keys(), ...pluralKeys.keys()]);
    for (const [key, entry] of Object.entries(xcstrings.strings)) {
      if (entry.shouldTranslate === false) continue;
      if (!entry.localizations?.[targetLocale]) continue;

      if (!allDataKeys.has(key)) {
        delete entry.localizations[targetLocale];
      }
    }

    const trailingNewline = baseContent.endsWith('\n') ? '\n' : '';
    return JSON.stringify(xcstrings, null, indentation) + trailingNewline;
  }

  /**
   * Returns the fallback content for an empty .xcstrings file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }
}
