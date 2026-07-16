import { XMLParser } from 'fast-xml-parser';
import type { Parser } from '../interface/parser.js';
import type { XcodeStringsdictParserOptionsType } from './parser.types.js';
import { PLURAL_FORMS, escapeXml, rootKey, weaveOrphans } from '../utils/parser.js';

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
export class XcodeStringsdictParser implements Parser<
  Record<string, unknown>,
  XcodeStringsdictParserOptionsType
> {
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
   */
  private extractDictEntries(dictArray: Record<string, unknown>[]): Array<[string, unknown]> {
    // Filter out #text whitespace nodes produced by fast-xml-parser preserveOrder mode
    const nodes = dictArray.filter((n) => !('#text' in n && Object.keys(n).length === 1));
    const entries: Array<[string, unknown]> = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      if ('key' in node) {
        const keyArr = node['key'] as Array<{ '#text': string }>;
        const keyText = keyArr?.[0]?.['#text'] ?? '';
        const valueNode = nodes[i + 1];
        if (valueNode) {
          entries.push([keyText, valueNode]);
          i++;
        }
      }
    }
    return entries;
  }

  /**
   * Extracts the dict array from a preserveOrder node, or returns null.
   */
  private getDictArray(node: unknown): Record<string, unknown>[] | null {
    if (typeof node !== 'object' || node === null || !('dict' in node)) return null;
    const arr = (node as Record<string, unknown>)['dict'];
    return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : null;
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
        return '';
      }
    }
    return '';
  }

  /**
   * Parses XML content and navigates to the root dict entries.
   * Returns null if the content is invalid or doesn't contain a proper plist structure.
   */
  private parseRootEntries(content: string): Array<[string, unknown]> | null {
    let parsed: unknown;
    try {
      parsed = this.parser.parse(content);
    } catch (error) {
      console.error('Failed to parse .stringsdict content', error);
      return null;
    }

    if (!Array.isArray(parsed)) return null;

    const plistNode = (parsed as Record<string, unknown>[]).find((n) => 'plist' in n);
    if (!plistNode) return null;

    const plistContent = (plistNode as Record<string, unknown>)['plist'];
    if (!Array.isArray(plistContent)) return null;

    const rootDictNode = (plistContent as Record<string, unknown>[]).find((n) => 'dict' in n);
    if (!rootDictNode) return null;

    const rootDictArray = (rootDictNode as Record<string, unknown>)['dict'];
    if (!Array.isArray(rootDictArray)) return null;

    return this.extractDictEntries(rootDictArray as Record<string, unknown>[]);
  }

  /**
   * Extracts plural variable dicts from an entry's dict entries.
   * Returns an array of [varName, varEntries] tuples.
   */
  private extractPluralVars(
    entryDictEntries: Array<[string, unknown]>
  ): Array<[string, Array<[string, unknown]>]> {
    const pluralVars: Array<[string, Array<[string, unknown]>]> = [];
    for (const [key, value] of entryDictEntries) {
      if (METADATA_KEYS.has(key)) continue;
      const varDictArray = this.getDictArray(value);
      if (varDictArray) {
        const varEntries = this.extractDictEntries(varDictArray);
        if (this.isPluralRuleDict(varEntries)) {
          pluralVars.push([key, varEntries]);
        }
      }
    }
    return pluralVars;
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

    const rootEntries = this.parseRootEntries(strContent);
    if (!rootEntries) return {};

    const translations: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of rootEntries) {
      const entryDictArray = this.getDictArray(entryValue);
      if (!entryDictArray) continue;

      const entryDictEntries = this.extractDictEntries(entryDictArray);
      const pluralVars = this.extractPluralVars(entryDictEntries);
      const isSingleVariable = pluralVars.length === 1;

      for (const [varName, varEntries] of pluralVars) {
        for (const [formKey, formValue] of varEntries) {
          if (METADATA_KEYS.has(formKey)) continue;
          if (!PLURAL_FORMS.has(formKey)) continue;

          const value = this.getStringValue(formValue);
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
    const targetStr = options.targetContent?.toString() ?? '';

    return this.rebuildPlist(baseContent, data, targetStr);
  }

  /**
   * Rebuilds the plist XML, updating only the translatable plural form values.
   *
   * `targetContent` (when provided) is the existing target file, used to preserve
   * "orphan" entries that live only in the target and not the source. Orphans are
   * rendered from their real target structure at their original position.
   */
  private rebuildPlist(
    originalContent: string,
    data: Record<string, unknown>,
    targetContent = ''
  ): string {
    const dataMap = new Map(Object.entries(data));

    // Precompute the set of root entry keys present in data for O(1) lookup
    const dataEntryKeys = new Set<string>();
    for (const key of dataMap.keys()) {
      dataEntryKeys.add(rootKey(key));
    }

    const rootEntries = this.parseRootEntries(originalContent);
    if (!rootEntries) return originalContent;
    const baseEntryKeys = new Set(rootEntries.map(([k]) => k));

    // Weave in "orphan" entries: present in the target file but absent from the
    // source, kept by the engine (so present in `data`). They are rendered from
    // their real target structure at their original position. Target entries
    // absent from `data` are source-deleted keys and are excluded by `dataEntryKeys`.
    const targetEntries = targetContent.trim() ? (this.parseRootEntries(targetContent) ?? []) : [];
    const entries = weaveOrphans(
      rootEntries,
      targetEntries,
      ([entryKey]) => entryKey,
      baseEntryKeys,
      dataEntryKeys
    );

    const indent = '    ';
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    );
    lines.push('<plist version="1.0">');
    lines.push('<dict>');

    // Source-deleted entries (in the source file but not in `data`) are skipped.
    for (const [entryKey, entryValue] of entries) {
      if (dataEntryKeys.has(entryKey)) {
        this.renderEntry(lines, indent, entryKey, entryValue, dataMap);
      }
    }

    lines.push('</dict>');
    lines.push('</plist>');

    return lines.join('\n') + '\n';
  }

  /**
   * Renders a single root entry (its plural dict) into the output lines, taking
   * translated plural-form values from `dataMap` and everything else (structure,
   * variable names, format keys) verbatim from the entry's parsed value.
   */
  private renderEntry(
    lines: string[],
    indent: string,
    entryKey: string,
    entryValue: unknown,
    dataMap: Map<string, unknown>
  ): void {
    lines.push(`${indent}<key>${escapeXml(entryKey)}</key>`);

    const entryDictArray = this.getDictArray(entryValue);
    if (!entryDictArray) return;

    const entryDictEntries = this.extractDictEntries(entryDictArray);

    lines.push(`${indent}<dict>`);

    // Extract plural vars once and cache for reuse
    const pluralVars = this.extractPluralVars(entryDictEntries);
    const isSingleVariable = pluralVars.length === 1;
    const pluralVarEntriesMap = new Map(pluralVars);

    for (const [key, value] of entryDictEntries) {
      if (key === 'NSStringLocalizedFormatKey') {
        lines.push(`${indent}${indent}<key>NSStringLocalizedFormatKey</key>`);
        lines.push(`${indent}${indent}<string>${escapeXml(this.getStringValue(value))}</string>`);
        continue;
      }

      const cachedVarEntries = pluralVarEntriesMap.get(key);
      if (!cachedVarEntries) continue;

      lines.push(`${indent}${indent}<key>${escapeXml(key)}</key>`);
      lines.push(`${indent}${indent}<dict>`);

      for (const [formKey, formValue] of cachedVarEntries) {
        lines.push(`${indent}${indent}${indent}<key>${escapeXml(formKey)}</key>`);

        if (METADATA_KEYS.has(formKey)) {
          lines.push(
            `${indent}${indent}${indent}<string>${escapeXml(this.getStringValue(formValue))}</string>`
          );
        } else if (PLURAL_FORMS.has(formKey)) {
          const flatKey = isSingleVariable
            ? `${entryKey}/${formKey}`
            : `${entryKey}/${key}/${formKey}`;
          const translatedValue = dataMap.has(flatKey)
            ? String(dataMap.get(flatKey) ?? '')
            : this.getStringValue(formValue);
          lines.push(`${indent}${indent}${indent}<string>${escapeXml(translatedValue)}</string>`);
        } else {
          lines.push(
            `${indent}${indent}${indent}<string>${escapeXml(this.getStringValue(formValue))}</string>`
          );
        }
      }

      lines.push(`${indent}${indent}</dict>`);
    }

    lines.push(`${indent}</dict>`);
  }

  /**
   * Returns the fallback content for an empty .stringsdict file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }

  getContentType(): string {
    return 'text/plain';
  }
}
