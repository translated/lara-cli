import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import yaml from 'yaml';

import { executeCommand } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';
import { OrphanKeysMode } from '#modules/config/config.types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Regression tests for "orphan" keys: keys that exist in a TARGET locale file but
 * NOT in the SOURCE file. By default they must be PRESERVED (never removed) and
 * kept at their original position when the file is translated again. This is
 * distinct from keys that were removed from the source (DELETED), which must be
 * removed whatever the setting says.
 *
 * Each test seeds a source plus a target that already contains an orphan (and a
 * source key missing from the target, to force a real translation pass), runs
 * `translate`, and asserts the orphan survives untouched while everything else
 * behaves normally.
 *
 * The second half of the file covers `translation.orphanKeys: delete` and the
 * `--orphan-keys` flag, which opt out of that preservation. Two carve-outs must
 * survive even in delete mode, because they are not orphans but entries the
 * parsers deliberately skip: Android `translatable="false"` resources and
 * .xcstrings entries marked `shouldTranslate: false`.
 */
describe('Orphan keys (all keyed formats)', () => {
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

  const translate = async (args: string[] = []) => {
    (ConfigProvider as any).instance = null;
    await executeCommand(translateCommand, args);
  };

  /** Structurally edits the config `init` just wrote, then reloads it. */
  const patchConfig = async (mutate: (cfg: any) => void) => {
    const configPath = path.join(testDir, 'lara.yaml');
    const cfg = yaml.parse(await readFile(configPath, 'utf-8'));
    mutate(cfg);
    await writeFile(configPath, yaml.stringify(cfg));
    (ConfigProvider as any).instance = null;
  };

  const setOrphanKeys = (mode: OrphanKeysMode) =>
    patchConfig((cfg) => {
      // init must emit the field explicitly, not rely on the schema default.
      expect(cfg.translation.orphanKeys).toBeDefined();
      cfg.translation.orphanKeys = mode;
    });

  /** Drops the whole `translation` section, so the Zod defaults apply. */
  const removeTranslationSection = () =>
    patchConfig((cfg) => {
      delete cfg.translation;
    });

  // ---------------------------------------------------------------------------
  // Fixtures
  //
  // One seed per format, shared by the `keep` and `delete` cases so the two can
  // never drift apart. Each writes a source, a target that already contains an
  // orphan, and runs `init` — leaving the caller to set the mode and translate.
  // Every source carries a key missing from the target (`three` / `World` /
  // `item_count` / `shared`) so a real translation pass is forced.
  // ---------------------------------------------------------------------------

  const read = (...segments: string[]) => readFile(path.join(testDir, ...segments), 'utf-8');
  const readJson = async (...segments: string[]) => JSON.parse(await read(...segments));

  const seedJson = async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({ one: 'One', two: 'Two', three: 'Three' }, null, 2)
    );
    // The orphan sits between two source keys, so position can be asserted.
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'it.json'),
      JSON.stringify({ one: '[it] One', orphan: 'SOLO IT', two: '[it] Two' }, null, 2)
    );
    await init('i18n/locales/[locale].json');
  };

  const seedPo = async () => {
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
  };

  // Single multi-locale file: source and target live in the same document.
  const seedTs = async () => {
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
  };

  const seedVue = async () => {
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
  };

  /**
   * `nonTranslatable` adds a target-only `translatable="false"` resource. parse()
   * skips those on purpose, so they never reach the engine — they are not orphans
   * and must survive even in delete mode.
   */
  const seedAndroid = async ({ nonTranslatable = false } = {}) => {
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
${nonTranslatable ? '    <string name="api_url" translatable="false">https://example.org</string>\n' : ''}    <string name="two">[it] Two</string>
</resources>`
    );
    await init('res/[locale]/strings.xml');
  };

  const seedStrings = async () => {
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
  };

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

  const plist = (entry: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${entry}
</dict>
</plist>`;

  const seedStringsdict = async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await mkdir(path.join(testDir, 'it.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      plist(pluralEntry('item_count', '%d item', '%d items'))
    );
    await writeFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      plist(pluralEntry('only_it_count', 'solo %d', 'solo %d'))
    );
    await init('[locale].lproj/Localizable.stringsdict');
  };

  const seedXcstrings = async () => {
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
  };

  // ===========================================================================
  // Default mode: orphans are preserved
  // ===========================================================================

  it('JSON: keeps orphan key at its position and still translates new source keys', async () => {
    await seedJson();
    await translate();

    const result = await readJson('i18n', 'locales', 'it.json');
    expect(result.orphan).toBe('SOLO IT'); // preserved, untouched
    expect(result.one).toBe('[it] One'); // shared, kept
    expect(result.two).toBe('[it] Two');
    expect(result.three).toBe('[it] Three'); // new source key translated
    // Orphan keeps its position (anchored to the preceding shared key `one`).
    expect(Object.keys(result)).toEqual(['one', 'orphan', 'two', 'three']);
  });

  it('PO: keeps orphan message that is absent from the source', async () => {
    await seedPo();
    await translate();

    const content = await read('locales', 'it', 'messages.po');
    expect(content).toContain('msgid "OnlyItalian"'); // orphan preserved
    expect(content).toContain('Solo italiano');
    expect(content).toContain('[it] World'); // new source key translated
  });

  it('TS: keeps orphan key inside the target locale subtree', async () => {
    await seedTs();
    await translate();

    const content = await read('src', 'i18n.ts');
    expect(content).toContain('Solo italiano'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated into `it`
  });

  it('Vue: keeps orphan key inside the target locale block', async () => {
    await seedVue();
    await translate();

    const content = await read('src', 'components', 'Hello.vue');
    expect(content).toContain('Solo italiano'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated
  });

  it('Android XML: keeps orphan string/plural at their position', async () => {
    await seedAndroid();
    await translate();

    const content = await read('res', 'it', 'strings.xml');
    expect(content).toContain('<string name="only_it">Solo italiano</string>'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated
    // Orphan keeps its position between `one` and `two`.
    expect(content.indexOf('one')).toBeLessThan(content.indexOf('only_it'));
    expect(content.indexOf('only_it')).toBeLessThan(content.indexOf('name="two"'));
  });

  it('Xcode .strings: keeps orphan key at its position', async () => {
    await seedStrings();
    await translate();

    const content = await read('it.lproj', 'Localizable.strings');
    expect(content).toContain('"only_it" = "Solo italiano";'); // orphan preserved
    expect(content).toContain('[it] Three'); // new source key translated
    expect(content.indexOf('"one"')).toBeLessThan(content.indexOf('only_it'));
    expect(content.indexOf('only_it')).toBeLessThan(content.indexOf('"two"'));
  });

  it('Xcode .stringsdict: keeps orphan plural entry with its real structure', async () => {
    await seedStringsdict();
    await translate();

    const content = await read('it.lproj', 'Localizable.stringsdict');
    // Orphan entry preserved with its plural structure and value untouched.
    expect(content).toContain('<key>only_it_count</key>');
    expect(content).toContain('solo %d');
    expect(content).toContain('<string>%#@items@</string>');
    // New source key translated.
    expect(content).toContain('<key>item_count</key>');
    expect(content).toContain('[it] %d item');
  });

  it('Xcode .xcstrings: keeps orphan entry that only has a target localization', async () => {
    await seedXcstrings();
    await translate();

    const content = await readJson('Localizable.xcstrings');
    // Orphan entry's target localization preserved untouched.
    expect(content.strings.only_it.localizations.it.stringUnit.value).toBe('Solo italiano');
    // Shared entry translated into `it`.
    expect(content.strings.shared.localizations.it.stringUnit.value).toBe('[it] Shared');
  });

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

  // ===========================================================================
  // translation.orphanKeys: delete
  //
  // Opting out of preservation: orphans are dropped so the target mirrors the
  // source. Shared keys must be untouched, and the format-specific carve-outs
  // for non-translatable entries must still survive.
  // ===========================================================================

  it('delete: JSON drops the orphan and keeps everything else', async () => {
    await seedJson();
    await setOrphanKeys('delete');
    await translate();

    const result = await readJson('i18n', 'locales', 'it.json');
    expect(result.orphan).toBeUndefined();
    expect(Object.keys(result)).toEqual(['one', 'two', 'three']);
    expect(result.one).toBe('[it] One');
    expect(result.three).toBe('[it] Three');
  });

  it('delete: PO drops the orphan message', async () => {
    await seedPo();
    await setOrphanKeys('delete');
    await translate();

    const content = await read('locales', 'it', 'messages.po');
    expect(content).not.toContain('OnlyItalian');
    expect(content).not.toContain('Solo italiano');
    expect(content).toContain('[it] Hello');
    expect(content).toContain('[it] World');
  });

  it('delete: TS drops the orphan inside the target locale subtree', async () => {
    await seedTs();
    await setOrphanKeys('delete');
    await translate();

    const content = await read('src', 'i18n.ts');
    expect(content).not.toContain('Solo italiano');
    expect(content).toContain('[it] Three');
  });

  it('delete: Vue drops the orphan inside the target locale block', async () => {
    await seedVue();
    await setOrphanKeys('delete');
    await translate();

    const content = await read('src', 'components', 'Hello.vue');
    expect(content).not.toContain('Solo italiano');
    expect(content).toContain('[it] Three');
  });

  it('delete: Android XML drops the orphan but KEEPS translatable="false" resources', async () => {
    await seedAndroid({ nonTranslatable: true });
    await setOrphanKeys('delete');
    await translate();

    const content = await read('res', 'it', 'strings.xml');
    expect(content).not.toContain('only_it');
    expect(content).not.toContain('Solo italiano');
    // The non-translatable resource survives with its value intact.
    expect(content).toContain('name="api_url"');
    expect(content).toContain('https://example.org');
    expect(content).toContain('[it] Three');
  });

  it('delete: Xcode .strings drops the orphan key', async () => {
    await seedStrings();
    await setOrphanKeys('delete');
    await translate();

    const content = await read('it.lproj', 'Localizable.strings');
    expect(content).not.toContain('only_it');
    expect(content).not.toContain('Solo italiano');
    expect(content).toContain('"one" = "[it] One";');
    expect(content).toContain('[it] Three');
  });

  it('delete: Xcode .stringsdict drops the orphan plural entry', async () => {
    await seedStringsdict();
    await setOrphanKeys('delete');
    await translate();

    const content = await read('it.lproj', 'Localizable.stringsdict');
    expect(content).not.toContain('only_it_count');
    expect(content).not.toContain('solo %d');
    expect(content).toContain('<key>item_count</key>');
    expect(content).toContain('[it] %d item');
  });

  it('delete: Xcode .xcstrings drops the orphan target localization', async () => {
    await seedXcstrings();
    await setOrphanKeys('delete');
    await translate();

    const content = await readJson('Localizable.xcstrings');
    // The orphan's target localization is pruned; the shared key is translated.
    expect(content.strings.only_it.localizations?.it).toBeUndefined();
    expect(content.strings.shared.localizations.it.stringUnit.value).toBe('[it] Shared');
  });

  // ---------------------------------------------------------------------------
  // Defaults and CLI precedence
  // ---------------------------------------------------------------------------

  it('defaults to keep when the config has no translation section at all', async () => {
    await seedJson();
    await removeTranslationSection();
    await translate();

    const result = await readJson('i18n', 'locales', 'it.json');
    expect(result.orphan).toBe('SOLO IT');
    expect(result.three).toBe('[it] Three');
  });

  it('--orphan-keys delete overrides a config set to keep', async () => {
    await seedJson();
    await setOrphanKeys('keep');
    await translate(['--orphan-keys', 'delete']);

    const result = await readJson('i18n', 'locales', 'it.json');
    expect(result.orphan).toBeUndefined();
    expect(result.three).toBe('[it] Three');
  });

  it('--orphan-keys keep overrides a config set to delete', async () => {
    await seedJson();
    await setOrphanKeys('delete');
    await translate(['--orphan-keys', 'keep']);

    const result = await readJson('i18n', 'locales', 'it.json');
    expect(result.orphan).toBe('SOLO IT');
    expect(result.three).toBe('[it] Three');
  });

  it('source-deleted keys are removed in BOTH modes', async () => {
    // `gone` exists in the target and was removed from the source. Unlike an
    // orphan it is recorded in the changelog as deleted, so it must disappear
    // regardless of the orphanKeys setting.
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({ one: 'One', gone: 'Gone' }, null, 2)
    );
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'it.json'),
      JSON.stringify({ one: '[it] One', gone: '[it] Gone' }, null, 2)
    );
    await init('i18n/locales/[locale].json');
    // First pass records the checksum so the next one sees `gone` as deleted.
    await translate();
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({ one: 'One', two: 'Two' }, null, 2)
    );

    await setOrphanKeys('keep');
    await translate();

    let result = await readJson('i18n', 'locales', 'it.json');
    expect(result.gone).toBeUndefined();
    expect(result.two).toBe('[it] Two');

    await setOrphanKeys('delete');
    await translate();

    result = await readJson('i18n', 'locales', 'it.json');
    expect(result.gone).toBeUndefined();
  });
});
