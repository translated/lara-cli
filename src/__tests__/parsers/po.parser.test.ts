import { describe, it, expect, beforeEach } from 'vitest';
import { PoParser } from '../../parsers/po.parser.js';

describe('PoParser', () => {
  let parser: PoParser;

  beforeEach(() => {
    parser = new PoParser();
  });

  describe('parse', () => {
    it('should parse a simple PO message', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      const result = parser.parse(content);

      const expectedKey = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });

      expect(result).toHaveProperty(expectedKey);
      expect(result[expectedKey]).toBe('Ciao');
    });

    it('should parse multiple messages', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"

        msgid "World"
        msgstr "Mondo"
        `;

      const result = parser.parse(content);

      const key1 = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });

      const key2 = JSON.stringify({
        msgid: 'World',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 1,
      });

      expect(result[key1]).toBe('Ciao');
      expect(result[key2]).toBe('Mondo');
    });

    it('should parse messages with context', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgctxt "Menu"
        msgid "File"
        msgstr "File"

        msgctxt "Button"
        msgid "File"
        msgstr "File"
        `;

      const result = parser.parse(content);

      const key1 = JSON.stringify({
        msgid: 'File',
        msgctxt: 'Menu',
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });

      const key2 = JSON.stringify({
        msgid: 'File',
        msgctxt: 'Button',
        msgid_plural: undefined,
        idx: 0,
        order: 1,
      });

      expect(result[key1]).toBe('File');
      expect(result[key2]).toBe('File');
    });

    it('should parse plural forms', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"
        "Plural-Forms: nplurals=2; plural=(n != 1);\\n"

        msgid "One item"
        msgid_plural "Many items"
        msgstr[0] "Un elemento"
        msgstr[1] "Molti elementi"
        `;

      const result = parser.parse(content);

      const key0 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 0,
        order: 0,
      });

      const key1 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 1,
        order: 0,
      });

      expect(result[key0]).toBe('Un elemento');
      expect(result[key1]).toBe('Molti elementi');
    });

    it('should parse plural forms with context', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgctxt "Shopping"
        msgid "One item"
        msgid_plural "Many items"
        msgstr[0] "Un articolo"
        msgstr[1] "Molti articoli"
        `;

      const result = parser.parse(content);

      const key0 = JSON.stringify({
        msgid: 'One item',
        msgctxt: 'Shopping',
        msgid_plural: 'Many items',
        idx: 0,
        order: 0,
      });

      const key1 = JSON.stringify({
        msgid: 'One item',
        msgctxt: 'Shopping',
        msgid_plural: 'Many items',
        idx: 1,
        order: 0,
      });

      expect(result[key0]).toBe('Un articolo');
      expect(result[key1]).toBe('Molti articoli');
    });

    it('should preserve order of messages', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "First"
        msgstr "Primo"

        msgid "Second"
        msgstr "Secondo"

        msgid "Third"
        msgstr "Terzo"
        `;

      const result = parser.parse(content);

      const keys = Object.keys(result);
      const parsedKeys = keys.map((k) => JSON.parse(k));

      parsedKeys.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      expect(parsedKeys[0]?.msgid).toBe('First');
      expect(parsedKeys[1]?.msgid).toBe('Second');
      expect(parsedKeys[2]?.msgid).toBe('Third');
    });

    it('should handle empty PO file', () => {
      const content = `msgid ""
        msgstr ""
        `;

      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should preserve headers and charset', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=ISO-8859-1\\n"
        "Language: it\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(content);

      // Headers and charset are stored internally, we can verify by serializing
      const data = parser.parse(content);
      const serialized = parser.serialize(data, { targetLocale: 'it' });
      const serializedStr = serialized.toString();

      expect(serializedStr).toContain('charset=iso-8859-1');
    });

    it('should handle messages with empty msgstr', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Untranslated"
        msgstr ""
        `;

      const result = parser.parse(content);

      const key = JSON.stringify({
        msgid: 'Untranslated',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });

      expect(result[key]).toBe('');
    });

    it('should handle multiline msgstr', () => {
      const content = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Multiline"
        msgstr ""
        "First line\\n"
        "Second line"
        `;

      const result = parser.parse(content);

      const key = JSON.stringify({
        msgid: 'Multiline',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });

      expect(result[key]).toContain('First line');
      expect(result[key]).toContain('Second line');
    });

    it('should skip empty msgid entries', () => {
      const content = `msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      const result = parser.parse(content);

      const keys = Object.keys(result);
      const hasEmptyMsgid = keys.some((k) => {
        const parsed = JSON.parse(k);
        return parsed.msgid === '' && !parsed.msgctxt;
      });

      expect(hasEmptyMsgid).toBe(false);
    });
  });

  describe('serialize', () => {
    it('should serialize a simple message', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Bonjour';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgid "Hello"');
      expect(resultStr).toContain('msgstr "Bonjour"');
      expect(resultStr).toContain('Language: fr');
    });

    it('should serialize multiple messages', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"

        msgid "World"
        msgstr "Mondo"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key1 = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      const key2 = JSON.stringify({
        msgid: 'World',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 1,
      });
      data[key1] = 'Bonjour';
      data[key2] = 'Monde';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgid "Hello"');
      expect(resultStr).toContain('msgstr "Bonjour"');
      expect(resultStr).toContain('msgid "World"');
      expect(resultStr).toContain('msgstr "Monde"');
    });

    it('should serialize messages with context', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgctxt "Menu"
        msgid "File"
        msgstr "File"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'File',
        msgctxt: 'Menu',
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Fichier';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgctxt "Menu"');
      expect(resultStr).toContain('msgid "File"');
      expect(resultStr).toContain('msgstr "Fichier"');
    });

    it('should serialize plural forms', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "One item"
        msgid_plural "Many items"
        msgstr[0] "Un elemento"
        msgstr[1] "Molti elementi"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key0 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 0,
        order: 0,
      });
      const key1 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 1,
        order: 0,
      });
      data[key0] = 'Un article';
      data[key1] = 'Plusieurs articles';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgid "One item"');
      expect(resultStr).toContain('msgid_plural "Many items"');
      expect(resultStr).toContain('msgstr[0] "Un article"');
      expect(resultStr).toContain('msgstr[1] "Plusieurs articles"');
    });

    it('should preserve order when serializing', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "First"
        msgstr "Primo"

        msgid "Second"
        msgstr "Secondo"

        msgid "Third"
        msgstr "Terzo"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key1 = JSON.stringify({
        msgid: 'First',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      const key2 = JSON.stringify({
        msgid: 'Second',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 1,
      });
      const key3 = JSON.stringify({
        msgid: 'Third',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 2,
      });
      data[key1] = 'Premier';
      data[key2] = 'Deuxième';
      data[key3] = 'Troisième';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      // Check order by finding positions
      const firstPos = resultStr.indexOf('msgid "First"');
      const secondPos = resultStr.indexOf('msgid "Second"');
      const thirdPos = resultStr.indexOf('msgid "Third"');

      expect(firstPos).toBeLessThan(secondPos);
      expect(secondPos).toBeLessThan(thirdPos);
    });

    it('should update headers with targetLocale', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Bonjour';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('Language: fr');
    });

    it('should update PO-Revision-Date header', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Bonjour';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toMatch(/PO-Revision-Date: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{4}/);
    });

    it('should update X-Generator header', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Bonjour';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('X-Generator: Lara-CLI');
    });

    it('should remove Plural-Forms header', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"
        "Plural-Forms: nplurals=2; plural=(n != 1);\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Bonjour';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).not.toContain('Plural-Forms:');
    });

    it('should handle empty data object', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgid ""');
      expect(resultStr).toContain('msgstr ""');
    });

    it('should handle non-string values by converting to string', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 123; // Number instead of string

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgstr "123"');
    });

    it('should handle plural forms with correct index ordering', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"

        msgid "One item"
        msgid_plural "Many items"
        msgstr[0] "Un elemento"
        msgstr[1] "Molti elementi"
        msgstr[2] "Altri elementi"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key0 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 0,
        order: 0,
      });
      const key1 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 1,
        order: 0,
      });
      const key2 = JSON.stringify({
        msgid: 'One item',
        msgctxt: undefined,
        msgid_plural: 'Many items',
        idx: 2,
        order: 0,
      });
      data[key0] = 'Un';
      data[key1] = 'Deux';
      data[key2] = 'Trois';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      // Check that indices are in correct order
      const idx0Pos = resultStr.indexOf('msgstr[0]');
      const idx1Pos = resultStr.indexOf('msgstr[1]');
      const idx2Pos = resultStr.indexOf('msgstr[2]');

      expect(idx0Pos).toBeLessThan(idx1Pos);
      expect(idx1Pos).toBeLessThan(idx2Pos);
    });

    it('should preserve charset from original file', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=ISO-8859-1\\n"

        msgid "Hello"
        msgstr "Ciao"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        order: 0,
      });
      data[key] = 'Bonjour';

      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('charset=iso-8859-1');
    });

    it('should handle messages with missing order property', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {};
      const key = JSON.stringify({
        msgid: 'Hello',
        msgctxt: undefined,
        msgid_plural: undefined,
        idx: 0,
        // order is missing
      });
      data[key] = 'Bonjour';

      // Should not throw
      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      expect(resultStr).toContain('msgid "Hello"');
    });

    it('should skip invalid JSON keys', () => {
      const originalContent = `
        msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=UTF-8\\n"
        `;

      parser.parse(originalContent);

      const data: Record<string, unknown> = {
        'invalid-json-key': 'value',
        'another-invalid': 'value2',
      };

      // Should not throw
      const result = parser.serialize(data, { targetLocale: 'fr' });
      const resultStr = result.toString();

      // Should not contain the invalid keys
      expect(resultStr).not.toContain('invalid-json-key');
      expect(resultStr).not.toContain('another-invalid');
    });
  });

  describe('getFallback', () => {
    it('should return default PO template', () => {
      const result = parser.getFallback();

      expect(result).toBe('msgid ""\nmsgstr ""\n');
    });
  });
});
