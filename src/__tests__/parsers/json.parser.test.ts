import { describe, it, expect, beforeEach } from 'vitest';
import { JsonParser } from '../../parsers/json.parser.js';

describe('JsonParser', () => {
  let parser: JsonParser;

  beforeEach(() => {
    parser = new JsonParser();
  });

  describe('parse', () => {
    it('should parse a simple JSON object', () => {
      const content = '{"key": "value"}';
      const result = parser.parse(content);

      expect(result).toEqual({ key: 'value' });
    });

    it('should flatten nested objects', () => {
      const content = '{"dashboard": {"title": "Dashboard"}}';
      const result = parser.parse(content);

      expect(result).toEqual({ 'dashboard\0title': 'Dashboard' });
    });

    it('should flatten deeply nested objects', () => {
      const content = '{"level1": {"level2": {"level3": {"key": "value"}}}}';
      const result = parser.parse(content);

      expect(result).toEqual({ 'level1\0level2\0level3\0key': 'value' });
    });

    it('should flatten arrays', () => {
      const content = '{"items": ["item1", "item2", "item3"]}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'items\x000': 'item1',
        'items\x001': 'item2',
        'items\x002': 'item3',
      });
    });

    it('should flatten nested objects with arrays', () => {
      const content =
        '{"dashboard": {"title": "Dashboard", "content": ["content 1", "content 2"]}}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'dashboard\0title': 'Dashboard',
        'dashboard\0content\x000': 'content 1',
        'dashboard\0content\x001': 'content 2',
      });
    });

    it('should handle empty object', () => {
      const content = '{}';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle object with multiple top-level keys', () => {
      const content = '{"key1": "value1", "key2": "value2", "key3": "value3"}';
      const result = parser.parse(content);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should handle null values', () => {
      const content = '{"key": null}';
      const result = parser.parse(content);

      expect(result).toEqual({ key: null });
    });

    it('should handle boolean values', () => {
      const content = '{"enabled": true, "disabled": false}';
      const result = parser.parse(content);

      expect(result).toEqual({
        enabled: true,
        disabled: false,
      });
    });

    it('should handle number values', () => {
      const content = '{"count": 42, "price": 99.99}';
      const result = parser.parse(content);

      expect(result).toEqual({
        count: 42,
        price: 99.99,
      });
    });

    it('should handle mixed types', () => {
      const content =
        '{"string": "text", "number": 123, "boolean": true, "null": null, "array": [1, 2], "object": {"nested": "value"}}';
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
      const content = '{"items": []}';
      const result = parser.parse(content);

      expect(result).toEqual({ items: [] });
    });

    it('should handle nested empty objects', () => {
      const content = '{"parent": {"child": {}}}';
      const result = parser.parse(content);

      expect(result).toEqual({ 'parent\0child': {} });
    });

    it('should handle arrays with objects', () => {
      const content = '{"users": [{"name": "John"}, {"name": "Jane"}]}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'users\x000\0name': 'John',
        'users\x001\0name': 'Jane',
      });
    });

    it('should throw error for invalid JSON', () => {
      const content = '{invalid json}';

      expect(() => parser.parse(content)).toThrow();
    });

    it('should handle special characters in keys', () => {
      const content = '{"key-with-dash": "value", "key_with_underscore": "value2"}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'key-with-dash': 'value',
        key_with_underscore: 'value2',
      });
    });

    it('should handle special characters in values', () => {
      const content = '{"message": "Hello, world! \\"quoted\\""}';
      const result = parser.parse(content);

      expect(result).toEqual({ message: 'Hello, world! "quoted"' });
    });

    it('should parse and serialize back to equivalent structure', () => {
      const original =
        '{"dashboard": {"title": "Dashboard", "content": ["content 1", "content 2"]}}';
      const flattened = parser.parse(original);
      const serialized = parser.serialize(flattened, { indentation: 0, trailingNewline: '' });
      const reparsed = JSON.parse(serialized);

      expect(reparsed).toEqual(JSON.parse(original));
    });

    it('should preserve keys containing forward slashes', () => {
      const content = JSON.stringify({
        moderation_categories: {
          harassment: 'Harassment',
          'harassment/threatening': 'Harassment/Threatening',
          'self-harm': 'Self-Harm',
          'self-harm/intent': 'Self-Harm/Intent',
        },
      });
      const result = parser.parse(content);

      expect(result).toEqual({
        'moderation_categories\0harassment': 'Harassment',
        'moderation_categories\0harassment/threatening': 'Harassment/Threatening',
        'moderation_categories\0self-harm': 'Self-Harm',
        'moderation_categories\0self-harm/intent': 'Self-Harm/Intent',
      });
    });

    it('should round-trip keys containing forward slashes through parse and serialize', () => {
      const original = {
        moderation_categories: {
          harassment: 'Molestie',
          'harassment/threatening': 'Molestie/Minacce',
          'self-harm': 'Autolesionismo',
          'self-harm/intent': 'Autolesionismo/Intento',
        },
      };
      const content = JSON.stringify(original);
      const flattened = parser.parse(content);
      const serialized = parser.serialize(flattened, { indentation: 2, trailingNewline: '\n' });
      const reparsed = JSON.parse(serialized);

      expect(reparsed).toEqual(original);
    });
  });

  describe('serialize', () => {
    it('should serialize a simple flattened object', () => {
      const data = { key: 'value' };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "key": "value"\n}\n');
    });

    it('should unflatten and serialize nested objects', () => {
      const data = { 'dashboard\0title': 'Dashboard' };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "dashboard": {\n    "title": "Dashboard"\n  }\n}\n');
    });

    it('should unflatten and serialize arrays', () => {
      const data = {
        'items\x000': 'item1',
        'items\x001': 'item2',
        'items\x002': 'item3',
      };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "items": [\n    "item1",\n    "item2",\n    "item3"\n  ]\n}\n');
    });

    it('should handle different indentation levels', () => {
      const data = { key: 'value' };
      const options4 = { indentation: 4, trailingNewline: '\n' };
      const result4 = parser.serialize(data, options4);

      expect(result4).toBe('{\n    "key": "value"\n}\n');

      const options0 = { indentation: 0, trailingNewline: '\n' };
      const result0 = parser.serialize(data, options0);

      expect(result0).toBe('{"key":"value"}\n');
    });

    it('should handle string indentation', () => {
      const data = { key: 'value' };
      const options = { indentation: '  ', trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "key": "value"\n}\n');
    });

    it('should handle trailing newline options', () => {
      const data = { key: 'value' };
      const optionsNoNewline = { indentation: 2, trailingNewline: '' };
      const resultNoNewline = parser.serialize(data, optionsNoNewline);

      expect(resultNoNewline).toBe('{\n  "key": "value"\n}');

      const optionsDoubleNewline = { indentation: 2, trailingNewline: '\n\n' };
      const resultDoubleNewline = parser.serialize(data, optionsDoubleNewline);

      expect(resultDoubleNewline).toBe('{\n  "key": "value"\n}\n\n');
    });

    it('should serialize empty object', () => {
      const data = {};
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{}\n');
    });

    it('should serialize complex nested structure', () => {
      const data = {
        'dashboard\0title': 'Dashboard',
        'dashboard\0content\x000': 'content 1',
        'dashboard\0content\x001': 'content 2',
        'settings\0theme': 'dark',
      };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        dashboard: {
          title: 'Dashboard',
          content: ['content 1', 'content 2'],
        },
        settings: {
          theme: 'dark',
        },
      });
      expect(result.endsWith('\n')).toBe(true);
    });

    it('should handle null values', () => {
      const data = { key: null };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "key": null\n}\n');
    });

    it('should handle boolean values', () => {
      const data = { enabled: true, disabled: false };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "enabled": true,\n  "disabled": false\n}\n');
    });

    it('should handle number values', () => {
      const data = { count: 42, price: 99.99 };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "count": 42,\n  "price": 99.99\n}\n');
    });

    it('should handle arrays with objects', () => {
      const data = {
        'users\x000\0name': 'John',
        'users\x001\0name': 'Jane',
      };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        users: [{ name: 'John' }, { name: 'Jane' }],
      });
    });
  });

  describe('numeric string keys preservation', () => {
    it('should round-trip objects with numeric string keys without converting to arrays', () => {
      const original = {
        product: {
          '0': { title: 'Multi-BM Ecosystem' },
          '1': { title: 'Bulk Campaign Launcher' },
        },
      };
      const content = JSON.stringify(original);
      const flattened = parser.parse(content);
      const serialized = parser.serialize(flattened, { indentation: 2, trailingNewline: '' });
      const reparsed = JSON.parse(serialized);

      expect(reparsed).toEqual(original);
      expect(reparsed.product).not.toBeInstanceOf(Array);
    });

    it('should round-trip mixed arrays and numeric-key objects side by side', () => {
      const original = {
        items: ['a', 'b'],
        lookup: { '0': 'zero', '1': 'one' },
      };
      const content = JSON.stringify(original);
      const flattened = parser.parse(content);
      const serialized = parser.serialize(flattened, { indentation: 2, trailingNewline: '' });
      const reparsed = JSON.parse(serialized);

      expect(reparsed).toEqual(original);
      expect(Array.isArray(reparsed.items)).toBe(true);
      expect(reparsed.lookup).not.toBeInstanceOf(Array);
    });

    it('should round-trip deeply nested numeric-key objects', () => {
      const original = {
        level1: {
          level2: {
            '0': { name: 'first' },
            '1': { name: 'second' },
          },
        },
      };
      const content = JSON.stringify(original);
      const flattened = parser.parse(content);
      const serialized = parser.serialize(flattened, { indentation: 2, trailingNewline: '' });
      const reparsed = JSON.parse(serialized);

      expect(reparsed).toEqual(original);
    });
  });

  describe('getFallback', () => {
    it('should return empty JSON object string', () => {
      const result = parser.getFallback();

      expect(result).toBe('{}');
    });
  });
});
