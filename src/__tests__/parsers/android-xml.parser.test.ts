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
