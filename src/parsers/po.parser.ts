import * as gettextParser from 'gettext-parser';
import type { Parser } from '../interface/parser.js';
import type { PoKey, PoParserOptionsType } from './parser.types.js';

/**
 * PO (Portable Object) parser for handling gettext translation files.
 *
 * This parser converts PO files into simple key-value translation mappings and vice versa.
 * It flattens the PO structure (including contexts and plurals) into JSON-serialized keys
 * to allow the translation engine to handle them transparently.
 *
 * IMPORTANT: This parser is stateful. It stores headers and charset from the parsed file
 * to ensure they are preserved when serializing the translated file.
 * Therefore, a new instance of this class MUST be created for each source file being processed.
 * Do not reuse the same instance across multiple files.
 */
export class PoParser implements Parser<Record<string, unknown>, PoParserOptionsType> {
  // Set foldLength to 0 to completely disable the wrapping of the lines in the generated PO file.
  private readonly foldLength: number = 0;
  private readonly fallbackContent: string = 'msgid ""\nmsgstr ""\n';
  private charset: string = 'utf-8';
  private headers: Record<string, string> = {};

  /**
   * A classic problem with PO parsers is that they tend to group translations by context,
   * distorting the order of the original file. This is a heuristic scan to preserve the relative order of messages.
   *
   * @param content - The content of the PO file as a string
   * @returns A map of (context + msgid) -> order index
   */
  private buildOrderMap(content: string): Map<string, number> {
    const map = new Map<string, number>();
    const lines = content.split(/\r?\n/);
    let currentContext = '';
    let orderIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) {
        continue;
      }

      // Match msgctxt "..."
      if (line.startsWith('msgctxt')) {
        const match = line.match(/^msgctxt\s+"(.*)"/);
        if (match) {
          // Basic extraction - limitation: doesn't handle multiline strings perfectly
          // but typically msgctxt is single line.
          // For robustness, we could use a more complex parser,
          // but we assume standard format for order detection.
          currentContext = match[1] || '';
        }
      } else if (line.startsWith('msgid')) {
        const match = line.match(/^msgid\s+"(.*)"/);
        if (match) {
          const msgid = match[1] || '';
          // Only track real messages, not the header (msgid "")
          if (msgid !== '' || currentContext !== '') {
            const key = this.getOrderKey(currentContext, msgid);
            if (!map.has(key)) {
              map.set(key, orderIndex++);
            }
          }
          // Reset context after finding a msgid (next message starts fresh)
          currentContext = '';
        }
      }
    }
    return map;
  }

  private getOrderKey(context: string, msgid: string): string {
    return `${context}\u0004${msgid}`;
  }

  /**
   * Parses the content of a PO (Portable Object) file and extracts translations
   * as a simple key-value mapping.
   *
   * Keys are JSON-serialized objects containing metadata (msgid, context, plural info).
   * Values are the translated strings (msgstr).
   *
   * @param content - The content of the PO file as a Buffer or string
   * @param options - Optional parsing options (unused in PO parser)
   * @returns A record mapping serialized keys to their translated strings
   */
  parse(content: Buffer | string): Record<string, unknown> {
    let parsed;
    try {
      parsed = gettextParser.po.parse(content);
    } catch (error) {
      console.error('Failed to parse PO file content', error);
      return {};
    }

    // Preserve existing headers if parsed headers are empty or undefined
    if (parsed.headers && Object.keys(parsed.headers).length > 0) {
      this.headers = parsed.headers;
    }

    // Preserve existing charset if parsed charset is empty or undefined
    if (parsed.charset && parsed.charset.trim() !== '') {
      this.charset = parsed.charset;
    }

    // Step 1: Scan the file to determine the order of messages
    const contentStr = content.toString();
    const orderMap = this.buildOrderMap(contentStr);

    const translations: Record<string, unknown> = {};
    const contexts = parsed.translations;

    for (const context in contexts) {
      const messages = contexts[context];
      for (const msgid in messages) {
        if (!msgid || msgid === '') {
          continue;
        }

        const message = messages[msgid];
        if (!message) {
          continue;
        }

        const msgstr = message.msgstr;
        const msgctxt = message.msgctxt || '';

        // Get order index from map or fallback to default (end)
        const orderKey = this.getOrderKey(msgctxt, msgid);
        const order = orderMap.get(orderKey);

        // Handle singular (index 0)
        if (msgstr.length > 0) {
          const keyObj: PoKey = {
            msgid: message.msgid,
            msgctxt: message.msgctxt,
            msgid_plural: message.msgid_plural,
            idx: 0,
            order: order,
          };
          translations[JSON.stringify(keyObj)] = msgstr[0] || '';
        }

        // Handle plurals (index 1+)
        // Only if msgid_plural is present, we consider it might have plural forms
        if (message.msgid_plural && msgstr.length > 1) {
          for (let i = 1; i < msgstr.length; i++) {
            const keyObj: PoKey = {
              msgid: message.msgid,
              msgctxt: message.msgctxt,
              msgid_plural: message.msgid_plural,
              idx: i,
              order: order,
            };
            translations[JSON.stringify(keyObj)] = msgstr[i] || '';
          }
        }
      }
    }

    return translations;
  }

  /**
   * Serializes a simple key-value translation object into a PO (Portable Object) file.
   *
   * @param data - A record mapping serialized keys to their translated strings
   * @param options - Optional serialization options
   * @returns A Buffer containing the compiled PO file
   */
  serialize(data: Record<string, unknown>, options: PoParserOptionsType): Buffer {
    // Update headers based on options and defaults
    if (options?.targetLocale) {
      this.headers['Language'] = options.targetLocale;
    }

    // Set PO-Revision-Date to now
    const now = new Date();
    const iso = now.toISOString(); // 2023-01-01T12:00:00.000Z
    // Basic conversion to PO date format (approximate but valid)
    const dateStr = iso.replace('T', ' ').replace(/\.\d+Z$/, '+0000');
    this.headers['PO-Revision-Date'] = dateStr;

    // Update generator
    this.headers['X-Generator'] = 'Lara-CLI';

    // Clear plural forms to avoid inheriting incorrect rules for new language
    // unless we specifically knew them. Safer to clear than to be wrong.
    if (this.headers['Plural-Forms']) {
      delete this.headers['Plural-Forms'];
    }

    const poData: gettextParser.GetTextTranslations = {
      charset: this.charset,
      headers: this.headers,
      translations: {},
    };

    // Sort keys based on the captured 'order' property
    const sortedKeys = Object.keys(data).sort((a, b) => {
      try {
        const keyA = JSON.parse(a) as PoKey;
        const keyB = JSON.parse(b) as PoKey;

        const orderA = keyA.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = keyB.order ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) return orderA - orderB;

        // Secondary sort: index (plural forms order)
        const idxA = keyA.idx ?? 0;
        const idxB = keyB.idx ?? 0;
        return idxA - idxB;
      } catch {
        return 0;
      }
    });

    for (const serializedKey of sortedKeys) {
      try {
        const keyObj: PoKey = JSON.parse(serializedKey);
        const msgstrValue =
          typeof data[serializedKey] === 'string'
            ? (data[serializedKey] as string)
            : String(data[serializedKey] ?? '');

        const context = keyObj.msgctxt || '';

        // Ensure context exists in translations
        if (!poData.translations[context]) {
          poData.translations[context] = {};
        }

        const msgid = keyObj.msgid;

        // Initialize message object if not exists
        if (!poData.translations[context][msgid]) {
          poData.translations[context][msgid] = {
            msgid: msgid,
            msgctxt: keyObj.msgctxt,
            msgid_plural: keyObj.msgid_plural,
            msgstr: [],
          };
        }

        const message = poData.translations[context][msgid];
        const idx = keyObj.idx || 0;

        // Ensure the array is large enough
        if (message.msgstr.length <= idx) {
          // Fill holes with empty strings if necessary
          while (message.msgstr.length < idx) {
            message.msgstr.push('');
          }
          message.msgstr[idx] = msgstrValue;
        } else {
          message.msgstr[idx] = msgstrValue;
        }
      } catch {
        // Fallback for non-JSON keys
        continue;
      }
    }

    return gettextParser.po.compile(poData, { foldLength: this.foldLength });
  }

  /**
   * Returns the fallback content for a PO file.
   */
  getFallback(): string {
    return this.fallbackContent;
  }
}
