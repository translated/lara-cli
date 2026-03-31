import { describe, it, expect, beforeEach } from 'vitest';
import { XcodeStringsParser } from '../../parsers/xcode-strings.parser.js';
import type { XcodeStringsParserOptionsType } from '../../parsers/parser.types.js';

describe('XcodeStringsParser', () => {
  let parser: XcodeStringsParser;

  beforeEach(() => {
    parser = new XcodeStringsParser();
  });

  describe('parse', () => {
    it('should parse simple key-value pairs', () => {
      const content = `"app_name" = "My App";
"hello" = "Hello World";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
        hello: 'Hello World',
      });
    });

    it('should parse file with C-style block comments', () => {
      const content = `/* App Name */
"app_name" = "My App";

/* Greeting message */
"hello" = "Hello World";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
        hello: 'Hello World',
      });
    });

    it('should parse file with inline comments', () => {
      const content = `// App Name
"app_name" = "My App";

// Greeting
"hello" = "Hello World";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
        hello: 'Hello World',
      });
    });

    it('should return empty object for empty file', () => {
      const result = parser.parse('');

      expect(result).toEqual({});
    });

    it('should return empty object for whitespace-only file', () => {
      const result = parser.parse('   \n\n   \t  \n');

      expect(result).toEqual({});
    });

    it('should return empty object for file with only comments', () => {
      const content = `/* This is a comment */
// This is another comment
/* Multi-line
   comment */`;
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle escaped quotes in values', () => {
      const content = `"greeting" = "Say \\"Hello\\"";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        greeting: 'Say "Hello"',
      });
    });

    it('should handle escaped quotes in keys', () => {
      const content = `"key_with_\\"quotes\\"" = "value";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'key_with_"quotes"': 'value',
      });
    });

    it('should handle escaped newlines, tabs, and carriage returns', () => {
      const content = `"multiline" = "line1\\nline2";
"tabbed" = "col1\\tcol2";
"with_cr" = "before\\rafter";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        multiline: 'line1\nline2',
        tabbed: 'col1\tcol2',
        with_cr: 'before\rafter',
      });
    });

    it('should handle escaped backslashes', () => {
      const content = `"path" = "C:\\\\Users\\\\file";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        path: 'C:\\Users\\file',
      });
    });

    it('should handle Unicode escape sequences (uppercase \\U)', () => {
      const content = `"accent" = "caf\\U00E9";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        accent: 'caf\u00E9',
      });
    });

    it('should handle Unicode escape sequences (lowercase \\u)', () => {
      const content = `"accent" = "caf\\u00e9";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        accent: 'caf\u00e9',
      });
    });

    it('should handle invalid Unicode escape sequences gracefully', () => {
      const content = `"key" = "\\Uzzzz";`;
      const result = parser.parse(content);

      // Invalid hex digits, so the backslash is kept as-is
      expect(result).toEqual({
        key: '\\Uzzzz',
      });
    });

    it('should handle empty string values', () => {
      const content = `"empty" = "";
"non_empty" = "value";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        empty: '',
        non_empty: 'value',
      });
    });

    it('should handle keys with dots and special characters', () => {
      const content = `"com.app.feature.title" = "Feature Title";
"screen_1.label" = "Label";
"key-with-dashes" = "Dashed";
"key_with_underscores" = "Underscored";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'com.app.feature.title': 'Feature Title',
        'screen_1.label': 'Label',
        'key-with-dashes': 'Dashed',
        key_with_underscores: 'Underscored',
      });
    });

    it('should handle Buffer input', () => {
      const content = Buffer.from(`"app_name" = "My App";
"hello" = "Hello World";`);
      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
        hello: 'Hello World',
      });
    });

    it('should handle whitespace variations in formatting', () => {
      const content = `"key1"="value1";
"key2"  =  "value2"  ;
  "key3"   =   "value3"  ;`;
      const result = parser.parse(content);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should handle semicolons within quoted values', () => {
      const content = `"message" = "Hello; how are you?";
"code" = "a = b; c = d;";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        message: 'Hello; how are you?',
        code: 'a = b; c = d;',
      });
    });

    it('should handle multi-line block comments', () => {
      const content = `/* This is a
   multi-line
   comment */
"key" = "value";`;
      const result = parser.parse(content);

      expect(result).toEqual({
        key: 'value',
      });
    });

    it('should associate the most recent comment with the following key', () => {
      const content = `/* First comment */
/* Second comment */
"key" = "value";`;
      const result = parser.parse(content);

      // The parser associates the last comment before a key-value pair
      expect(result).toEqual({
        key: 'value',
      });
    });
  });

  describe('serialize', () => {
    it('should serialize with original content preserving comments', () => {
      const originalContent = `/* App Name */
"app_name" = "My App";

/* Greeting */
"hello" = "Hello World";`;
      const data = {
        app_name: 'Mi App',
        hello: 'Hola Mundo',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      expect(result).toContain('/* App Name */');
      expect(result).toContain('"app_name" = "Mi App";');
      expect(result).toContain('/* Greeting */');
      expect(result).toContain('"hello" = "Hola Mundo";');
    });

    it('should preserve key order from original', () => {
      const originalContent = `"first" = "First";
"second" = "Second";
"third" = "Third";`;
      const data = {
        third: 'Tercero',
        first: 'Primero',
        second: 'Segundo',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      const firstIndex = resultStr.indexOf('"first"');
      const secondIndex = resultStr.indexOf('"second"');
      const thirdIndex = resultStr.indexOf('"third"');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('should append new keys at the end', () => {
      const originalContent = `"existing" = "Existing";`;
      const data = {
        existing: 'Existente',
        new_key: 'Nueva Clave',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      const existingIndex = resultStr.indexOf('"existing"');
      const newKeyIndex = resultStr.indexOf('"new_key"');

      expect(existingIndex).toBeLessThan(newKeyIndex);
      expect(resultStr).toContain('"new_key" = "Nueva Clave";');
    });

    it('should remove deleted keys from output', () => {
      const originalContent = `"keep" = "Keep";
"delete_me" = "Delete Me";
"also_keep" = "Also Keep";`;
      const data = {
        keep: 'Mantener',
        also_keep: 'Tambien Mantener',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"keep" = "Mantener";');
      expect(resultStr).toContain('"also_keep" = "Tambien Mantener";');
      expect(resultStr).not.toContain('delete_me');
    });

    it('should escape special characters in output', () => {
      const originalContent = `"key" = "value";`;
      const data = {
        key: 'line1\nline2\ttab\r"quoted"\\backslash',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"key" = "line1\\nline2\\ttab\\r\\"quoted\\"\\\\backslash";');
    });

    it('should throw error when originalContent is missing', () => {
      const data = { key: 'value' };

      expect(() =>
        parser.serialize(data, {} as XcodeStringsParserOptionsType)
      ).toThrow('Original content is required for Xcode .strings serialization');
    });

    it('should handle empty values', () => {
      const originalContent = `"key" = "value";`;
      const data = {
        key: '',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"key" = "";');
    });

    it('should handle null/undefined values as empty strings', () => {
      const originalContent = `"key1" = "value1";
"key2" = "value2";`;
      const data: Record<string, unknown> = {
        key1: null,
        key2: undefined,
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"key1" = "";');
      expect(resultStr).toContain('"key2" = "";');
    });

    it('should preserve inline comments in serialized output', () => {
      const originalContent = `// Section header
"key" = "value";`;
      const data = {
        key: 'valor',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('// Section header');
      expect(resultStr).toContain('"key" = "valor";');
    });

    it('should end output with a trailing newline', () => {
      const originalContent = `"key" = "value";`;
      const data = { key: 'valor' };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toMatch(/\n$/);
    });

    it('should return empty string when data is empty and all keys deleted', () => {
      const originalContent = `"key" = "value";`;
      const data = {};
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      expect(result).toBe('');
    });

    it('should escape special characters in keys', () => {
      const originalContent = `"key_with_special" = "value";`;
      const data: Record<string, unknown> = {
        'key_with_special': 'new "value" with\nnewline',
      };
      const result = parser.serialize(data, {
        originalContent,
        targetLocale: 'es',
      } as XcodeStringsParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('"key_with_special" = "new \\"value\\" with\\nnewline";');
    });
  });

  describe('getFallback', () => {
    it('should return empty string', () => {
      const result = parser.getFallback();

      expect(result).toBe('');
    });
  });
});
