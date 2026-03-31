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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Xcode .xcstrings Repository Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;

  beforeEach(async () => {
    // Save original cwd and env
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExit = process.exit;

    // Mock process.exit to prevent tests from actually exiting
    process.exit = vi.fn() as any;

    // Create a temporary directory for each test
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-xcstrings-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(testDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);

    // Set up mock API credentials
    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    // Reset ConfigProvider singleton
    (ConfigProvider as any).instance = null;
  });

  afterEach(async () => {
    // Restore original cwd, env, and exit
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exit = originalExit;

    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }

    // Clean up lara.lock file from project root if it was created during tests
    const lockFilePath = path.join(originalCwd, 'lara.lock');
    if (existsSync(lockFilePath)) {
      await unlink(lockFilePath).catch(() => {
        // Ignore errors if file doesn't exist or can't be deleted
      });
    }

    // Reset ConfigProvider singleton
    (ConfigProvider as any).instance = null;
  });

  it('should handle an Xcode .xcstrings repository', async () => {
    // Create xcstrings file with en entries
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
          welcome: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Welcome to the app' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify the same file now contains it locale
    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Verify it locale translations
    expect(content.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('[it] Hello World');
    expect(content.strings.welcome.localizations.it.stringUnit.value).toBe('[it] Welcome to the app');

    // Verify en locale entries are preserved
    expect(content.strings.app_name.localizations.en.stringUnit.value).toBe('My Application');
    expect(content.strings.hello.localizations.en.stringUnit.value).toBe('Hello World');
    expect(content.strings.welcome.localizations.en.stringUnit.value).toBe('Welcome to the app');
  });

  it('should handle multiple target locales', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize with multiple targets
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it,fr',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Verify it locale
    expect(content.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('[it] Hello World');

    // Verify fr locale
    expect(content.strings.app_name.localizations.fr.stringUnit.value).toBe('[fr] My Application');
    expect(content.strings.hello.localizations.fr.stringUnit.value).toBe('[fr] Hello World');
  });

  it('should preserve existing locales', async () => {
    // Create file with en + es entries
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
              es: {
                stringUnit: { state: 'translated', value: 'Mi Aplicacion' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
              es: {
                stringUnit: { state: 'translated', value: 'Hola Mundo' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize - translate to it only
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Verify es entries still present and unchanged
    expect(content.strings.app_name.localizations.es.stringUnit.value).toBe('Mi Aplicacion');
    expect(content.strings.hello.localizations.es.stringUnit.value).toBe('Hola Mundo');

    // Verify it entries added
    expect(content.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('[it] Hello World');
  });

  it('should handle plural variations', async () => {
    // Create xcstrings with plural entry
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          item_count: {
            localizations: {
              en: {
                variations: {
                  plural: {
                    one: {
                      stringUnit: { state: 'translated', value: '%lld item' },
                    },
                    other: {
                      stringUnit: { state: 'translated', value: '%lld items' },
                    },
                  },
                },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Verify plural forms translated correctly
    expect(content.strings.item_count.localizations.it.variations.plural.one.stringUnit.value).toBe('[it] %lld item');
    expect(content.strings.item_count.localizations.it.variations.plural.other.stringUnit.value).toBe('[it] %lld items');

    // Verify en plural forms preserved
    expect(content.strings.item_count.localizations.en.variations.plural.one.stringUnit.value).toBe('%lld item');
    expect(content.strings.item_count.localizations.en.variations.plural.other.stringUnit.value).toBe('%lld items');
  });

  it('should add new keys when source is changed', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify initial translation
    let content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    expect(content.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');

    // Add new key to en locale
    content.strings.goodbye = {
      localizations: {
        en: {
          stringUnit: { state: 'translated', value: 'Goodbye' },
        },
      },
    };
    await writeFile(path.join(testDir, 'Localizable.xcstrings'), JSON.stringify(content, null, 2));

    (ConfigProvider as any).instance = null;

    // Re-translate
    await executeCommand(translateCommand, []);

    // Verify new key in target locale
    const newContent = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    expect(newContent.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(newContent.strings.goodbye.localizations.it.stringUnit.value).toBe('[it] Goodbye');
  });

  it('should remove keys when source is changed', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
          welcome: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Welcome to the app' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify initial translations
    let content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('[it] Hello World');
    expect(content.strings.welcome.localizations.it.stringUnit.value).toBe('[it] Welcome to the app');

    // Remove hello and welcome from en locale
    delete content.strings.hello.localizations.en;
    delete content.strings.welcome.localizations.en;
    await writeFile(path.join(testDir, 'Localizable.xcstrings'), JSON.stringify(content, null, 2));

    (ConfigProvider as any).instance = null;

    // Re-translate
    await executeCommand(translateCommand, []);

    // Verify removed keys absent from target
    const newContent = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    expect(newContent.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(newContent.strings.hello.localizations.it).toBeUndefined();
    expect(newContent.strings.welcome.localizations.it).toBeUndefined();
  });

  it('should handle empty xcstrings file', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {},
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate - should not crash with empty strings
    await executeCommand(translateCommand, []);

    // Verify file still valid
    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    expect(content.sourceLanguage).toBe('en');
    expect(content.strings).toBeDefined();
  });

  it('should not add ignored keys to new target locales', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
          welcome: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Welcome to the app' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    // Add ignoredKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-xcstrings'].ignoredKeys = ['hello'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Non-ignored keys should be translated
    expect(content.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(content.strings.welcome.localizations.it.stringUnit.value).toBe('[it] Welcome to the app');

    // Ignored key should NOT have it locale
    expect(content.strings.hello.localizations.it).toBeUndefined();
  });

  it('should preserve non-translatable keys (shouldTranslate: false)', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_id: {
            shouldTranslate: false,
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'com.example.app' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Non-translatable key should NOT have it locale added
    expect(content.strings.app_id.shouldTranslate).toBe(false);
    expect(content.strings.app_id.localizations.it).toBeUndefined();
    expect(content.strings.app_id.localizations.en.stringUnit.value).toBe('com.example.app');

    // Translatable key should be translated
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('[it] Hello World');
  });

  it('should preserve sourceLanguage and version metadata', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
        },
      }, null, 2)
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));

    // Verify metadata fields are unchanged
    expect(content.sourceLanguage).toBe('en');
    expect(content.version).toBe('1.0');
  });

  it('should copy locked keys from source without translation', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
          welcome: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Welcome to the app' },
              },
            },
          },
        },
      }, null, 2)
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-xcstrings'].lockedKeys = ['hello'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    // Locked key should have source value (no [it] prefix)
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('Hello World');
    // Non-locked keys should be translated
    expect(content.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
    expect(content.strings.welcome.localizations.it.stringUnit.value).toBe('[it] Welcome to the app');
  });

  it('should update locked keys when source changes', async () => {
    await writeFile(
      path.join(testDir, 'Localizable.xcstrings'),
      JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My Application' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello World' },
              },
            },
          },
        },
      }, null, 2)
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'Localizable.xcstrings',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-xcstrings'].lockedKeys = ['hello'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    let content = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    expect(content.strings.hello.localizations.it.stringUnit.value).toBe('Hello World');

    // Update source value of locked key
    content.strings.hello.localizations.en.stringUnit.value = 'Hello Universe';
    await writeFile(path.join(testDir, 'Localizable.xcstrings'), JSON.stringify(content, null, 2));

    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const newContent = JSON.parse(await readFile(path.join(testDir, 'Localizable.xcstrings'), 'utf-8'));
    // Locked key should have the new source value
    expect(newContent.strings.hello.localizations.it.stringUnit.value).toBe('Hello Universe');
    expect(newContent.strings.app_name.localizations.it.stringUnit.value).toBe('[it] My Application');
  });
});
