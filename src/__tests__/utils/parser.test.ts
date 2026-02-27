import { describe, it, expect } from 'vitest';
import {
  deepMerge,
  markNumericKeyObjects,
  restoreNumericKeys,
  NUMERIC_KEY_MARKER,
} from '#utils/parser.js';

describe('parser utils', () => {
  describe('deepMerge', () => {
    it('should merge two simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { c: 3, d: 4 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('should overwrite target properties with source properties', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should deep merge nested objects', () => {
      const target = {
        a: 1,
        nested: {
          b: 2,
          c: 3,
        },
      };
      const source = {
        nested: {
          c: 4,
          d: 5,
        },
        e: 6,
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: 1,
        nested: {
          b: 2,
          c: 4,
          d: 5,
        },
        e: 6,
      });
    });

    it('should deep merge multiple levels of nesting', () => {
      const target = {
        level1: {
          level2: {
            level3: {
              a: 1,
              b: 2,
            },
          },
        },
      };
      const source = {
        level1: {
          level2: {
            level3: {
              b: 3,
              c: 4,
            },
          },
        },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              a: 1,
              b: 3,
              c: 4,
            },
          },
        },
      });
    });

    it('should merge arrays instead of replacing them', () => {
      const target = {
        items: [1, 2, 3],
        nested: {
          arr: ['a', 'b'],
        },
      };
      const source = {
        items: [4, 5],
        nested: {
          arr: ['c'],
        },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        items: [1, 2, 3, 4, 5],
        nested: {
          arr: ['a', 'b', 'c'],
        },
      });
    });

    it('should handle null values', () => {
      const target = { a: 1, b: 2 };
      const source = { b: null, c: 3 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: null, c: 3 });
    });

    it('should handle undefined values', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined, c: 3 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: undefined, c: 3 });
    });

    it('should handle empty objects', () => {
      const target = {};
      const source = { a: 1, b: 2 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle source as empty object', () => {
      const target = { a: 1, b: 2 };
      const source = {};
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle both objects being empty', () => {
      const target = {};
      const source = {};
      const result = deepMerge(target, source);

      expect(result).toEqual({});
    });

    it('should not mutate the target object', () => {
      const target = { a: 1, b: 2 };
      const source = { c: 3 };
      const originalTarget = { ...target };
      deepMerge(target, source);

      expect(target).toEqual(originalTarget);
    });

    it('should handle null target', () => {
      const target = null as unknown as Record<string, unknown>;
      const source = { a: 1, b: 2 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should return source when source is null', () => {
      const target = { a: 1, b: 2 };
      const source = null as unknown as Record<string, unknown>;
      const result = deepMerge(target, source);

      // Implementation returns source when source is null or not an object
      expect(result).toBeNull();
    });

    it('should handle non-object target', () => {
      const target = 'not an object' as unknown as Record<string, unknown>;
      const source = { a: 1, b: 2 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle mixed types in nested objects', () => {
      const target = {
        nested: {
          string: 'hello',
          number: 42,
          boolean: true,
          array: [1, 2],
        },
      };
      const source = {
        nested: {
          string: 'world',
          number: 100,
          boolean: false,
          array: [3, 4, 5],
        },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        nested: {
          string: 'world',
          number: 100,
          boolean: false,
          array: [1, 2, 3, 4, 5],
        },
      });
    });

    it('should handle objects with same keys at different levels', () => {
      const target = {
        key: 'target-top',
        nested: {
          key: 'target-nested',
        },
      };
      const source = {
        key: 'source-top',
        nested: {
          key: 'source-nested',
        },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        key: 'source-top',
        nested: {
          key: 'source-nested',
        },
      });
    });

    it('should handle complex real-world scenario', () => {
      const target = {
        app: {
          name: 'MyApp',
          version: '1.0.0',
          config: {
            theme: 'light',
            language: 'en',
          },
          features: {
            auth: true,
            notifications: false,
          },
        },
        user: {
          name: 'John',
        },
      };
      const source = {
        app: {
          version: '2.0.0',
          config: {
            theme: 'dark',
          },
          features: {
            notifications: true,
            analytics: true,
          },
        },
        user: {
          email: 'john@example.com',
        },
      };
      const result = deepMerge(target, source);

      expect(result).toEqual({
        app: {
          name: 'MyApp',
          version: '2.0.0',
          config: {
            theme: 'dark',
            language: 'en',
          },
          features: {
            auth: true,
            notifications: true,
            analytics: true,
          },
        },
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      });
    });
  });

  describe('markNumericKeyObjects', () => {
    it('should prefix keys in objects with numeric keys', () => {
      const input = { '0': 'a', '1': 'b' };
      const result = markNumericKeyObjects(input);
      expect(result).toEqual({
        [`${NUMERIC_KEY_MARKER}0`]: 'a',
        [`${NUMERIC_KEY_MARKER}1`]: 'b',
      });
    });

    it('should leave actual arrays unchanged', () => {
      const input = ['a', 'b', 'c'];
      const result = markNumericKeyObjects(input);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should prefix all keys when at least one is numeric', () => {
      const input = { '0': 'a', title: 'hello' };
      const result = markNumericKeyObjects(input);
      expect(result).toEqual({
        [`${NUMERIC_KEY_MARKER}0`]: 'a',
        [`${NUMERIC_KEY_MARKER}title`]: 'hello',
      });
    });

    it('should not prefix keys in objects without numeric keys', () => {
      const input = { title: 'hello', desc: 'world' };
      const result = markNumericKeyObjects(input);
      expect(result).toEqual({ title: 'hello', desc: 'world' });
    });

    it('should handle deeply nested objects with numeric keys', () => {
      const input = {
        product: {
          '0': { title: 'First' },
          '1': { title: 'Second' },
        },
      };
      const result = markNumericKeyObjects(input);
      expect(result).toEqual({
        product: {
          [`${NUMERIC_KEY_MARKER}0`]: { title: 'First' },
          [`${NUMERIC_KEY_MARKER}1`]: { title: 'Second' },
        },
      });
    });

    it('should handle empty objects and arrays', () => {
      expect(markNumericKeyObjects({})).toEqual({});
      expect(markNumericKeyObjects([])).toEqual([]);
    });

    it('should return primitives as-is', () => {
      expect(markNumericKeyObjects('hello')).toBe('hello');
      expect(markNumericKeyObjects(42)).toBe(42);
      expect(markNumericKeyObjects(null)).toBeNull();
      expect(markNumericKeyObjects(undefined)).toBeUndefined();
    });
  });

  describe('restoreNumericKeys', () => {
    it('should strip marker prefix from keys', () => {
      const input = {
        [`${NUMERIC_KEY_MARKER}0`]: 'a',
        [`${NUMERIC_KEY_MARKER}1`]: 'b',
      };
      const result = restoreNumericKeys(input);
      expect(result).toEqual({ '0': 'a', '1': 'b' });
    });

    it('should not modify keys without marker prefix', () => {
      const input = { title: 'hello', desc: 'world' };
      const result = restoreNumericKeys(input);
      expect(result).toEqual({ title: 'hello', desc: 'world' });
    });

    it('should handle deeply nested marked objects', () => {
      const input = {
        product: {
          [`${NUMERIC_KEY_MARKER}0`]: { [`${NUMERIC_KEY_MARKER}title`]: 'First' },
          [`${NUMERIC_KEY_MARKER}1`]: { [`${NUMERIC_KEY_MARKER}title`]: 'Second' },
        },
      };
      const result = restoreNumericKeys(input);
      expect(result).toEqual({
        product: {
          '0': { title: 'First' },
          '1': { title: 'Second' },
        },
      });
    });

    it('should handle arrays containing marked objects', () => {
      const input = [{ [`${NUMERIC_KEY_MARKER}0`]: 'a' }, { normal: 'b' }];
      const result = restoreNumericKeys(input);
      expect(result).toEqual([{ '0': 'a' }, { normal: 'b' }]);
    });
  });
});
