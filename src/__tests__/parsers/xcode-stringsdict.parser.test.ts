import { describe, it, expect, beforeEach } from 'vitest';
import { XcodeStringsdictParser } from '../../parsers/xcode-stringsdict.parser.js';
import type { XcodeStringsdictParserOptionsType } from '../../parsers/parser.types.js';

describe('XcodeStringsdictParser', () => {
  let parser: XcodeStringsdictParser;

  beforeEach(() => {
    parser = new XcodeStringsdictParser();
  });

  describe('parse', () => {
    it('should parse a single plural entry with one variable', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'item_count/one': '%d item',
        'item_count/other': '%d items',
      });
    });

    it('should parse all CLDR plural categories', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>zero</key>
            <string>No items</string>
            <key>one</key>
            <string>%d item</string>
            <key>two</key>
            <string>%d items (two)</string>
            <key>few</key>
            <string>%d items (few)</string>
            <key>many</key>
            <string>%d items (many)</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'item_count/zero': 'No items',
        'item_count/one': '%d item',
        'item_count/two': '%d items (two)',
        'item_count/few': '%d items (few)',
        'item_count/many': '%d items (many)',
        'item_count/other': '%d items',
      });
    });

    it('should parse multiple plural entries', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'item_count/one': '%d item',
        'item_count/other': '%d items',
        'day_count/one': '%d day',
        'day_count/other': '%d days',
      });
    });

    it('should parse multi-variable entries with correct key flattening', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>transfer</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@files@ in %#@folders@</string>
        <key>files</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d file</string>
            <key>other</key>
            <string>%d files</string>
        </dict>
        <key>folders</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d folder</string>
            <key>other</key>
            <string>%d folders</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'transfer/files/one': '%d file',
        'transfer/files/other': '%d files',
        'transfer/folders/one': '%d folder',
        'transfer/folders/other': '%d folders',
      });
    });

    it('should return empty object for empty plist', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`;
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should not include metadata keys in output', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const result = parser.parse(content);
      const keys = Object.keys(result);

      expect(keys).not.toContain('NSStringLocalizedFormatKey');
      expect(keys).not.toContain('NSStringFormatSpecTypeKey');
      expect(keys).not.toContain('NSStringFormatValueTypeKey');
      expect(keys).not.toContain('item_count/NSStringLocalizedFormatKey');
      expect(keys).not.toContain('item_count/items/NSStringFormatSpecTypeKey');
      expect(keys).not.toContain('item_count/items/NSStringFormatValueTypeKey');

      // Only translatable plural form keys should be present
      expect(keys).toEqual(['item_count/one', 'item_count/other']);
    });

    it('should handle Buffer input', () => {
      const content = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`);
      const result = parser.parse(content);

      expect(result).toEqual({
        'item_count/one': '%d item',
        'item_count/other': '%d items',
      });
    });

    it('should return empty object for invalid XML content', () => {
      const content = 'this is not valid xml at all';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should return empty object for empty string', () => {
      const result = parser.parse('');

      expect(result).toEqual({});
    });

    it('should handle special characters in values (XML entities)', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>message_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@messages@</string>
        <key>messages</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d message &amp; attachment</string>
            <key>other</key>
            <string>%d messages &amp; attachments</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const result = parser.parse(content);

      expect(result).toEqual({
        'message_count/one': '%d message & attachment',
        'message_count/other': '%d messages & attachments',
      });
    });
  });

  describe('serialize', () => {
    it('should serialize translated plural forms back to valid plist XML', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const data = {
        'item_count/one': '%d elemento',
        'item_count/other': '%d elementos',
      };
      const result = parser.serialize(data, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<string>%d elemento</string>');
      expect(resultStr).toContain('<string>%d elementos</string>');
    });

    it('should preserve plist structure (XML declaration, DOCTYPE, plist wrapper)', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const data = {
        'item_count/one': '%d item',
        'item_count/other': '%d items',
      };
      const result = parser.serialize(data, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(resultStr).toContain(
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
      );
      expect(resultStr).toContain('<plist version="1.0">');
      expect(resultStr).toContain('</plist>');
    });

    it('should preserve metadata keys unchanged', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const data = {
        'item_count/one': '%d elemento',
        'item_count/other': '%d elementos',
      };
      const result = parser.serialize(data, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<key>NSStringLocalizedFormatKey</key>');
      expect(resultStr).toContain('<string>%#@items@</string>');
      expect(resultStr).toContain('<key>NSStringFormatSpecTypeKey</key>');
      expect(resultStr).toContain('<string>NSStringPluralRuleType</string>');
      expect(resultStr).toContain('<key>NSStringFormatValueTypeKey</key>');
      expect(resultStr).toContain('<string>d</string>');
    });

    it('should handle deleted entries (only entries with matching data keys are output)', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`;
      // Only provide data for item_count, not day_count
      const data = {
        'item_count/one': '%d elemento',
        'item_count/other': '%d elementos',
      };
      const result = parser.serialize(data, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('item_count');
      expect(resultStr).not.toContain('day_count');
    });

    it('should throw error when originalContent is missing', () => {
      const data = {
        'item_count/one': '%d item',
      };

      expect(() => parser.serialize(data, {} as any)).toThrow(
        'Original content is required for Xcode .stringsdict serialization'
      );
    });

    it('should serialize multi-variable entries correctly', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>transfer</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@files@ in %#@folders@</string>
        <key>files</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d file</string>
            <key>other</key>
            <string>%d files</string>
        </dict>
        <key>folders</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d folder</string>
            <key>other</key>
            <string>%d folders</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const data = {
        'transfer/files/one': '%d archivo',
        'transfer/files/other': '%d archivos',
        'transfer/folders/one': '%d carpeta',
        'transfer/folders/other': '%d carpetas',
      };
      const result = parser.serialize(data, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<string>%d archivo</string>');
      expect(resultStr).toContain('<string>%d archivos</string>');
      expect(resultStr).toContain('<string>%d carpeta</string>');
      expect(resultStr).toContain('<string>%d carpetas</string>');
      // Metadata should be preserved
      expect(resultStr).toContain('<string>%#@files@ in %#@folders@</string>');
    });

    it('should escape special characters when serializing', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>message_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@messages@</string>
        <key>messages</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d message</string>
            <key>other</key>
            <string>%d messages</string>
        </dict>
    </dict>
</dict>
</plist>`;
      const data = {
        'message_count/one': '%d message & attachment',
        'message_count/other': '%d messages & attachments',
      };
      const result = parser.serialize(data, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);

      const resultStr = result.toString();
      expect(resultStr).toContain('<string>%d message &amp; attachment</string>');
      expect(resultStr).toContain('<string>%d messages &amp; attachments</string>');
    });
  });

  describe('round-trip (parse -> serialize -> parse)', () => {
    it('should preserve single-variable plural entry through round-trip', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;

      const firstParse = parser.parse(originalContent);
      const serialized = parser.serialize(firstParse, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);
      const secondParse = parser.parse(serialized);

      expect(secondParse).toEqual(firstParse);
      expect(secondParse).toEqual({
        'item_count/one': '%d item',
        'item_count/other': '%d items',
      });
    });

    it('should preserve multi-variable entry through round-trip', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>transfer</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@files@ in %#@folders@</string>
        <key>files</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d file</string>
            <key>other</key>
            <string>%d files</string>
        </dict>
        <key>folders</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d folder</string>
            <key>other</key>
            <string>%d folders</string>
        </dict>
    </dict>
</dict>
</plist>`;

      const firstParse = parser.parse(originalContent);
      const serialized = parser.serialize(firstParse, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);
      const secondParse = parser.parse(serialized);

      expect(secondParse).toEqual(firstParse);
      expect(secondParse).toEqual({
        'transfer/files/one': '%d file',
        'transfer/files/other': '%d files',
        'transfer/folders/one': '%d folder',
        'transfer/folders/other': '%d folders',
      });
    });

    it('should preserve all CLDR plural categories through round-trip', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>zero</key>
            <string>No items</string>
            <key>one</key>
            <string>%d item</string>
            <key>two</key>
            <string>%d items (two)</string>
            <key>few</key>
            <string>%d items (few)</string>
            <key>many</key>
            <string>%d items (many)</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;

      const firstParse = parser.parse(originalContent);
      const serialized = parser.serialize(firstParse, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);
      const secondParse = parser.parse(serialized);

      expect(secondParse).toEqual(firstParse);
      expect(secondParse).toEqual({
        'item_count/zero': 'No items',
        'item_count/one': '%d item',
        'item_count/two': '%d items (two)',
        'item_count/few': '%d items (few)',
        'item_count/many': '%d items (many)',
        'item_count/other': '%d items',
      });
    });

    it('should preserve special characters through round-trip', () => {
      const originalContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>message_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@messages@</string>
        <key>messages</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d message &amp; attachment</string>
            <key>other</key>
            <string>%d messages &amp; attachments</string>
        </dict>
    </dict>
</dict>
</plist>`;

      const firstParse = parser.parse(originalContent);
      const serialized = parser.serialize(firstParse, {
        originalContent,
      } as XcodeStringsdictParserOptionsType);
      const secondParse = parser.parse(serialized);

      expect(secondParse).toEqual(firstParse);
      expect(secondParse).toEqual({
        'message_count/one': '%d message & attachment',
        'message_count/other': '%d messages & attachments',
      });
    });
  });

  describe('getFallback', () => {
    it('should return valid empty plist structure', () => {
      const result = parser.getFallback();

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain(
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
      );
      expect(result).toContain('<plist version="1.0">');
      expect(result).toContain('<dict>');
      expect(result).toContain('</dict>');
      expect(result).toContain('</plist>');
    });

    it('should return content that parses to an empty object', () => {
      const fallback = parser.getFallback();
      const result = parser.parse(fallback);

      expect(result).toEqual({});
    });
  });
});
