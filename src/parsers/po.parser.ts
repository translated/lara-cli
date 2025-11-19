import * as gettextParser from 'gettext-parser';
import type { Parser } from '../interface/parser.js';

/**
 * PO (Portable Object) parser for handling gettext translation files.
 *
 * This parser converts PO files into simple key-value translation mappings and vice versa.
 * It only handles translations from the default (empty string) context and does not
 * handle plural forms or multiple contexts.
 *
 * @example
 * const parser = new PoParser('utf-8', { 'Project-Id-Version': 'MyApp 1.0' });
 * const translations = parser.parse(poFileBuffer);
 * // Returns: { "Hello": "Ciao", "Welcome": "Benvenuto" }
 *
 * const poBuffer = parser.serialize(translations);
 */
export class PoParser implements Parser<Record<string, unknown>, void> {
  private charset: string;
  private headers: Record<string, string>;
  private foldLength: number;

  /**
   * Creates a new PoParser instance.
   *
   * @param charset - The character encoding for the PO file (e.g., 'utf-8', 'iso-8859-1')
   * @param headers - PO file headers as key-value pairs (e.g., Project-Id-Version, Language, etc.)
   * @param foldLength - The length of the line after which the text should be folded (default: 78)
   */
  constructor(
    charset: string = 'utf-8',
    headers: Record<string, string> = {},
    foldLength: number = 300
  ) {
    this.charset = charset;
    this.headers = headers;
    this.foldLength = foldLength;
  }

  /**
   * Parses the content of a PO (Portable Object) file and extracts translations
   * from the default context as a simple key-value mapping.
   *
   * @param content - The content of the PO file as a Buffer or string
   * @returns A record mapping message IDs (msgid) to their translated strings (msgstr)
   *
   * @example
   * Input PO file:
   * msgid "Hello"
   * msgstr "Ciao"
   *
   * msgid "Welcome"
   * msgstr "Benvenuto"
   *
   * Output:
   * {
   *   "Hello": "Ciao",
   *   "Welcome": "Benvenuto",
   * }
   */
  parse(content: Buffer | string): Record<string, unknown> {
    const parsed = gettextParser.po.parse(content);

    // Preserve existing headers if parsed headers are empty or undefined
    if (parsed.headers && Object.keys(parsed.headers).length > 0) {
      this.headers = parsed.headers;
    }

    // Preserve existing charset if parsed charset is empty or undefined
    if (parsed.charset && parsed.charset.trim() !== '') {
      this.charset = parsed.charset;
    }

    const translations: Record<string, unknown> = {};
    const messages = parsed.translations[''];

    for (const msgid in messages) {
      if (msgid && msgid !== '' && messages[msgid]) {
        translations[msgid] = messages[msgid].msgstr[0] || '';
      }
    }

    return translations;
  }

  /**
   * Serializes a simple key-value translation object into a PO (Portable Object) file.
   *
   * @param data - A record mapping message IDs (msgid) to their translated strings (msgstr)
   * @returns A Buffer containing the compiled PO file
   *
   * @example
   * Input:
   * {
   *   "Hello": "Ciao",
   *   "Welcome": "Benvenuto",
   * }
   *
   * Output PO file:
   * msgid "Hello"
   * msgstr "Ciao"
   *
   * msgid "Welcome"
   * msgstr "Benvenuto"
   */
  serialize(data: Record<string, unknown>): Buffer {
    const poData: gettextParser.GetTextTranslations = {
      charset: this.charset,
      headers: this.headers,
      translations: { '': {} },
    };

    for (const msgid in data) {
      if (msgid) {
        const msgstr = typeof data[msgid] === 'string' ? data[msgid] : String(data[msgid] || '');
        poData.translations['']![msgid] = {
          msgid: msgid,
          msgstr: [msgstr],
        };
      }
    }

    return gettextParser.po.compile(poData, { foldLength: this.foldLength });
  }
}
