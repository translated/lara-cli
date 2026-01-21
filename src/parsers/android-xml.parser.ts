import { XMLParser } from 'fast-xml-parser';
import type { Parser } from '../interface/parser.js';
import type { AndroidXmlParserOptionsType } from './parser.types.js';

/**
 * Represents a parsed Android XML string resource.
 */
interface AndroidXmlString {
  '@_name': string;
  '@_translatable'?: string;
  '#text'?: string;
}

/**
 * Represents a parsed Android XML plural item.
 */
interface AndroidXmlPluralItem {
  '@_quantity': string;
  '#text'?: string;
}

/**
 * Represents a parsed Android XML plurals resource.
 */
interface AndroidXmlPlurals {
  '@_name': string;
  item?: AndroidXmlPluralItem | AndroidXmlPluralItem[];
}

/**
 * Represents the resources section of a parsed Android XML file.
 */
interface AndroidXmlResources {
  string?: AndroidXmlString | AndroidXmlString[];
  plurals?: AndroidXmlPlurals | AndroidXmlPlurals[];
}

/**
 * Represents the root structure of a parsed Android XML file.
 */
interface AndroidXmlParsed {
  resources?: AndroidXmlResources;
}

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
  }

  /**
   * Type guard to check if the parsed object has the expected Android XML structure.
   */
  private isAndroidXmlParsed(value: unknown): value is AndroidXmlParsed {
    return (
      typeof value === 'object' &&
      value !== null &&
      (!('resources' in value) || typeof (value as AndroidXmlParsed).resources === 'object')
    );
  }

  /**
   * Parses Android XML string resources into a flat key-value structure.
   *
   * Simple strings are mapped as: "string_name" -> "value"
   * Plural forms are mapped as: "item_count/one" -> "%d item", "item_count/other" -> "%d items"
   *
   * @param content - The XML content as string or Buffer
   * @returns A record mapping resource keys to their values
   */
  parse(content: string | Buffer): Record<string, unknown> {
    const strContent = content.toString();
    this.orderMap = this.buildOrderMap(strContent);

    let parsed: unknown;
    try {
      parsed = this.parser.parse(strContent);
    } catch (error) {
      console.error('Failed to parse Android XML content', error);
      return {};
    }

    if (!this.isAndroidXmlParsed(parsed) || !parsed.resources) {
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

        const items = plural.item
          ? (Array.isArray(plural.item) ? plural.item : [plural.item])
          : [];
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
   * Escapes XML special characters for use in both attributes and text content.
   *
   * @param value - The XML content to escape
   * @returns The escaped XML content
   */
  private escapeTextContent(value: string): string {
    return value
      .replace(/&/g, '&amp;')   // The ampersand (&) must be escaped first before other entities,
      .replace(/</g, '&lt;')    // otherwise already-escaped entities like "&lt;" will be double-escaped to "&amp;lt;".
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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

    const resourceRegex = /<(string|plurals)\b[^>]*\bname=["']([^"']+)["'][^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = resourceRegex.exec(content)) !== null) {
      const tag = match[1];
      const name = match[2];
      if (name) {
        const key = `${tag}:${name}`;
        if (!map.has(key)) {
          map.set(key, orderIndex++);
        }
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

    let parsed: unknown;
    try {
      parsed = this.parser.parse(strContent);
    } catch (error) {
      console.error('Failed to parse original Android XML content', error);
      return strContent;
    }

    if (!this.isAndroidXmlParsed(parsed)) {
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
        if (!name || !plural.item) continue;

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
    type ResourceEntry =
      | { type: 'string'; resource: AndroidXmlString; order: number }
      | { type: 'plurals'; resource: AndroidXmlPlurals; order: number };
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

    // Manually build XML to preserve interleaved order
    const indent = '    ';
    const lines: string[] = ['<resources>'];

    for (const entry of resourceEntries) {
      if (entry.type === 'string') {
        const str = entry.resource;
        const name = str['@_name'];
        const translatable = str['@_translatable'];
        const value = str['#text'] || '';
        
        const escapedName = this.escapeTextContent(String(name));
        const escapedValue = this.escapeTextContent(value);
        
        let attrs = `name="${escapedName}"`;
        if (translatable === 'false') {
          attrs += ` translatable="false"`;
        }
        
        lines.push(`${indent}<string ${attrs}>${escapedValue}</string>`);
      } else {
        const plural = entry.resource;
        const name = plural['@_name'];
        const items = plural.item
          ? (Array.isArray(plural.item) ? plural.item : [plural.item])
          : [];
        
        const escapedName = this.escapeTextContent(String(name));
        
        lines.push(`${indent}<plurals name="${escapedName}">`);
        
        for (const item of items) {
          const quantity = item['@_quantity'];
          if (!quantity) continue;
          
          const value = item['#text'] || '';

          const escapedQuantity = this.escapeTextContent(String(quantity));
          const escapedValue = this.escapeTextContent(value);
          
          lines.push(`${indent}${indent}<item quantity="${escapedQuantity}">${escapedValue}</item>`);
        }
        
        lines.push(`${indent}</plurals>`);
      }
    }

    lines.push('</resources>');

    // Build XML
    const xml = lines.join('\n');

    // Ensure proper XML declaration
    const trimmedXml = xml.trimStart();
    if (!trimmedXml.startsWith('<?xml')) {
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
