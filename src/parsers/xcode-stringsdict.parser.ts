import { XMLParser } from 'fast-xml-parser';
import type { Parser } from '../interface/parser.js';
import type { XcodeStringsdictParserOptionsType } from './parser.types.js';

const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const METADATA_KEYS = new Set([
  'NSStringLocalizedFormatKey',
  'NSStringFormatSpecTypeKey',
  'NSStringFormatValueTypeKey',
]);

/**
 * Xcode .stringsdict parser for handling Apple plural localization files.
 *
 * This parser handles the .stringsdict XML plist format used for plural rules in iOS/macOS,
 * organized by locale in `.lproj` directories (e.g., `en.lproj/Localizable.stringsdict`).
 *
 * Flattening strategy:
 * - Single-variable: `item_count/one`, `item_count/other`
 * - Multi-variable: `transfer/files/one`, `transfer/folders/one`
 *
 * @example
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
 * <plist version="1.0">
 * <dict>
 *   <key>item_count</key>
 *   <dict>
 *     <key>NSStringLocalizedFormatKey</key>
 *     <string>%#@items@</string>
 *     <key>items</key>
 *     <dict>
 *       <key>NSStringFormatSpecTypeKey</key>
 *       <string>NSStringPluralRuleType</string>
 *       <key>NSStringFormatValueTypeKey</key>
 *       <string>d</string>
 *       <key>one</key>
 *       <string>%d item</string>
 *       <key>other</key>
 *       <string>%d items</string>
 *     </dict>
 *   </dict>
 * </dict>
 * </plist>
 * ```
 */
export class XcodeStringsdictParser
  implements Parser<Record<string, unknown>, XcodeStringsdictParserOptionsType>
{
  private readonly fallbackContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`;

  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      preserveOrder: true,
      parseAttributeValue: false,
      trimValues: false,
    });
  }

  /**
   * Extracts key-value pairs from a plist `<dict>` represented as a preserveOrder array.
   * Returns an array of [key, value] tuples.
   */
  private extractDictEntries(
    dictArray: Record<string, unknown>[]
  ): Array<[string, unknown]> {
    // Filter out #text whitespace nodes produced by fast-xml-parser preserveOrder mode
    const nodes = dictArray.filter(
      (n) => !('#text' in n && Object.keys(n).length === 1)
    );
    const entries: Array<[string, unknown]> = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      if ('key' in node) {
        const keyArr = node['key'] as Array<{ '#text': string }>;
        const keyText = keyArr?.[0]?.['#text'] ?? '';
        // The value is the next node
        const valueNode = nodes[i + 1];
        if (valueNode) {
          entries.push([keyText, valueNode]);
          i++; // skip the value node
        }
      }
    }
    return entries;
  }

  /**
   * Checks if a dict is a plural rule dict by looking for NSStringFormatSpecTypeKey.
   */
  private isPluralRuleDict(entries: Array<[string, unknown]>): boolean {
    return entries.some(
      ([key, value]) =>
        key === 'NSStringFormatSpecTypeKey' &&
        this.getStringValue(value) === 'NSStringPluralRuleType'
    );
  }

  /**
   * Extracts the string value from a preserveOrder string node.
   */
  private getStringValue(node: unknown): string {
    if (typeof node === 'object' && node !== null && 'string' in node) {
      const strArr = (node as Record<string, unknown>)['string'];
      if (Array.isArray(strArr) && strArr.length > 0) {
        const first = strArr[0];
        if (typeof first === 'object' && first !== null && '#text' in first) {
          return String((first as Record<string, unknown>)['#text'] ?? '');
        }
        // Empty string element
        return '';
      }
    }
    return '';
  }

  /**
   * Parses Xcode .stringsdict content into a flat key-value structure.
   *
   * @param content - The .stringsdict plist XML content
   * @returns A flat record with keys like `item_count/one` or `transfer/files/one`
   */
  parse(content: string | Buffer): Record<string, unknown> {
    const strContent = content.toString();
    if (!strContent.trim()) {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = this.parser.parse(strContent);
    } catch (error) {
      console.error('Failed to parse .stringsdict content', error);
      return {};
    }

    if (!Array.isArray(parsed)) {
      return {};
    }

    // Navigate: root array -> find plist -> find dict
    const plistNode = (parsed as Record<string, unknown>[]).find((n) => 'plist' in n);
    if (!plistNode) {
      return {};
    }

    const plistContent = (plistNode as Record<string, unknown>)['plist'];
    if (!Array.isArray(plistContent)) {
      return {};
    }

    const rootDictNode = (plistContent as Record<string, unknown>[]).find((n) => 'dict' in n);
    if (!rootDictNode) {
      return {};
    }

    const rootDictArray = (rootDictNode as Record<string, unknown>)['dict'];
    if (!Array.isArray(rootDictArray)) {
      return {};
    }

    const rootEntries = this.extractDictEntries(rootDictArray as Record<string, unknown>[]);

    const translations: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of rootEntries) {
      // entryValue should be a dict node
      if (typeof entryValue !== 'object' || entryValue === null || !('dict' in entryValue)) {
        continue;
      }

      const entryDictArray = (entryValue as Record<string, unknown>)['dict'];
      if (!Array.isArray(entryDictArray)) {
        continue;
      }

      const entryDictEntries = this.extractDictEntries(
        entryDictArray as Record<string, unknown>[]
      );

      // Find plural variable dicts (skip metadata keys)
      const pluralVars: Array<[string, Array<[string, unknown]>]> = [];
      for (const [key, value] of entryDictEntries) {
        if (METADATA_KEYS.has(key)) continue;

        if (typeof value === 'object' && value !== null && 'dict' in value) {
          const varDictArray = (value as Record<string, unknown>)['dict'];
          if (Array.isArray(varDictArray)) {
            const varEntries = this.extractDictEntries(
              varDictArray as Record<string, unknown>[]
            );
            if (this.isPluralRuleDict(varEntries)) {
              pluralVars.push([key, varEntries]);
            }
          }
        }
      }

      const isSingleVariable = pluralVars.length === 1;

      for (const [varName, varEntries] of pluralVars) {
        for (const [formKey, formValue] of varEntries) {
          if (METADATA_KEYS.has(formKey)) continue;
          if (!PLURAL_FORMS.includes(formKey)) continue;

          const value = this.getStringValue(formValue);
          // Single-variable: item_count/one, Multi-variable: transfer/files/one
          const flatKey = isSingleVariable
            ? `${entryKey}/${formKey}`
            : `${entryKey}/${varName}/${formKey}`;
          translations[flatKey] = value;
        }
      }
    }

    return translations;
  }

  /**
   * Serializes a flat key-value object back into .stringsdict plist format.
   *
   * @param data - A flat record with keys like `item_count/one`
   * @param options - Serialization options including originalContent
   * @returns The serialized .stringsdict plist XML content
   */
  serialize(
    data: Record<string, unknown>,
    options: XcodeStringsdictParserOptionsType
  ): string | Buffer {
    const { originalContent } = options;
    if (originalContent === undefined || originalContent === null) {
      throw new Error('Original content is required for Xcode .stringsdict serialization');
    }

    const strContent = originalContent.toString();
    const baseContent = strContent.trim().length === 0 ? this.getFallback() : strContent;

    return this.rebuildPlist(baseContent, data);
  }

  /**
   * Rebuilds the plist XML, updating only the translatable plural form values.
   */
  private rebuildPlist(originalContent: string, data: Record<string, unknown>): string {
    // Build a lookup: flat key -> translated value
    const dataMap = new Map(Object.entries(data));

    // Precompute the set of root entry keys present in data for O(1) lookup
    const dataEntryKeys = new Set<string>();
    for (const key of dataMap.keys()) {
      const slashIndex = key.indexOf('/');
      dataEntryKeys.add(slashIndex >= 0 ? key.substring(0, slashIndex) : key);
    }

    // Parse the original to understand structure
    let parsed: unknown;
    try {
      parsed = this.parser.parse(originalContent);
    } catch {
      return originalContent;
    }

    if (!Array.isArray(parsed)) return originalContent;

    const plistNode = (parsed as Record<string, unknown>[]).find((n) => 'plist' in n);
    if (!plistNode) return originalContent;

    const plistContent = (plistNode as Record<string, unknown>)['plist'];
    if (!Array.isArray(plistContent)) return originalContent;

    const rootDictNode = (plistContent as Record<string, unknown>[]).find((n) => 'dict' in n);
    if (!rootDictNode) return originalContent;

    const rootDictArray = (rootDictNode as Record<string, unknown>)['dict'];
    if (!Array.isArray(rootDictArray)) return originalContent;

    const rootEntries = this.extractDictEntries(rootDictArray as Record<string, unknown>[]);

    const indent = '    ';
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    );
    lines.push('<plist version="1.0">');
    lines.push('<dict>');

    for (const [entryKey, entryValue] of rootEntries) {
      if (!dataEntryKeys.has(entryKey)) continue;

      lines.push(`${indent}<key>${this.escapeXml(entryKey)}</key>`);

      if (typeof entryValue !== 'object' || entryValue === null || !('dict' in entryValue)) {
        continue;
      }

      const entryDictArray = (entryValue as Record<string, unknown>)['dict'];
      if (!Array.isArray(entryDictArray)) continue;

      const entryDictEntries = this.extractDictEntries(
        entryDictArray as Record<string, unknown>[]
      );

      lines.push(`${indent}<dict>`);

      // Count plural variable dicts to determine single vs multi-variable
      const pluralVarNames: string[] = [];
      for (const [key, value] of entryDictEntries) {
        if (METADATA_KEYS.has(key)) continue;
        if (typeof value === 'object' && value !== null && 'dict' in value) {
          const varDictArray = (value as Record<string, unknown>)['dict'];
          if (Array.isArray(varDictArray)) {
            const varEntries = this.extractDictEntries(
              varDictArray as Record<string, unknown>[]
            );
            if (this.isPluralRuleDict(varEntries)) {
              pluralVarNames.push(key);
            }
          }
        }
      }
      const isSingleVariable = pluralVarNames.length === 1;

      for (const [key, value] of entryDictEntries) {
        if (key === 'NSStringLocalizedFormatKey') {
          lines.push(`${indent}${indent}<key>NSStringLocalizedFormatKey</key>`);
          lines.push(
            `${indent}${indent}<string>${this.escapeXml(this.getStringValue(value))}</string>`
          );
          continue;
        }

        if (typeof value === 'object' && value !== null && 'dict' in value) {
          const varDictArray = (value as Record<string, unknown>)['dict'];
          if (!Array.isArray(varDictArray)) continue;

          const varEntries = this.extractDictEntries(
            varDictArray as Record<string, unknown>[]
          );

          if (!this.isPluralRuleDict(varEntries)) continue;

          lines.push(`${indent}${indent}<key>${this.escapeXml(key)}</key>`);
          lines.push(`${indent}${indent}<dict>`);

          for (const [formKey, formValue] of varEntries) {
            lines.push(`${indent}${indent}${indent}<key>${this.escapeXml(formKey)}</key>`);

            if (METADATA_KEYS.has(formKey)) {
              // Preserve metadata values unchanged
              lines.push(
                `${indent}${indent}${indent}<string>${this.escapeXml(this.getStringValue(formValue))}</string>`
              );
            } else if (PLURAL_FORMS.includes(formKey)) {
              // Look up translated value
              const flatKey = isSingleVariable
                ? `${entryKey}/${formKey}`
                : `${entryKey}/${key}/${formKey}`;
              const translatedValue = dataMap.has(flatKey)
                ? String(dataMap.get(flatKey) ?? '')
                : this.getStringValue(formValue);
              lines.push(
                `${indent}${indent}${indent}<string>${this.escapeXml(translatedValue)}</string>`
              );
            } else {
              // Other keys - preserve as-is
              lines.push(
                `${indent}${indent}${indent}<string>${this.escapeXml(this.getStringValue(formValue))}</string>`
              );
            }
          }

          lines.push(`${indent}${indent}</dict>`);
        }
      }

      lines.push(`${indent}</dict>`);
    }

    lines.push('</dict>');
    lines.push('</plist>');

    return lines.join('\n') + '\n';
  }

  /**
   * Escapes XML special characters.
   */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Returns the fallback content for an empty .stringsdict file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }
}
