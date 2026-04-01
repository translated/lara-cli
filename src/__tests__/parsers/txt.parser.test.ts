import { describe, it, expect, beforeEach } from 'vitest';
import { TxtParser } from '../../parsers/txt.parser.js';

describe('TxtParser', () => {
  let parser: TxtParser;

  beforeEach(() => {
    parser = new TxtParser();
  });

  describe('parse', () => {
    it('should parse a single line', () => {
      const content = 'Hello World';
      const result = parser.parse(content);

      expect(result).toEqual({ line_0: 'Hello World' });
    });

    it('should parse multiple lines', () => {
      const content = 'Hello World\nWelcome to our app\nGoodbye';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'Hello World',
        line_1: 'Welcome to our app',
        line_2: 'Goodbye',
      });
    });

    it('should skip empty lines between content', () => {
      const content = 'First line\n\nSecond line\n\nThird line';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'First line',
        line_1: 'Second line',
        line_2: 'Third line',
      });
    });

    it('should skip whitespace-only lines', () => {
      const content = 'First line\n   \nSecond line\n\t\nThird line';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'First line',
        line_1: 'Second line',
        line_2: 'Third line',
      });
    });

    it('should preserve leading and trailing whitespace in content lines', () => {
      const content = '  Hello World  \n  Welcome  ';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: '  Hello World  ',
        line_1: '  Welcome  ',
      });
    });

    it('should handle special characters', () => {
      const content = 'Héllo Wörld! こんにちは\nCafé & résumé';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'Héllo Wörld! こんにちは',
        line_1: 'Café & résumé',
      });
    });

    it('should parse Buffer content', () => {
      const content = Buffer.from('Hello World\nWelcome');
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'Hello World',
        line_1: 'Welcome',
      });
    });

    it('should handle empty content', () => {
      const content = '';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n   \n';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle content with only empty lines', () => {
      const content = '\n\n\n';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle trailing newline', () => {
      const content = 'Hello World\nWelcome\n';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'Hello World',
        line_1: 'Welcome',
      });
    });

    it('should handle multiple consecutive empty lines', () => {
      const content = 'First\n\n\n\nSecond';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'First',
        line_1: 'Second',
      });
    });

    it('should handle leading empty lines', () => {
      const content = '\n\nHello World';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: 'Hello World',
      });
    });

    it('should handle a single empty line', () => {
      const content = '\n';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });
  });

  describe('serialize', () => {
    it('should serialize with translated content', () => {
      const originalContent = 'Hello World\nWelcome';
      const translatedData = { line_0: 'Ciao Mondo', line_1: 'Benvenuto' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Ciao Mondo\nBenvenuto');
    });

    it('should preserve empty lines in structure', () => {
      const originalContent = 'First line\n\nSecond line\n\nThird line';
      const translatedData = {
        line_0: 'Prima riga',
        line_1: 'Seconda riga',
        line_2: 'Terza riga',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Prima riga\n\nSeconda riga\n\nTerza riga');
    });

    it('should preserve whitespace-only lines', () => {
      const originalContent = 'First\n   \nSecond';
      const translatedData = { line_0: 'Primo', line_1: 'Secondo' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Primo\n   \nSecondo');
    });

    it('should handle missing translations gracefully', () => {
      const originalContent = 'Hello World\nWelcome';
      const translatedData = {};

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Hello World\nWelcome');
    });

    it('should handle partial translations', () => {
      const originalContent = 'Hello World\nWelcome\nGoodbye';
      const translatedData = { line_0: 'Ciao Mondo' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Ciao Mondo\nWelcome\nGoodbye');
    });

    it('should handle non-string translation values by keeping original', () => {
      const originalContent = 'Hello World';
      const translatedData = { line_0: 123 as unknown };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Hello World');
    });

    it('should handle Buffer originalContent', () => {
      const originalContent = Buffer.from('Hello\nWorld');
      const translatedData = { line_0: 'Ciao', line_1: 'Mondo' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Ciao\nMondo');
    });

    it('should preserve trailing newline', () => {
      const originalContent = 'Hello World\nWelcome\n';
      const translatedData = { line_0: 'Ciao Mondo', line_1: 'Benvenuto' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Ciao Mondo\nBenvenuto\n');
    });

    it('should preserve multiple trailing empty lines', () => {
      const originalContent = 'Hello\n\n';
      const translatedData = { line_0: 'Ciao' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('Ciao\n\n');
    });

    it('should preserve leading empty lines', () => {
      const originalContent = '\n\nHello World';
      const translatedData = { line_0: 'Ciao Mondo' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('\n\nCiao Mondo');
    });

    it('should handle empty file', () => {
      const originalContent = '';
      const translatedData = {};

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result).toBe('');
    });
  });

  describe('getFallback', () => {
    it('should return empty string', () => {
      const result = parser.getFallback();

      expect(result).toBe('');
    });
  });

  describe('parse and serialize roundtrip', () => {
    it('should maintain structure through parse and serialize', () => {
      const originalContent = 'Hello World\n\nWelcome to our app.\n\nGoodbye!';

      const parsed = parser.parse(originalContent);
      const serialized = parser.serialize(parsed, { originalContent, targetLocale: 'en' });
      const reparsed = parser.parse(serialized);

      expect(Object.keys(reparsed)).toEqual(Object.keys(parsed));
      for (const key of Object.keys(parsed)) {
        expect(reparsed[key]).toBe(parsed[key]);
      }
    });

    it('should correctly apply translations in roundtrip', () => {
      const originalContent = 'Hello\n\nWelcome\nGoodbye';
      const translations = {
        line_0: 'Ciao',
        line_1: 'Benvenuto',
        line_2: 'Arrivederci',
      };

      const serialized = parser.serialize(translations, { originalContent, targetLocale: 'it' });
      const reparsed = parser.parse(serialized);

      expect(reparsed.line_0).toBe('Ciao');
      expect(reparsed.line_1).toBe('Benvenuto');
      expect(reparsed.line_2).toBe('Arrivederci');
    });

    it('should preserve empty lines through roundtrip', () => {
      const originalContent = 'Line 1\n\n\nLine 2\n\nLine 3\n';

      const parsed = parser.parse(originalContent);
      const serialized = parser.serialize(parsed, { originalContent, targetLocale: 'en' });

      expect(serialized).toBe(originalContent);
    });
  });

  describe('edge cases', () => {
    it('should handle very long lines', () => {
      const longLine = 'A'.repeat(10000);
      const content = `${longLine}\nShort line`;
      const result = parser.parse(content);

      expect(result.line_0).toBe(longLine);
      expect(result.line_1).toBe('Short line');
    });

    it('should handle lines with only special characters', () => {
      const content = '---\n***\n===';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: '---',
        line_1: '***',
        line_2: '===',
      });
    });

    it('should handle lines with tabs', () => {
      const content = '\tIndented with tab\n\t\tDouble indented';
      const result = parser.parse(content);

      expect(result).toEqual({
        line_0: '\tIndented with tab',
        line_1: '\t\tDouble indented',
      });
    });

    it('should handle content with carriage returns', () => {
      const content = 'Line 1\r\nLine 2\r\nLine 3';
      const result = parser.parse(content);

      // \r is preserved as part of the line content when splitting by \n
      expect(result.line_0).toBe('Line 1\r');
      expect(result.line_1).toBe('Line 2\r');
      expect(result.line_2).toBe('Line 3');
    });
  });
});
