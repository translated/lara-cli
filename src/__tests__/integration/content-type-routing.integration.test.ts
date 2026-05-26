import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { executeCommand, mockTranslate, mockTranslateBatchWithFallback } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plain source values (no HTML markup). Includes a curly apostrophe to mirror
// the real bug report — these characters are exactly what triggered the `??`
// corruption when Lara auto-detected the batch as HTML-flavored content.
const PLAIN_A = 'Hello world';
const PLAIN_B = 'A Customer’s continued use';

// HTML-bearing source values. Tags are chosen without inner double quotes so
// they can be embedded in any of the format-specific source files without
// escaping headaches.
const HTML_A = 'Click <a>here</a>';
const HTML_B = 'Be <b>bold</b>';

type FormatCase = {
  name: string;
  paths: string;
  setup: (dir: string) => Promise<void>;
  // Plain values are expected to be sent with the parser's default contentType.
  plainValues: string[];
  // HTML values are always expected to be sent with contentType=text/html
  // (the per-value detection overrides the parser default).
  htmlValues: string[];
  defaultContentType: 'text/plain' | 'text/html';
};

const FORMATS: FormatCase[] = [
  {
    name: 'JSON',
    paths: 'i18n/[locale].json',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'i18n'), { recursive: true });
      await writeFile(
        path.join(dir, 'i18n', 'en.json'),
        JSON.stringify({ p1: PLAIN_A, p2: PLAIN_B, h1: HTML_A, h2: HTML_B }, null, 2)
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
  {
    name: 'PO',
    paths: 'locales/[locale]/messages.po',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'locales', 'en'), { recursive: true });
      await writeFile(
        path.join(dir, 'locales', 'en', 'messages.po'),
        `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "p1"
msgstr "${PLAIN_A}"

msgid "p2"
msgstr "${PLAIN_B}"

msgid "h1"
msgstr "${HTML_A}"

msgid "h2"
msgstr "${HTML_B}"
`
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
  {
    name: 'TypeScript',
    paths: 'src/i18n.ts',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(
        path.join(dir, 'src', 'i18n.ts'),
        `const messages = {
  en: {
    p1: '${PLAIN_A}',
    p2: '${PLAIN_B}',
    h1: '${HTML_A}',
    h2: '${HTML_B}',
  },
};

export default messages;
`
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
  {
    name: 'Vue',
    paths: 'src/components/*.vue',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'src', 'components'), { recursive: true });
      await writeFile(
        path.join(dir, 'src', 'components', 'HelloWorld.vue'),
        `<template><div>x</div></template>
<i18n>
${JSON.stringify({ en: { p1: PLAIN_A, p2: PLAIN_B, h1: HTML_A, h2: HTML_B } }, null, 2)}
</i18n>
`
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
  {
    name: 'Markdown',
    paths: 'docs/[locale]/guide.md',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'docs', 'en'), { recursive: true });
      // Note: inline HTML in markdown becomes an `html` AST node and is
      // intentionally skipped by the parser. So we only assert on plain text
      // segments here — there is no path that would route a markdown value
      // through `text/html`.
      await writeFile(
        path.join(dir, 'docs', 'en', 'guide.md'),
        `# ${PLAIN_A}

${PLAIN_B}.
`
      );
    },
    plainValues: [PLAIN_A, `${PLAIN_B}.`],
    htmlValues: [],
    defaultContentType: 'text/plain',
  },
  {
    name: 'Android XML',
    paths: 'res/[locale]/strings.xml',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'res', 'en'), { recursive: true });
      // Inline `<b>` / `<a>` tags must be entity-escaped in the raw XML;
      // fast-xml-parser decodes them back to literal `<a>` / `<b>` strings
      // when the engine reads the values.
      const escape = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await writeFile(
        path.join(dir, 'res', 'en', 'strings.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="p1">${PLAIN_A}</string>
    <string name="p2">${PLAIN_B}</string>
    <string name="h1">${escape(HTML_A)}</string>
    <string name="h2">${escape(HTML_B)}</string>
</resources>
`
      );
    },
    // Android string resources legitimately allow inline HTML, so the parser's
    // default is text/html. All four values — including the plain ones —
    // should be sent with contentType=text/html.
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/html',
  },
  {
    name: 'Xcode .strings',
    paths: '[locale].lproj/Localizable.strings',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'en.lproj'), { recursive: true });
      await writeFile(
        path.join(dir, 'en.lproj', 'Localizable.strings'),
        `"p1" = "${PLAIN_A}";
"p2" = "${PLAIN_B}";
"h1" = "${HTML_A}";
"h2" = "${HTML_B}";
`
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
  {
    name: 'Xcode .stringsdict',
    paths: '[locale].lproj/Localizable.stringsdict',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'en.lproj'), { recursive: true });
      const escape = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // stringsdict translatable values are the plural-form strings. We put
      // a plain value in `one` and an HTML-bearing value in `other`.
      await writeFile(
        path.join(dir, 'en.lproj', 'Localizable.stringsdict'),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>greeting</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@variant@</string>
        <key>variant</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>${PLAIN_A}</string>
            <key>other</key>
            <string>${escape(HTML_A)}</string>
        </dict>
    </dict>
</dict>
</plist>
`
      );
    },
    plainValues: [PLAIN_A],
    htmlValues: [HTML_A],
    defaultContentType: 'text/plain',
  },
  {
    name: 'Xcode .xcstrings',
    paths: 'Localizable.xcstrings',
    setup: async (dir) => {
      await writeFile(
        path.join(dir, 'Localizable.xcstrings'),
        JSON.stringify(
          {
            sourceLanguage: 'en',
            version: '1.0',
            strings: {
              p1: {
                localizations: { en: { stringUnit: { state: 'translated', value: PLAIN_A } } },
              },
              p2: {
                localizations: { en: { stringUnit: { state: 'translated', value: PLAIN_B } } },
              },
              h1: { localizations: { en: { stringUnit: { state: 'translated', value: HTML_A } } } },
              h2: { localizations: { en: { stringUnit: { state: 'translated', value: HTML_B } } } },
            },
          },
          null,
          2
        )
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
  {
    name: 'TXT',
    paths: 'texts/[locale]/messages.txt',
    setup: async (dir) => {
      await mkdir(path.join(dir, 'texts', 'en'), { recursive: true });
      await writeFile(
        path.join(dir, 'texts', 'en', 'messages.txt'),
        `${PLAIN_A}\n${PLAIN_B}\n${HTML_A}\n${HTML_B}\n`
      );
    },
    plainValues: [PLAIN_A, PLAIN_B],
    htmlValues: [HTML_A, HTML_B],
    defaultContentType: 'text/plain',
  },
];

describe('Content-type routing per file format', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExit = process.exit;

    process.exit = vi.fn() as any;

    testDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `test-ctype-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;
    mockTranslate.mockClear();
    mockTranslateBatchWithFallback.mockClear();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exit = originalExit;

    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
    const lockFilePath = path.join(originalCwd, 'lara.lock');
    if (existsSync(lockFilePath)) {
      await unlink(lockFilePath).catch(() => {});
    }

    (ConfigProvider as any).instance = null;
  });

  // Collects every text -> contentType pair seen by the mocked translator
  // (across solo translate() and batched translateBatchWithFallback()).
  function collectCalls(): Array<{ text: string; contentType: string }> {
    const out: Array<{ text: string; contentType: string }> = [];
    const sources: Array<{ mock: { calls: any[] } }> = [
      mockTranslate as unknown as { mock: { calls: any[] } },
      mockTranslateBatchWithFallback as unknown as { mock: { calls: any[] } },
    ];
    for (const m of sources) {
      for (const [textBlocks, , , options] of m.mock.calls) {
        const contentType = (options as any).contentType as string;
        for (const block of textBlocks as Array<{ text: string }>) {
          out.push({ text: block.text, contentType });
        }
      }
    }
    return out;
  }

  for (const fmt of FORMATS) {
    it(`${fmt.name}: plain values go to ${fmt.defaultContentType}, HTML values go to text/html`, async () => {
      await fmt.setup(testDir);

      await executeCommand(initCommand, [
        '--non-interactive',
        '--source',
        'en',
        '--target',
        'it',
        '--paths',
        fmt.paths,
      ]);
      (ConfigProvider as any).instance = null;

      await executeCommand(translateCommand, []);

      const pairs = collectCalls();
      const textToType = new Map<string, Set<string>>();
      for (const { text, contentType } of pairs) {
        if (!textToType.has(text)) textToType.set(text, new Set());
        textToType.get(text)!.add(contentType);
      }

      for (const text of fmt.plainValues) {
        expect(textToType.get(text), `plain value missing from API calls: ${text}`).toBeDefined();
        expect([...(textToType.get(text) ?? [])]).toEqual([fmt.defaultContentType]);
      }

      for (const text of fmt.htmlValues) {
        expect(textToType.get(text), `HTML value missing from API calls: ${text}`).toBeDefined();
        expect([...(textToType.get(text) ?? [])]).toEqual(['text/html']);
      }
    });
  }
});
