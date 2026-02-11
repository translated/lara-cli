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

      expect(result).toEqual({ 'dashboard/title': 'Dashboard' });
    });

    it('should flatten deeply nested objects', () => {
      const content = '{"level1": {"level2": {"level3": {"key": "value"}}}}';
      const result = parser.parse(content);

      expect(result).toEqual({ 'level1/level2/level3/key': 'value' });
    });

    it('should flatten arrays', () => {
      const content = '{"items": ["item1", "item2", "item3"]}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'items/0': 'item1',
        'items/1': 'item2',
        'items/2': 'item3',
      });
    });

    it('should flatten nested objects with arrays', () => {
      const content =
        '{"dashboard": {"title": "Dashboard", "content": ["content 1", "content 2"]}}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'dashboard/title': 'Dashboard',
        'dashboard/content/0': 'content 1',
        'dashboard/content/1': 'content 2',
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
        'array/0': 1,
        'array/1': 2,
        'object/nested': 'value',
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

      expect(result).toEqual({ 'parent/child': {} });
    });

    it('should handle arrays with objects', () => {
      const content = '{"users": [{"name": "John"}, {"name": "Jane"}]}';
      const result = parser.parse(content);

      expect(result).toEqual({
        'users/0/name': 'John',
        'users/1/name': 'Jane',
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
  });

  describe('serialize', () => {
    it('should serialize a simple flattened object', () => {
      const data = { key: 'value' };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "key": "value"\n}\n');
    });

    it('should unflatten and serialize nested objects', () => {
      const data = { 'dashboard/title': 'Dashboard' };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      expect(result).toBe('{\n  "dashboard": {\n    "title": "Dashboard"\n  }\n}\n');
    });

    it('should unflatten and serialize arrays', () => {
      const data = {
        'items/0': 'item1',
        'items/1': 'item2',
        'items/2': 'item3',
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
        'dashboard/title': 'Dashboard',
        'dashboard/content/0': 'content 1',
        'dashboard/content/1': 'content 2',
        'settings/theme': 'dark',
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
        'users/0/name': 'John',
        'users/1/name': 'Jane',
      };
      const options = { indentation: 2, trailingNewline: '\n' };
      const result = parser.serialize(data, options);

      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        users: [{ name: 'John' }, { name: 'Jane' }],
      });
    });
  });

  describe('getFallback', () => {
    it('should return empty JSON object string', () => {
      const result = parser.getFallback();

      expect(result).toBe('{}');
    });
  });
});
