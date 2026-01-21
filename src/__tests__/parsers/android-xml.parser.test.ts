import { describe, it, expect, beforeEach } from 'vitest';
import { AndroidXmlParser } from '../../parsers/android-xml.parser.js';
import type { AndroidXmlParserOptionsType } from '../../parsers/parser.types.js';

describe('AndroidXmlParser', () => {
  let parser: AndroidXmlParser;

  beforeEach(() => {
    parser = new AndroidXmlParser();
  });

  describe('parse', () => {
    it('should parse simple string resources', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="hello">Hello World</string>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
        hello: 'Hello World',
      });
    });

    it('should parse plural resources', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'item_count/one': '%d item',
        'item_count/other': '%d items',
      });
    });

    it('should parse mixed string and plural resources', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
    <string name="goodbye">Goodbye</string>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
        'item_count/one': '%d item',
        'item_count/other': '%d items',
        goodbye: 'Goodbye',
      });
    });

    it('should skip non-translatable strings', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name" translatable="false">My App</string>
    <string name="hello">Hello World</string>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        hello: 'Hello World',
      });
    });

    it('should handle empty string values', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="empty"></string>
    <string name="hello">Hello World</string>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        empty: '',
        hello: 'Hello World',
      });
    });

    it('should handle empty resources', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle special characters in values', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="message">Hello &amp; Welcome</string>
    <string name="quoted">Say &quot;Hello&quot;</string>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        message: 'Hello & Welcome',
        quoted: 'Say "Hello"',
      });
    });

    it('should handle multiple plural items', () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="item_count">
        <item quantity="zero">No items</item>
        <item quantity="one">%d item</item>
        <item quantity="two">%d items</item>
        <item quantity="few">%d items</item>
        <item quantity="many">%d items</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'item_count/zero': 'No items',
        'item_count/one': '%d item',
        'item_count/two': '%d items',
        'item_count/few': '%d items',
        'item_count/many': '%d items',
        'item_count/other': '%d items',
      });
    });

    it('should handle Buffer input', () => {
      const content = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
</resources>`);
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
      });
    });

    it('should handle invalid XML gracefully', () => {
      const content = 'invalid xml content';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });
  });

  describe('serialize', () => {
    it('should serialize simple string resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="hello">Hello World</string>
</resources>`;
      const data = {
        app_name: 'Mi Aplicación',
        hello: 'Hola Mundo',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      expect(result).toContain('<string name="app_name">Mi Aplicación</string>');
      expect(result).toContain('<string name="hello">Hola Mundo</string>');
      expect(result).toContain('<resources>');
    });

    it('should serialize plural resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;
      const data = {
        'item_count/one': '%d artículo',
        'item_count/other': '%d artículos',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      expect(result).toContain('<plurals name="item_count">');
      expect(result).toContain('<item quantity="one">%d artículo</item>');
      expect(result).toContain('<item quantity="other">%d artículos</item>');
    });

    it('should preserve non-translatable strings', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name" translatable="false">My App</string>
    <string name="hello">Hello World</string>
</resources>`;
      const data = {
        hello: 'Hola Mundo',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      expect(result).toContain('<string name="app_name" translatable="false">My App</string>');
      expect(result).toContain('<string name="hello">Hola Mundo</string>');
    });

    it('should preserve order of resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="first">First</string>
    <string name="second">Second</string>
    <string name="third">Third</string>
</resources>`;
      const data = {
        first: 'Primero',
        second: 'Segundo',
        third: 'Tercero',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      const firstIndex = result.toString().indexOf('first');
      const secondIndex = result.toString().indexOf('second');
      const thirdIndex = result.toString().indexOf('third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('should preserve order of resources with string and plural resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="hello">Hello World</string>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
    <string name="goodbye">Goodbye</string>
</resources>`;
      const data = {
        hello: 'Hello World',
        'item_count/one': '%d item',
        'item_count/other': '%d items',
        goodbye: 'Goodbye',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);
      
      const helloIndex = result.toString().indexOf('hello');
      const itemCountIndex = result.toString().indexOf('item_count');
      const goodbyeIndex = result.toString().indexOf('goodbye');

      expect(helloIndex).toBeLessThan(itemCountIndex);
      expect(itemCountIndex).toBeLessThan(goodbyeIndex);
    });

    it('should handle empty values', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="hello">Hello World</string>
</resources>`;
      const data = {
        hello: '',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      expect(result).toContain('<string name="hello"></string>');
    });

    it('should escape XML special characters in string resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="ampersand&amp;">Text with &amp;</string>
    <string name="less_than">Text with &lt;</string>
    <string name="greater_than">Text with &gt;</string>
    <string name="quotes">Text with &quot;</string>
    <string name="apostrophe">Text with &apos;</string>
    <string name="all_special">A &lt; B &gt; C &quot;quote&quot; &apos;apos&apos;</string>
</resources>`;
      const data = {
        'ampersand&': 'Text with &',
        less_than: 'Text with <',
        greater_than: 'Text with >',
        quotes: 'Text with "',
        apostrophe: "Text with '",
        all_special: 'A < B > C "quote" \'apos\'',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      // Verify each special character is properly escaped
      expect(result).toContain('<string name="ampersand&amp;">Text with &amp;</string>');
      expect(result).toContain('<string name="less_than">Text with &lt;</string>');
      expect(result).toContain('<string name="greater_than">Text with &gt;</string>');
      expect(result).toContain('<string name="quotes">Text with &quot;</string>');
      expect(result).toContain("<string name=\"apostrophe\">Text with &apos;</string>");
      expect(result).toContain('<string name="all_special">A &lt; B &gt; C &quot;quote&quot; &apos;apos&apos;</string>');
      
      // Verify the XML is valid by checking it doesn't contain unescaped special characters
      const resultStr = result.toString();
      expect(resultStr).not.toMatch(/<string[^>]*>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)[^<]*<\/string>/);
    });

    it('should escape XML special characters in plural resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="special_plural">
        <item quantity="one">One &amp; item</item>
        <item quantity="other">Many &lt; items &gt;</item>
    </plurals>
    <plurals name="&quot;quotes_plural&quot;">
        <item quantity="&quot;one&quot;">Say &quot;hello&quot;</item>
        <item quantity="other">Say &apos;hi&apos;</item>
    </plurals>
</resources>`;
      const data = {
        'special_plural/one': 'One & item',
        'special_plural/other': 'Many < items >',
        '"quotes_plural"/"one"': 'Say "hello"',
        '"quotes_plural"/other': "Say 'hi'",
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      // Verify special characters are properly escaped in plural items
      expect(result).toContain('<item quantity="one">One &amp; item</item>');
      expect(result).toContain('<item quantity="other">Many &lt; items &gt;</item>');
      expect(result).toContain('<item quantity="&quot;one&quot;">Say &quot;hello&quot;</item>');
      expect(result).toContain("<item quantity=\"other\">Say &apos;hi&apos;</item>");
      
      // Verify the XML is valid by checking it doesn't contain unescaped special characters
      const resultStr = result.toString();
      expect(resultStr).not.toMatch(/<item[^>]*>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)[^<]*<\/item>/);
    });

    it('should throw error when originalContent is missing', () => {
      const data = {
        hello: 'Hello',
      };

      expect(() => parser.serialize(data, {} as any)).toThrow(
        'Original content is required for Android XML serialization'
      );
    });

    it('should handle mixed string and plural resources', () => {
      const originalContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
    <string name="goodbye">Goodbye</string>
</resources>`;
      const data = {
        app_name: 'Mi Aplicación',
        'item_count/one': '%d artículo',
        'item_count/other': '%d artículos',
        goodbye: 'Adiós',
      };
      const result = parser.serialize(data, { originalContent } as AndroidXmlParserOptionsType);

      expect(result).toContain('<string name="app_name">Mi Aplicación</string>');
      expect(result).toContain('<item quantity="one">%d artículo</item>');
      expect(result).toContain('<item quantity="other">%d artículos</item>');
      expect(result).toContain('<string name="goodbye">Adiós</string>');
    });
  });

  describe('getFallback', () => {
    it('should return default XML structure', () => {
      const result = parser.getFallback();

      expect(result).toBe(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>'
      );
    });
  });
});
