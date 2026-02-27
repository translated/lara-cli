import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VueParser } from '../../parsers/vue.parser.js';
import type { VueParserOptionsType } from '../../parsers/parser.types.js';

describe('VueParser', () => {
  let parser: VueParser;

  beforeEach(() => {
    parser = new VueParser();
  });

  describe('parse', () => {
    it('should parse a simple i18n block', () => {
      const content = '<template><div>Hello</div></template>\n<i18n>\n{"key": "value"}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ key: 'value' });
    });

    it('should flatten nested objects', () => {
      const content =
        '<template><div>Hello</div></template>\n<i18n>\n{"dashboard": {"title": "Dashboard"}}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ 'dashboard\0title': 'Dashboard' });
    });

    it('should flatten deeply nested objects', () => {
      const content =
        '<template></template>\n<i18n>\n{"level1": {"level2": {"level3": {"key": "value"}}}}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ 'level1\0level2\0level3\0key': 'value' });
    });

    it('should flatten arrays', () => {
      const content =
        '<template></template>\n<i18n>\n{"items": ["item1", "item2", "item3"]}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        'items\x000': 'item1',
        'items\x001': 'item2',
        'items\x002': 'item3',
      });
    });

    it('should flatten nested objects with arrays', () => {
      const content =
        '<template></template>\n<i18n>\n{"dashboard": {"title": "Dashboard", "content": ["content 1", "content 2"]}}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        'dashboard\0title': 'Dashboard',
        'dashboard\0content\x000': 'content 1',
        'dashboard\0content\x001': 'content 2',
      });
    });

    it('should handle empty object', () => {
      const content = '<template></template>\n<i18n>\n{}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle object with multiple top-level keys', () => {
      const content =
        '<template></template>\n<i18n>\n{"key1": "value1", "key2": "value2", "key3": "value3"}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should handle null values', () => {
      const content = '<template></template>\n<i18n>\n{"key": null}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ key: null });
    });

    it('should handle boolean values', () => {
      const content =
        '<template></template>\n<i18n>\n{"enabled": true, "disabled": false}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        enabled: true,
        disabled: false,
      });
    });

    it('should handle number values', () => {
      const content = '<template></template>\n<i18n>\n{"count": 42, "price": 99.99}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        count: 42,
        price: 99.99,
      });
    });

    it('should handle mixed types', () => {
      const content =
        '<template></template>\n<i18n>\n{"string": "text", "number": 123, "boolean": true, "null": null, "array": [1, 2], "object": {"nested": "value"}}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        string: 'text',
        number: 123,
        boolean: true,
        null: null,
        'array\x000': 1,
        'array\x001': 2,
        'object\0nested': 'value',
      });
    });

    it('should handle empty arrays', () => {
      const content = '<template></template>\n<i18n>\n{"items": []}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ items: [] });
    });

    it('should handle nested empty objects', () => {
      const content = '<template></template>\n<i18n>\n{"parent": {"child": {}}}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ 'parent\0child': {} });
    });

    it('should handle arrays with objects', () => {
      const content =
        '<template></template>\n<i18n>\n{"users": [{"name": "John"}, {"name": "Jane"}]}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        'users\x000\0name': 'John',
        'users\x001\0name': 'Jane',
      });
    });

    it('should return empty object when no i18n block exists', () => {
      const content = '<template><div>Hello</div></template>';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should return empty object for invalid JSON in i18n block', () => {
      const content = '<template></template>\n<i18n>\n{invalid json}\n</i18n>';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = parser.parse(content);

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle special characters in keys', () => {
      const content =
        '<template></template>\n<i18n>\n{"key-with-dash": "value", "key_with_underscore": "value2"}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({
        'key-with-dash': 'value',
        key_with_underscore: 'value2',
      });
    });

    it('should handle special characters in values', () => {
      const content =
        '<template></template>\n<i18n>\n{"message": "Hello, world! \\"quoted\\""}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ message: 'Hello, world! "quoted"' });
    });

    it('should filter by targetLocale when provided', () => {
      const content =
        '<template></template>\n<i18n>\n{"en": {"hello": "Hello"}, "es": {"hello": "Hola"}}\n</i18n>';
      const result = parser.parse(content, { targetLocale: 'en' } as VueParserOptionsType);

      expect(result).toEqual({ hello: 'Hello' });
    });

    it('should handle targetLocale with nested structure', () => {
      const content =
        '<template></template>\n<i18n>\n{"en": {"dashboard": {"title": "Dashboard"}}, "es": {"dashboard": {"title": "Panel"}}}\n</i18n>';
      const result = parser.parse(content, { targetLocale: 'en' } as VueParserOptionsType);

      expect(result).toEqual({ 'dashboard\0title': 'Dashboard' });
    });

    it('should handle exact locale match in targetLocale', () => {
      const content = '<template></template>\n<i18n>\n{"en": "English", "es": "Spanish"}\n</i18n>';
      const result = parser.parse(content, { targetLocale: 'en' } as VueParserOptionsType);

      expect(result).toEqual({ en: 'English' });
    });

    it('should ignore non-matching locales when targetLocale is provided', () => {
      const content =
        '<template></template>\n<i18n>\n{"en": {"hello": "Hello"}, "es": {"hello": "Hola"}, "fr": {"hello": "Bonjour"}}\n</i18n>';
      const result = parser.parse(content, { targetLocale: 'en' } as VueParserOptionsType);

      expect(result).toEqual({ hello: 'Hello' });
      expect(result).not.toHaveProperty('es');
      expect(result).not.toHaveProperty('fr');
    });

    it('should skip i18n tags inside HTML comments', () => {
      const content =
        '<template></template>\n<!-- <i18n>\n{"commented": "out"}\n</i18n> -->\n<i18n>\n{"active": "content"}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ active: 'content' });
    });

    it('should extract first valid i18n block when multiple exist', () => {
      const content =
        '<template></template>\n<i18n>\n{"first": "block"}\n</i18n>\n<i18n>\n{"second": "block"}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ first: 'block' });
    });

    it('should handle i18n block with attributes', () => {
      const content = '<template></template>\n<i18n lang="json">\n{"key": "value"}\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ key: 'value' });
    });

    it('should handle whitespace around i18n content', () => {
      const content = '<template></template>\n<i18n>\n\n  {"key": "value"}\n\n</i18n>';
      const result = parser.parse(content);

      expect(result).toEqual({ key: 'value' });
    });
  });

  describe('serialize', () => {
    it('should serialize a simple flattened object', () => {
      const originalContent =
        '<template><div>Hello</div></template>\n<i18n>\n{"key": "value"}\n</i18n>';
      const data = { key: 'newValue' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"key": "newValue"');
      expect(resultStr).toContain('<template>');
      expect(resultStr).toContain('<i18n>');
      expect(resultStr).toContain('</i18n>');
    });

    it('should unflatten and serialize nested objects', () => {
      const originalContent =
        '<template></template>\n<i18n>\n{"dashboard": {"title": "Dashboard"}}\n</i18n>';
      const data = { 'dashboard\0title': 'New Dashboard' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ dashboard: { title: 'New Dashboard' } });
    });

    it('should merge with existing messages', () => {
      const originalContent =
        '<template></template>\n<i18n>\n{"key1": "value1", "key2": "value2"}\n</i18n>';
      const data = { key1: 'updatedValue1', key3: 'newValue3' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({
        key1: 'updatedValue1',
        key2: 'value2',
        key3: 'newValue3',
      });
    });

    it('should prefix keys with targetLocale when provided', () => {
      const originalContent = '<template></template>\n<i18n>\n{}\n</i18n>';
      const data = { hello: 'Hello' };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'en',
      } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ en: { hello: 'Hello' } });
    });

    it('should merge locale-prefixed data with existing messages', () => {
      const originalContent =
        '<template></template>\n<i18n>\n{"en": {"hello": "Hello"}, "es": {"hello": "Hola"}}\n</i18n>';
      const data = { hello: 'Hello Updated' };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'en',
      } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed.en).toEqual({ hello: 'Hello Updated' });
      expect(parsed.es).toEqual({ hello: 'Hola' });
    });

    it('should remove keys from target locale when they are removed from source', () => {
      // Original content has 3 keys: hello, goodbye, and extra
      const originalContent =
        '<template></template>\n<i18n>\n{"en": {"hello": "Hello", "goodbye": "Goodbye", "extra": "Extra"}, "es": {"hello": "Hola", "goodbye": "Adiós", "extra": "Extra"}}\n</i18n>';
      // New data only has 2 keys (extra was removed from source)
      const data = { hello: 'Hello', goodbye: 'Goodbye' };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'en',
      } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      // en should only have the 2 keys from new data (extra is removed)
      expect(parsed.en).toEqual({ hello: 'Hello', goodbye: 'Goodbye' });
      // es should remain untouched
      expect(parsed.es).toEqual({ hello: 'Hola', goodbye: 'Adiós', extra: 'Extra' });
    });

    it('should handle key removal with nested structures', () => {
      const originalContent =
        '<template></template>\n<i18n>\n{"en": {"dashboard": {"title": "Dashboard", "subtitle": "Welcome"}}, "es": {"dashboard": {"title": "Panel", "subtitle": "Bienvenido"}}}\n</i18n>';
      // subtitle was removed from source
      const data = { 'dashboard\0title': 'Dashboard' };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'en',
      } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      // en should only have title (subtitle removed)
      expect(parsed.en).toEqual({ dashboard: { title: 'Dashboard' } });
      // es should remain untouched
      expect(parsed.es).toEqual({ dashboard: { title: 'Panel', subtitle: 'Bienvenido' } });
    });

    it('should handle arrays in serialization', () => {
      const originalContent = '<template></template>\n<i18n>\n{}\n</i18n>';
      const data = {
        'items\x000': 'item1',
        'items\x001': 'item2',
        'items\x002': 'item3',
      };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ items: ['item1', 'item2', 'item3'] });
    });

    it('should handle complex nested structure', () => {
      const originalContent = '<template></template>\n<i18n>\n{}\n</i18n>';
      const data = {
        'dashboard\0title': 'Dashboard',
        'dashboard\0content\x000': 'content 1',
        'dashboard\0content\x001': 'content 2',
        'settings\0theme': 'dark',
      };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({
        dashboard: {
          title: 'Dashboard',
          content: ['content 1', 'content 2'],
        },
        settings: {
          theme: 'dark',
        },
      });
    });

    it('should handle null values', () => {
      const originalContent = '<template></template>\n<i18n>\n{}\n</i18n>';
      const data = { key: null };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ key: null });
    });

    it('should handle boolean values', () => {
      const originalContent = '<template></template>\n<i18n>\n{}\n</i18n>';
      const data = { enabled: true, disabled: false };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ enabled: true, disabled: false });
    });

    it('should handle number values', () => {
      const originalContent = '<template></template>\n<i18n>\n{}\n</i18n>';
      const data = { count: 42, price: 99.99 };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ count: 42, price: 99.99 });
    });

    it('should throw error when originalContent is not provided', () => {
      const data = { key: 'value' };

      expect(() => parser.serialize(data, {} as VueParserOptionsType)).toThrow(
        'Original content is required for Vue serialization'
      );
    });

    it('should handle empty data object', () => {
      const originalContent = '<template></template>\n<i18n>\n{"key": "value"}\n</i18n>';
      const data = {};
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ key: 'value' });
    });

    it('should add i18n block if none exists', () => {
      const originalContent = '<template><div>Hello</div></template>';
      const data = { key: 'value' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<i18n>');
      expect(resultStr).toContain('</i18n>');
      expect(resultStr).toContain('"key": "value"');
    });

    it('should add i18n block at end if no template tag exists', () => {
      const originalContent = '<script>export default {}</script>';
      const data = { key: 'value' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<i18n>');
      expect(resultStr).toContain('</i18n>');
      expect(resultStr.endsWith('</i18n>\n')).toBe(true);
    });

    it('should preserve Vue SFC structure', () => {
      const originalContent =
        '<template>\n  <div>Hello</div>\n</template>\n<script>\nexport default {}\n</script>\n<i18n>\n{"key": "value"}\n</i18n>';
      const data = { key: 'newValue' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<template>');
      expect(resultStr).toContain('<script>');
      expect(resultStr).toContain('export default');
    });

    it('should skip commented i18n blocks when serializing', () => {
      const originalContent =
        '<template></template>\n<!-- <i18n>\n{"old": "data"}\n</i18n> -->\n<i18n>\n{"active": "content"}\n</i18n>';
      const data = { active: 'updated' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<!-- <i18n>');
      // Use the parser's parse method to verify it extracts the correct (active) block
      const parsed = parser.parse(resultStr);
      expect(parsed).toEqual({ active: 'updated' });
    });

    it('should handle i18n block with attributes', () => {
      const originalContent =
        '<template></template>\n<i18n lang="json">\n{"key": "value"}\n</i18n>';
      const data = { key: 'newValue' };
      const result = parser.serialize(data, { originalContent } as VueParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<i18n');
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const parsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(parsed).toEqual({ key: 'newValue' });
    });
  });

  describe('numeric string keys preservation', () => {
    it('should round-trip objects with numeric string keys without converting to arrays', () => {
      const originalContent =
        '<template></template>\n<i18n>\n{"product": {"0": {"title": "Multi-BM Ecosystem"}, "1": {"title": "Bulk Campaign Launcher"}}}\n</i18n>';
      const parsed = parser.parse(originalContent);
      const serialized = parser.serialize(parsed, { originalContent } as VueParserOptionsType);

      const resultStr = serialized.toString();
      const i18nMatch = resultStr.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/i);
      const reparsed = JSON.parse(i18nMatch?.[1]?.trim() || '{}');
      expect(reparsed.product).not.toBeInstanceOf(Array);
      expect(reparsed.product['0']).toEqual({ title: 'Multi-BM Ecosystem' });
      expect(reparsed.product['1']).toEqual({ title: 'Bulk Campaign Launcher' });
    });
  });

  describe('getFallback', () => {
    it('should return default i18n block template', () => {
      const result = parser.getFallback();

      expect(result).toBe('<i18n>\n{}\n</i18n>');
    });
  });

  describe('hasI18nTag', () => {
    it('should return true when i18n tag exists', () => {
      const content = '<template></template>\n<i18n>\n{"key": "value"}\n</i18n>';
      const result = VueParser.hasI18nTag(content);

      expect(result).toBe(true);
    });

    it('should return false when no i18n tag exists', () => {
      const content = '<template><div>Hello</div></template>';
      const result = VueParser.hasI18nTag(content);

      expect(result).toBe(false);
    });

    it('should return false when i18n tag is commented out', () => {
      const content = '<template></template>\n<!-- <i18n>\n{"key": "value"}\n</i18n> -->';
      const result = VueParser.hasI18nTag(content);

      expect(result).toBe(false);
    });

    it('should return true when i18n tag exists even if commented one exists', () => {
      const content =
        '<template></template>\n<!-- <i18n>\n{"old": "data"}\n</i18n> -->\n<i18n>\n{"active": "content"}\n</i18n>';
      const result = VueParser.hasI18nTag(content);

      expect(result).toBe(true);
    });
  });
});
