import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TsParser } from '../../parsers/ts.parser.js';
import type { TsParserOptionsType } from '../../parsers/parser.types.js';

describe('TsParser', () => {
  let parser: TsParser;

  beforeEach(() => {
    parser = new TsParser();
  });

  describe('parse', () => {
    it('should parse a simple messages object', () => {
      const content = 'const messages = { key: "value" };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({ key: 'value' });
    });

    it('should flatten nested objects', () => {
      const content =
        'const messages = { dashboard: { title: "Dashboard" } };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({ 'dashboard\0title': 'Dashboard' });
    });

    it('should flatten deeply nested objects', () => {
      const content =
        'const messages = { level1: { level2: { level3: { key: "value" } } } };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({ 'level1\0level2\0level3\0key': 'value' });
    });

    it('should flatten arrays', () => {
      const content =
        'const messages = { items: ["item1", "item2", "item3"] };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        'items\x000': 'item1',
        'items\x001': 'item2',
        'items\x002': 'item3',
      });
    });

    it('should flatten nested objects with arrays', () => {
      const content =
        'const messages = { dashboard: { title: "Dashboard", content: ["content 1", "content 2"] } };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        'dashboard\0title': 'Dashboard',
        'dashboard\0content\x000': 'content 1',
        'dashboard\0content\x001': 'content 2',
      });
    });

    it('should handle empty object', () => {
      const content = 'const messages = {};\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle object with multiple top-level keys', () => {
      const content =
        'const messages = { key1: "value1", key2: "value2", key3: "value3" };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should handle null values', () => {
      const content = 'const messages = { key: null };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({ key: null });
    });

    it('should handle boolean values', () => {
      const content =
        'const messages = { enabled: true, disabled: false };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        enabled: true,
        disabled: false,
      });
    });

    it('should handle number values', () => {
      const content = 'const messages = { count: 42, price: 99.99 };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        count: 42,
        price: 99.99,
      });
    });

    it('should handle mixed types', () => {
      const content =
        'const messages = { string: "text", number: 123, boolean: true, nullValue: null, array: [1, 2], object: { nested: "value" } };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        string: 'text',
        number: 123,
        boolean: true,
        nullValue: null,
        'array\x000': 1,
        'array\x001': 2,
        'object\0nested': 'value',
      });
    });

    it('should handle empty arrays', () => {
      const content = 'const messages = { items: [] };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({ items: [] });
    });

    it('should handle nested empty objects', () => {
      const content = 'const messages = { parent: { child: {} } };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({ 'parent\0child': {} });
    });

    it('should handle arrays with objects', () => {
      const content =
        'const messages = { users: [{ name: "John" }, { name: "Jane" }] };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        'users\x000\0name': 'John',
        'users\x001\0name': 'Jane',
      });
    });

    it('should handle string literal keys', () => {
      const content =
        'const messages = { "key-with-dash": "value", "key_with_underscore": "value2" };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        'key-with-dash': 'value',
        key_with_underscore: 'value2',
      });
    });

    it('should handle numeric literal keys', () => {
      const content =
        'const messages = { 123: "value", 456: "value2" };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        '\x02123': 'value',
        '\x02456': 'value2',
      });
    });

    it('should return empty object for invalid TypeScript', () => {
      const content = 'invalid typescript code {';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = parser.parse(content);

      expect(result).toEqual({});

      consoleSpy.mockRestore();
    });

    it('should filter by targetLocale when provided', () => {
      const content =
        'const messages = { en: { hello: "Hello" }, es: { hello: "Hola" } };\n\nexport default messages;';
      const result = parser.parse(content, { targetLocale: 'en' } as any);

      expect(result).toEqual({ hello: 'Hello' });
    });

    it('should handle targetLocale with nested structure', () => {
      const content =
        'const messages = { en: { dashboard: { title: "Dashboard" } }, es: { dashboard: { title: "Panel" } } };\n\nexport default messages;';
      const result = parser.parse(content, { targetLocale: 'en' } as any);

      expect(result).toEqual({ 'dashboard\0title': 'Dashboard' });
    });

    it('should handle exact locale match in targetLocale', () => {
      const content =
        'const messages = { en: "English", es: "Spanish" };\n\nexport default messages;';
      const result = parser.parse(content, { targetLocale: 'en' } as any);

      expect(result).toEqual({ en: 'English' });
    });

    it('should ignore non-matching locales when targetLocale is provided', () => {
      const content =
        'const messages = { en: { hello: "Hello" }, es: { hello: "Hola" }, fr: { hello: "Bonjour" } };\n\nexport default messages;';
      const result = parser.parse(content, { targetLocale: 'en' } as any);

      expect(result).toEqual({ hello: 'Hello' });
      expect(result).not.toHaveProperty('es');
      expect(result).not.toHaveProperty('fr');
    });

    it('should preserve keys containing forward slashes', () => {
      const content =
        'const messages = { moderation: { harassment: "Harassment", "harassment/threatening": "Harassment/Threatening" } };\n\nexport default messages;';
      const result = parser.parse(content);

      expect(result).toEqual({
        'moderation\0harassment': 'Harassment',
        'moderation\0harassment/threatening': 'Harassment/Threatening',
      });
    });

    it('should round-trip keys containing forward slashes through parse and serialize', () => {
      const originalContent =
        'const messages = { moderation: { harassment: "Harassment", "harassment/threatening": "Harassment/Threatening" } };\n\nexport default messages;';
      const parsed = parser.parse(originalContent);
      const serialized = parser.serialize(parsed, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = serialized.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const reparsed = JSON.parse(match?.[1] || '{}');
      expect(reparsed).toEqual({
        moderation: {
          harassment: 'Harassment',
          'harassment/threatening': 'Harassment/Threatening',
        },
      });
    });
  });

  describe('serialize', () => {
    it('should serialize a simple flattened object', () => {
      const originalContent = 'const messages = { key: "value" };\n\nexport default messages;';
      const data = { key: 'newValue' };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"key": "newValue"');
      expect(resultStr).toContain('const messages =');
      expect(resultStr).toContain('export default messages;');
    });

    it('should unflatten and serialize nested objects', () => {
      const originalContent =
        'const messages = { dashboard: { title: "Dashboard" } };\n\nexport default messages;';
      const data = { 'dashboard\0title': 'New Dashboard' };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ dashboard: { title: 'New Dashboard' } });
    });

    it('should merge with existing messages', () => {
      const originalContent =
        'const messages = { key1: "value1", key2: "value2" };\n\nexport default messages;';
      const data = { key1: 'updatedValue1', key3: 'newValue3' };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({
        key1: 'updatedValue1',
        key2: 'value2',
        key3: 'newValue3',
      });
    });

    it('should prefix keys with targetLocale when provided', () => {
      const originalContent = 'const messages = {};\n\nexport default messages;';
      const data = { hello: 'Hello' };
      const result = parser.serialize(data, { originalContent, targetLocale: 'en' });

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ en: { hello: 'Hello' } });
    });

    it('should merge locale-prefixed data with existing messages', () => {
      const originalContent =
        'const messages = { en: { hello: "Hello" }, es: { hello: "Hola" } };\n\nexport default messages;';
      const data = { hello: 'Hello Updated' };
      const result = parser.serialize(data, { originalContent, targetLocale: 'en' });

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed.en).toEqual({ hello: 'Hello Updated' });
      expect(parsed.es).toEqual({ hello: 'Hola' });
    });

    it('should remove keys from target locale when they are removed from source', () => {
      // Original content has 3 keys: hello, goodbye, and extra
      const originalContent =
        'const messages = { en: { hello: "Hello", goodbye: "Goodbye", extra: "Extra" }, es: { hello: "Hola", goodbye: "Adiós", extra: "Extra" } };\n\nexport default messages;';
      // New data only has 2 keys (extra was removed from source)
      const data = { hello: 'Hello', goodbye: 'Goodbye' };
      const result = parser.serialize(data, { originalContent, targetLocale: 'en' });

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      // en should only have the 2 keys from new data (extra is removed)
      expect(parsed.en).toEqual({ hello: 'Hello', goodbye: 'Goodbye' });
      // es should remain untouched
      expect(parsed.es).toEqual({ hello: 'Hola', goodbye: 'Adiós', extra: 'Extra' });
    });

    it('should handle key removal with nested structures', () => {
      const originalContent =
        'const messages = { en: { dashboard: { title: "Dashboard", subtitle: "Welcome" } }, es: { dashboard: { title: "Panel", subtitle: "Bienvenido" } } };\n\nexport default messages;';
      // subtitle was removed from source
      const data = { 'dashboard\0title': 'Dashboard' };
      const result = parser.serialize(data, { originalContent, targetLocale: 'en' });

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      // en should only have title (subtitle removed)
      expect(parsed.en).toEqual({ dashboard: { title: 'Dashboard' } });
      // es should remain untouched
      expect(parsed.es).toEqual({ dashboard: { title: 'Panel', subtitle: 'Bienvenido' } });
    });

    it('should handle arrays in serialization', () => {
      const originalContent = 'const messages = {};\n\nexport default messages;';
      const data = {
        'items\x000': 'item1',
        'items\x001': 'item2',
        'items\x002': 'item3',
      };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ items: ['item1', 'item2', 'item3'] });
    });

    it('should handle complex nested structure', () => {
      const originalContent = 'const messages = {};\n\nexport default messages;';
      const data = {
        'dashboard\0title': 'Dashboard',
        'dashboard\0content\x000': 'content 1',
        'dashboard\0content\x001': 'content 2',
        'settings\0theme': 'dark',
      };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
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
      const originalContent = 'const messages = {};\n\nexport default messages;';
      const data = { key: null };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ key: null });
    });

    it('should handle boolean values', () => {
      const originalContent = 'const messages = {};\n\nexport default messages;';
      const data = { enabled: true, disabled: false };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ enabled: true, disabled: false });
    });

    it('should handle number values', () => {
      const originalContent = 'const messages = {};\n\nexport default messages;';
      const data = { count: 42, price: 99.99 };
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ count: 42, price: 99.99 });
    });

    it('should throw error when originalContent is not provided', () => {
      const data = { key: 'value' };

      expect(() => parser.serialize(data, {} as TsParserOptionsType)).toThrow(
        'Original content is required for TS serialization'
      );
    });

    it('should handle empty data object', () => {
      const originalContent = 'const messages = { key: "value" };\n\nexport default messages;';
      const data = {};
      const result = parser.serialize(data, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = result.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const parsed = JSON.parse(match?.[1] || '{}');
      expect(parsed).toEqual({ key: 'value' });
    });
  });

  describe('numeric string keys preservation', () => {
    it('should round-trip objects with numeric string keys without converting to arrays', () => {
      const originalContent =
        'const messages = { product: { "0": { title: "Multi-BM Ecosystem" }, "1": { title: "Bulk Campaign Launcher" } } };\n\nexport default messages;';
      const parsed = parser.parse(originalContent);
      const serialized = parser.serialize(parsed, { originalContent } as unknown as TsParserOptionsType);

      const resultStr = serialized.toString();
      const match = resultStr.match(/const\s+messages\s*=\s*({[\s\S]*?});/);
      const reparsed = JSON.parse(match?.[1] || '{}');
      expect(reparsed.product).not.toBeInstanceOf(Array);
      expect(reparsed.product['0']).toEqual({ title: 'Multi-BM Ecosystem' });
      expect(reparsed.product['1']).toEqual({ title: 'Bulk Campaign Launcher' });
    });
  });

  describe('getFallback', () => {
    it('should return default TypeScript template', () => {
      const result = parser.getFallback();

      expect(result).toBe('const messages = {};\n\nexport default messages;');
    });
  });
});
