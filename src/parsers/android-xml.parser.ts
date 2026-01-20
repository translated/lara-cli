import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { Parser } from '../interface/parser.js';
import type { AndroidXmlParserOptionsType } from './parser.types.js';

/**
 * Android XML parser for handling Android string resource files.
 *
 * This parser extracts string resources from Android XML files (typically located
 * in res/values/strings.xml) and handles both simple strings and plural forms.
 *
 * @example
 * ```xml
 * <resources>
 *   <string name="app_name">My App</string>
 *   <string name="hello">Hello World</string>
 *   <plurals name="item_count">
 *     <item quantity="one">%d item</item>
 *     <item quantity="other">%d items</item>
 *   </plurals>
 * </resources>
 * ```
 */
export class AndroidXmlParser implements Parser<Record<string, unknown>, AndroidXmlParserOptionsType> {
  private readonly fallbackContent = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>';
  private readonly parser: XMLParser;
  private readonly builder: XMLBuilder;
  private orderMap: Map<string, number> = new Map();

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      preserveOrder: false,
      parseAttributeValue: false,
      trimValues: false,
    });

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      preserveOrder: false,
      format: true,
      indentBy: '    ',
      suppressEmptyNode: false,
    });
  }

  /**
   * Parses Android XML string resources into a flat key-value structure.
   *
   * Simple strings are mapped as: "string_name" -> "value"
   * Plural forms are mapped as: "plural_name/quantity_one" -> "value"
   *
   * @param content - The XML content as string or Buffer
   * @param options - Optional parsing options (unused in Android XML parser)
   * @returns A record mapping resource keys to their values
   */
  parse(content: string | Buffer): Record<string, unknown> {
    const strContent = content.toString();
    this.orderMap = this.buildOrderMap(strContent);

    let parsed: any;
    try {
      parsed = this.parser.parse(strContent);
    } catch (error) {
      console.error('Failed to parse Android XML content', error);
      return {};
    }

    if (!parsed.resources) {
      return {};
    }

    const translations: Record<string, unknown> = {};
    const resources = parsed.resources;

    // Process string resources
    if (resources.string) {
      const strings = Array.isArray(resources.string) ? resources.string : [resources.string];
      for (const str of strings) {
        const name = str['@_name'];
        if (!name) continue;
        // Skip non-translatable strings
        if (str['@_translatable'] === 'false') continue;

        const value = str['#text'] || '';
        translations[name] = value;
      }
    }

    // Process plural resources
    if (resources.plurals) {
      const plurals = Array.isArray(resources.plurals) ? resources.plurals : [resources.plurals];
      for (const plural of plurals) {
        const name = plural['@_name'];
        if (!name) continue;

        const items = Array.isArray(plural.item) ? plural.item : [plural.item];
        for (const item of items) {
          const quantity = item['@_quantity'];
          if (!quantity) continue;
          const value = item['#text'] || '';
          const key = `${name}/${quantity}`;
          translations[key] = value;
        }
      }
    }

    return translations;
  }

  /**
   * Builds an order map to preserve the original order of resources in the XML file.
   *
   * @param content - The original XML content
   * @returns A map of resource identifiers to their order index
   */
  private buildOrderMap(content: string): Map<string, number> {
    const map = new Map<string, number>();
    let orderIndex = 0;

    // Match <string name="..."> and <plurals name="...">
    const stringRegex = /<string\s+name=["']([^"']+)["'][^>]*>/g;
    const pluralsRegex = /<plurals\s+name=["']([^"']+)["'][^>]*>/g;

    let match: RegExpExecArray | null;

    // Process strings
    while ((match = stringRegex.exec(content)) !== null) {
      const name = match[1];
      if (name && !map.has(`string:${name}`)) {
        map.set(`string:${name}`, orderIndex++);
      }
    }

    // Process plurals
    while ((match = pluralsRegex.exec(content)) !== null) {
      const name = match[1];
      if (name && !map.has(`plurals:${name}`)) {
        map.set(`plurals:${name}`, orderIndex++);
      }
    }

    return map;
  }

  /**
   * Serializes a flat key-value translation object back into Android XML format.
   *
   * @param data - A record mapping resource keys to their translated values
   * @param options - Serialization options including originalContent
   * @returns The serialized XML content as string
   */
  serialize(data: Record<string, unknown>, options: AndroidXmlParserOptionsType): string | Buffer {
    const { originalContent } = options;
    if (!originalContent) {
      throw new Error('Original content is required for Android XML serialization');
    }

    const strContent = originalContent.toString();
    this.orderMap = this.buildOrderMap(strContent);

    let parsed: any;
    try {
      parsed = this.parser.parse(strContent);
    } catch (error) {
      console.error('Failed to parse original Android XML content', error);
      return strContent;
    }

    if (!parsed.resources) {
      parsed.resources = {};
    }

    const resources = parsed.resources;

    // Update string resources
    if (resources.string) {
      const strings = Array.isArray(resources.string) ? resources.string : [resources.string];
      for (const str of strings) {
        const name = str['@_name'];
        if (!name) continue;
        // Skip non-translatable strings
        if (str['@_translatable'] === 'false') continue;

        if (data[name] !== undefined) {
          str['#text'] = String(data[name] || '');
        }
      }
    }

    // Update plural resources
    if (resources.plurals) {
      const plurals = Array.isArray(resources.plurals) ? resources.plurals : [resources.plurals];
      for (const plural of plurals) {
        const name = plural['@_name'];
        if (!name) continue;

        const items = Array.isArray(plural.item) ? plural.item : [plural.item];
        for (const item of items) {
          const quantity = item['@_quantity'];
          if (!quantity) continue;
          const key = `${name}/${quantity}`;
          if (data[key] !== undefined) {
            item['#text'] = String(data[key] || '');
          }
        }
      }
    }

    // Sort resources by order
    type ResourceEntry = {
      type: 'string' | 'plurals';
      resource: any;
      order: number;
    };
    const resourceEntries: ResourceEntry[] = [];

    if (resources.string) {
      const strings = Array.isArray(resources.string) ? resources.string : [resources.string];
      for (const str of strings) {
        const name = str['@_name'];
        if (name) {
          const order = this.orderMap.get(`string:${name}`) ?? Number.MAX_SAFE_INTEGER;
          resourceEntries.push({ type: 'string', resource: str, order });
        }
      }
    }

    if (resources.plurals) {
      const plurals = Array.isArray(resources.plurals) ? resources.plurals : [resources.plurals];
      for (const plural of plurals) {
        const name = plural['@_name'];
        if (name) {
          const order = this.orderMap.get(`plurals:${name}`) ?? Number.MAX_SAFE_INTEGER;
          resourceEntries.push({ type: 'plurals', resource: plural, order });
        }
      }
    }

    // Sort by order
    resourceEntries.sort((a, b) => a.order - b.order);

    // Rebuild resources object
    const sortedResources: any = {};

    const sortedStrings: any[] = [];
    const sortedPlurals: any[] = [];

    for (const entry of resourceEntries) {
      if (entry.type === 'string') {
        sortedStrings.push(entry.resource);
      } else {
        sortedPlurals.push(entry.resource);
      }
    }

    if (sortedStrings.length > 0) {
      sortedResources.string = sortedStrings.length === 1 ? sortedStrings[0] : sortedStrings;
    }

    if (sortedPlurals.length > 0) {
      sortedResources.plurals = sortedPlurals.length === 1 ? sortedPlurals[0] : sortedPlurals;
    }

    // Build XML
    const xml = this.builder.build({ resources: sortedResources });

    // Ensure proper XML declaration
    if (!xml.includes('<?xml')) {
      return '<?xml version="1.0" encoding="utf-8"?>\n' + xml;
    }

    return xml;
  }

  /**
   * Returns the fallback content for an Android XML file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }
}
