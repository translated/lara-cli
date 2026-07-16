import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { executeCommand } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Regression tests for "orphan" keys: keys that exist in a TARGET locale file but
 * NOT in the SOURCE file. They must be PRESERVED (never removed) and kept at their
 * original position when the file is translated again. This is distinct from keys
 * that were removed from the source (DELETED), which must still be removed.
 *
 * Each test seeds a source plus a target that already contains an orphan (and a
 * source key missing from the target, to force a real translation pass), runs
 * `translate`, and asserts the orphan survives untouched while everything else
 * behaves normally.
 */
describe('Orphan key preservation (all keyed formats)', () => {
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
      `test-orphan-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;
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

  const init = (paths: string) =>
    executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      paths,
    ]);

  const translate = async () => {
    (ConfigProvider as any).instance = null;
    await executeCommand(translateCommand, []);
  };

  // ---------------------------------------------------------------------------
  // JSON
  // ---------------------------------------------------------------------------
  it('JSON: keeps orphan key at its position and still translates new source keys', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    // Source has one, two, three (three is missing from the target -> forces translation)
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({ one: 'One', two: 'Two', three: 'Three' }, null, 2)
    );
    // Target has one, orphan, two — orphan sits between two source keys.
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'it.json'),
      JSON.stringify({ one: '[it] One', orphan: 'SOLO IT', two: '[it] Two' }, null, 2)
    );

    await init('i18n/locales/[locale].json');
    await translate();

    const result = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );

    expect(result.orphan).toBe('SOLO IT'); // preserved, untouched
    expect(result.one).toBe('[it] One'); // shared, kept
    expect(result.two).toBe('[it] Two');
    expect(result.three).toBe('[it] Three'); // new source key translated
    // Orphan keeps its position (anchored to the preceding shared key `one`).
    expect(Object.keys(result)).toEqual(['one', 'orphan', 'two', 'three']);
  });

  // ---------------------------------------------------------------------------
  // PO
  // ---------------------------------------------------------------------------
  it('PO: keeps orphan message that is absent from the source', async () => {
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
    await mkdir(path.join(testDir, 'locales', 'it'), { recursive: true });
    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hello"

msgid "World"
msgstr "World"
`
    );
    await writeFile(
      path.join(testDir, 'locales', 'it', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "[it] Hello"

msgid "OnlyItalian"
msgstr "Solo italiano"
`
    );

    await init('locales/[locale]/messages.po');
    await translate();

    const content = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(content).toContain('msgid "OnlyItalian"'); // orphan preserved
    expect(content).toContain('Solo italiano');
    expect(content).toContain('[it] World'); // new source key translated
  });

  // ---------------------------------------------------------------------------
  // TypeScript (i18n.ts) — single multi-locale file
  // ---------------------------------------------------------------------------
  it('TS: keeps orphan key inside the target locale subtree', async () => {
    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
  en: {
    one: 'One',
    two: 'Two',
    three: 'Three',
  },
  it: {
    one: '[it] One',
    two: '[it] Two',
    orphan: 'Solo italiano',
  },
};

export default messages;`
    );

    await init('src/i18n.ts');
    await translate();

    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(content).toContain('Solo italiano'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated into `it`
  });

  // ---------------------------------------------------------------------------
  // Vue SFC <i18n> — single multi-locale block
  // ---------------------------------------------------------------------------
  it('Vue: keeps orphan key inside the target locale block', async () => {
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'Hello.vue'),
      `<template><div>{{ $t('one') }}</div></template>
<i18n>
{
  "en": { "one": "One", "two": "Two", "three": "Three" },
  "it": { "one": "[it] One", "two": "[it] Two", "orphan": "Solo italiano" }
}
</i18n>`
    );

    await init('src/components/*.vue');
    await translate();

    const content = await readFile(path.join(testDir, 'src', 'components', 'Hello.vue'), 'utf-8');
    expect(content).toContain('Solo italiano'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated
  });

  // ---------------------------------------------------------------------------
  // Android XML
  // ---------------------------------------------------------------------------
  it('Android XML: keeps orphan string/plural at their position', async () => {
    await mkdir(path.join(testDir, 'res', 'en'), { recursive: true });
    await mkdir(path.join(testDir, 'res', 'it'), { recursive: true });
    await writeFile(
      path.join(testDir, 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="one">One</string>
    <string name="two">Two</string>
    <string name="three">Three</string>
</resources>`
    );
    await writeFile(
      path.join(testDir, 'res', 'it', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="one">[it] One</string>
    <string name="only_it">Solo italiano</string>
    <string name="two">[it] Two</string>
</resources>`
    );

    await init('res/[locale]/strings.xml');
    await translate();

    const content = await readFile(path.join(testDir, 'res', 'it', 'strings.xml'), 'utf-8');
    expect(content).toContain('<string name="only_it">Solo italiano</string>'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated
    // Orphan keeps its position between `one` and `two`.
    expect(content.indexOf('one')).toBeLessThan(content.indexOf('only_it'));
    expect(content.indexOf('only_it')).toBeLessThan(content.indexOf('name="two"'));
  });

  // ---------------------------------------------------------------------------
  // Xcode .strings
  // ---------------------------------------------------------------------------
  it('Xcode .strings: keeps orphan key at its position', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await mkdir(path.join(testDir, 'it.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"one" = "One";
"two" = "Two";
"three" = "Three";
`
    );
    await writeFile(
      path.join(testDir, 'it.lproj', 'Localizable.strings'),
      `"one" = "[it] One";
"only_it" = "Solo italiano";
"two" = "[it] Two";
`
    );

    await init('[locale].lproj/Localizable.strings');
    await translate();

    const content = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(content).toContain('"only_it" = "Solo italiano";'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated
    expect(content.indexOf('"one"')).toBeLessThan(content.indexOf('only_it'));
    expect(content.indexOf('only_it')).toBeLessThan(content.indexOf('"two"'));
  });

  // ---------------------------------------------------------------------------
  // Xcode .stringsdict
  // ---------------------------------------------------------------------------
  it('Xcode .stringsdict: keeps orphan plural entry with its real structure', async () => {
    const pluralEntry = (key: string, one: string, other: string) => `    <key>${key}</key>
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
            <string>${one}</string>
            <key>other</key>
            <string>${other}</string>
        </dict>
    </dict>`;

    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await mkdir(path.join(testDir, 'it.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${pluralEntry('item_count', '%d item', '%d items')}
</dict>
</plist>`
    );
    await writeFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${pluralEntry('only_it_count', 'solo %d', 'solo %d')}
</dict>
</plist>`
    );

    await init('[locale].lproj/Localizable.stringsdict');
    await translate();

    const content = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // Orphan entry preserved with its plural structure and value untouched.
    expect(content).toContain('<key>only_it_count</key>');
    expect(content).toContain('solo %d');
    expect(content).toContain('<string>%#@items@</string>');
    // New source key translated.
    expect(content).toContain('<key>item_count</key>');
    expect(content).toContain('[it] %d item');
  });

  // ---------------------------------------------------------------------------
  // Xcode .xcstrings — single multi-locale file
  // ---------------------------------------------------------------------------
  it('Xcode .xcstrings: keeps orphan entry that only has a target localization', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            shared: {
              localizations: {
                en: { stringUnit: { state: 'translated', value: 'Shared' } },
              },
            },
            only_it: {
              localizations: {
                it: { stringUnit: { state: 'translated', value: 'Solo italiano' } },
              },
            },
          },
        },
        null,
        2
      )
    );

    await init('Localizable.xcstrings');
    await translate();

    const content = JSON.parse(
      await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8')
    );
    // Orphan entry's target localization preserved untouched.
    expect(content.strings.only_it.localizations.it.stringUnit.value).toBe('Solo italiano');
    // Shared entry translated into `it`.
    expect(content.strings.shared.localizations.it.stringUnit.value).toBe('[it] Shared');
  });

  // ---------------------------------------------------------------------------
  // init must never touch target files
  // ---------------------------------------------------------------------------
  it('init does not read, modify or create target translation files', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({ one: 'One' }, null, 2)
    );
    const itPath = path.join(testDir, 'i18n', 'locales', 'it.json');
    const original = JSON.stringify({ one: '[it] One', orphan: 'SOLO IT' }, null, 2);
    await writeFile(itPath, original);

    await init('i18n/locales/[locale].json');

    // init only writes config; the existing target file is left byte-for-byte intact.
    expect(await readFile(itPath, 'utf-8')).toBe(original);
    expect(existsSync(path.join(testDir, 'lara.yaml'))).toBe(true);
  });
});
