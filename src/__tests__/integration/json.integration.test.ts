import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import yaml from 'yaml';

import { executeCommand, mockTranslateBatchWithFallback } from './test-helpers.js';
import {
  initProject,
  patchConfig,
  runPerLocaleIgnoreScenario,
} from './per-locale-ignore.helper.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('JSON Repository Integration Tests', () => {
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
    testDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `test-json-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
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

  it('should handle a JSON-based repository', async () => {
    // Set up JSON repository structure
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          author: {
            name: 'John Doe',
          },
          messages: ['Welcome to MyApp', 'Hello, world!'],
        },
        null,
        2
      )
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const frContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(itContent.title).toBe('[it] Hello, world!');
    expect(itContent.author.name).toBe('[it] John Doe');
    expect(itContent.messages[0]).toBe('[it] Welcome to MyApp');
    expect(itContent.messages[1]).toBe('[it] Hello, world!');
    expect(frContent.title).toBe('[fr] Hello, world!');
    expect(frContent.author.name).toBe('[fr] John Doe');
    expect(frContent.messages[0]).toBe('[fr] Welcome to MyApp');
    expect(frContent.messages[1]).toBe('[fr] Hello, world!');
  });

  it('should add keys to existing locales when source is changed', async () => {
    // Set up JSON repository structure
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const frContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(itContent.title).toBe('[it] Hello, world!');
    expect(frContent.title).toBe('[fr] Hello, world!');

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          subtitle: 'Welcome to MyApp',
        },
        null,
        2
      )
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newItContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const newFrContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(newItContent.title).toBe('[it] Hello, world!');
    expect(newItContent.subtitle).toBe('[it] Welcome to MyApp');
    expect(newFrContent.title).toBe('[fr] Hello, world!');
    expect(newFrContent.subtitle).toBe('[fr] Welcome to MyApp');
  });

  it('should remove keys from existing locales when they are removed from source', async () => {
    // Set up JSON repository structure
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          subtitle: 'Welcome to MyApp',
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const frContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(itContent.title).toBe('[it] Hello, world!');
    expect(itContent.subtitle).toBe('[it] Welcome to MyApp');
    expect(frContent.title).toBe('[fr] Hello, world!');
    expect(frContent.subtitle).toBe('[fr] Welcome to MyApp');

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
        },
        null,
        2
      )
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newItContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const newFrContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(newItContent.title).toBe('[it] Hello, world!');
    expect(newItContent.subtitle).toBeUndefined();
    expect(newFrContent.title).toBe('[fr] Hello, world!');
    expect(newFrContent.subtitle).toBeUndefined();
  });

  it('should maintain the same order of keys in existing locales', async () => {
    // Set up JSON repository structure
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          subtitle: 'Welcome to MyApp',
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          secondaryTitle: 'Secondary Title',
          subtitle: 'Welcome to MyApp',
        },
        null,
        2
      )
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const frContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(Object.keys(itContent)[0]).toBe('title');
    expect(Object.keys(itContent)[1]).toBe('secondaryTitle');
    expect(Object.keys(itContent)[2]).toBe('subtitle');
    expect(Object.keys(frContent)[0]).toBe('title');
    expect(Object.keys(frContent)[1]).toBe('secondaryTitle');
    expect(Object.keys(frContent)[2]).toBe('subtitle');
  });

  it('should handle empty JSON files', async () => {
    // Set up JSON repository structure
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(path.join(testDir, 'i18n', 'locales', 'en.json'), '{}');

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    const frContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8')
    );

    expect(itContent).toEqual({});
    expect(frContent).toEqual({});
  });

  it('should not add ignored keys to new target files', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            debug: 'Debug mode enabled',
            version: '1.0.0',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    // Add ignoredKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.ignoredKeys = ['**/debug'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContent.title).toBe('[it] Hello, world!');
    expect(itContent.app.version).toBe('[it] 1.0.0');
    expect(itContent.app.debug).toBeUndefined();
  });

  it('should preserve ignored keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            debug: 'Debug mode enabled',
            version: '1.0.0',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys - all keys get translated
    await executeCommand(translateCommand, []);

    const itContentBefore = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContentBefore.app.debug).toBe('[it] Debug mode enabled');

    // Now add ignoredKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.ignoredKeys = ['**/debug'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, updated world!',
          app: {
            debug: 'Debug mode enabled',
            version: '1.0.0',
          },
        },
        null,
        2
      )
    );

    await executeCommand(translateCommand, []);

    const itContentAfter = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContentAfter.title).toBe('[it] Hello, updated world!');
    expect(itContentAfter.app.debug).toBe('[it] Debug mode enabled'); // preserved, not removed
    expect(itContentAfter.app.version).toBe('[it] 1.0.0');
  });

  it('should preserve ignored keys even when deleted from source', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            debug: 'Debug mode enabled',
            version: '1.0.0',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys
    await executeCommand(translateCommand, []);

    const itContentBefore = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContentBefore.app.debug).toBe('[it] Debug mode enabled');

    // Add ignoredKeys and remove the key from source
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.ignoredKeys = ['**/debug'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '1.0.0',
          },
        },
        null,
        2
      )
    );

    await executeCommand(translateCommand, []);

    const itContentAfter = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContentAfter.title).toBe('[it] Hello, world!');
    expect(itContentAfter.app.debug).toBe('[it] Debug mode enabled'); // preserved despite deletion from source
    expect(itContentAfter.app.version).toBe('[it] 1.0.0');
  });

  it('should copy locked keys from source without translation', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '1.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.lockedKeys = ['app/version'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    // Locked key should have source value (no [it] prefix)
    expect(itContent.app.version).toBe('1.0.0');
    // Non-locked keys should be translated
    expect(itContent.title).toBe('[it] Hello, world!');
    expect(itContent.app.name).toBe('[it] My App');
  });

  it('should update locked keys when source changes', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '1.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.lockedKeys = ['app/version'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContent.app.version).toBe('1.0.0');

    // Update source value of locked key
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '2.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(translateCommand, []);

    const itContentAfterUpdate = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    // Locked key should have the new source value
    expect(itContentAfterUpdate.app.version).toBe('2.0.0');
    expect(itContentAfterUpdate.title).toBe('[it] Hello, world!');
    expect(itContentAfterUpdate.app.name).toBe('[it] My App');
  });

  it('should not translate files matching exclude patterns', async () => {
    // Create two source directories with JSON files
    await mkdir(path.join(testDir, 'i18n', 'main'), { recursive: true });
    await mkdir(path.join(testDir, 'i18n', 'dev'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'main', 'en.json'),
      JSON.stringify({ title: 'Hello from main' }, null, 2)
    );
    await writeFile(
      path.join(testDir, 'i18n', 'dev', 'en.json'),
      JSON.stringify({ title: 'Hello from dev' }, null, 2)
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/*/[locale].json',
    ]);

    // Add exclude pattern to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.exclude = ['i18n/dev/[locale].json'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    // Non-excluded file should be translated
    const mainContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'main', 'it.json'), 'utf-8')
    );
    expect(mainContent.title).toBe('[it] Hello from main');

    // Excluded file should NOT be translated
    expect(existsSync(path.join(testDir, 'i18n', 'dev', 'it.json'))).toBe(false);
  });

  it('should only translate included keys when includeKeys is configured', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '1.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    // Add includeKeys to config - only translate title
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.includeKeys = ['title'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    // Included key should be translated
    expect(itContent.title).toBe('[it] Hello, world!');
    // Non-included keys should NOT be present in new target file
    expect(itContent.app).toBeUndefined();
  });

  it('should preserve non-included keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '1.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without includeKeys - all keys get translated
    await executeCommand(translateCommand, []);

    const itContentBefore = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContentBefore.app.name).toBe('[it] My App');

    // Now add includeKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.includeKeys = ['title'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, updated world!',
          app: {
            version: '1.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(translateCommand, []);

    const itContentAfter = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    // Included key should be updated
    expect(itContentAfter.title).toBe('[it] Hello, updated world!');
    // Non-included keys should be preserved as-is
    expect(itContentAfter.app.name).toBe('[it] My App');
    expect(itContentAfter.app.version).toBe('[it] 1.0.0');
  });

  it('should treat keys in both includeKeys and ignoredKeys as ignored', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          title: 'Hello, world!',
          app: {
            version: '1.0.0',
            name: 'My App',
          },
        },
        null,
        2
      )
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'i18n/locales/[locale].json',
    ]);

    // Add both includeKeys and ignoredKeys with overlapping pattern
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.includeKeys = ['title', 'app/version'];
    config.files.json.ignoredKeys = ['app/version'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    // Included and not ignored → translated
    expect(itContent.title).toBe('[it] Hello, world!');
    // Included BUT also ignored → ignoredKeys wins, not added to new target
    expect(itContent.app?.version).toBeUndefined();
    // Not included → not added to new target
    expect(itContent.app?.name).toBeUndefined();
  });

  it('should ignore a key only for the target locales listed in its ignoredKeys rule', async () => {
    await runPerLocaleIgnoreScenario(testDir, {
      fileType: 'json',
      paths: 'i18n/locales/[locale].json',
      ignoredKey: 'secret',
      file: (locale) => `i18n/locales/${locale}.json`,
      source: `{
  "secret": "Secret old",
  "plain": "Plain old"
}
`,
    });
  });

  describe('per-locale ignoredKeys', () => {
    const localesDir = () => path.join(testDir, 'i18n', 'locales');
    const writeJson = async (locale: string, data: unknown) => {
      await mkdir(localesDir(), { recursive: true });
      await writeFile(path.join(localesDir(), `${locale}.json`), JSON.stringify(data, null, 2));
    };
    const readJson = async (locale: string) =>
      JSON.parse(await readFile(path.join(localesDir(), `${locale}.json`), 'utf-8'));
    const init = (targets: string) => initProject(targets, 'i18n/locales/[locale].json');
    const setFileConfig = (fields: Record<string, unknown>) =>
      patchConfig(testDir, (config) => Object.assign(config.files.json, fields));

    it('combines global and per-locale rules', async () => {
      await writeJson('en', {
        internal: { debug: 'Debug' },
        legal: { terms: 'Terms', privacy: 'Privacy' },
        promo: { banner: 'Sale' },
        title: 'Title',
      });
      await init('it,fr,de');
      await setFileConfig({
        ignoredKeys: [
          'internal/**',
          { path: 'legal/**', locales: ['fr', 'de'] },
          { path: 'promo/*', locales: ['it'] },
        ],
      });

      await executeCommand(translateCommand, []);

      const it = await readJson('it');
      expect(it).toEqual({
        legal: { terms: '[it] Terms', privacy: '[it] Privacy' },
        title: '[it] Title',
      });
      for (const locale of ['fr', 'de']) {
        expect(await readJson(locale)).toEqual({
          promo: { banner: `[${locale}] Sale` },
          title: `[${locale}] Title`,
        });
      }
    });

    it('does not call the API for locales where the key is ignored', async () => {
      mockTranslateBatchWithFallback.mockClear();
      await writeJson('en', { secret: 'Secret', plain: 'Plain' });
      await init('it,fr');
      await setFileConfig({ ignoredKeys: [{ path: 'secret', locales: ['fr'] }] });

      await executeCommand(translateCommand, []);

      const sentTo = (locale: string) =>
        mockTranslateBatchWithFallback.mock.calls
          .filter((call) => call[2] === locale)
          .flatMap((call) => call[0].map((block) => block.text));
      expect(sentTo('it').sort()).toEqual(['Plain', 'Secret']);
      expect(sentTo('fr')).toEqual(['Plain']);
    });

    it('removes a source-deleted key only where it is not ignored', async () => {
      await writeJson('en', { secret: 'Secret', plain: 'Plain' });
      await init('it,fr');
      await executeCommand(translateCommand, []);
      expect((await readJson('fr')).secret).toBe('[fr] Secret');

      await setFileConfig({ ignoredKeys: [{ path: 'secret', locales: ['fr'] }] });
      await writeJson('en', { plain: 'Plain' });
      await executeCommand(translateCommand, []);

      expect(await readJson('it')).toEqual({ plain: '[it] Plain' });
      expect(await readJson('fr')).toEqual({ secret: '[fr] Secret', plain: '[fr] Plain' });
    });

    it('applies on top of includeKeys', async () => {
      await writeJson('en', { ui: { title: 'Title', legal: 'Legal' }, other: 'Other' });
      await init('it,fr');
      await setFileConfig({
        includeKeys: ['ui/**'],
        ignoredKeys: [{ path: 'ui/legal', locales: ['fr'] }],
      });

      await executeCommand(translateCommand, []);

      expect(await readJson('it')).toEqual({ ui: { title: '[it] Title', legal: '[it] Legal' } });
      expect(await readJson('fr')).toEqual({ ui: { title: '[fr] Title' } });
    });

    it('honours the rule when the targets are narrowed with --target', async () => {
      await writeJson('en', { secret: 'Secret', plain: 'Plain' });
      await init('it,fr');
      await setFileConfig({ ignoredKeys: [{ path: 'secret', locales: ['fr'] }] });

      await executeCommand(translateCommand, ['--target', 'it']);
      expect(await readJson('it')).toEqual({ secret: '[it] Secret', plain: '[it] Plain' });
      expect(existsSync(path.join(localesDir(), 'fr.json'))).toBe(false);

      await executeCommand(translateCommand, ['--target', 'fr', '--force']);
      expect(await readJson('fr')).toEqual({ plain: '[fr] Plain' });
    });

    it('rejects a rule naming a locale that is not a target', async () => {
      await writeJson('en', { secret: 'Secret' });
      await init('it,fr');
      await setFileConfig({ ignoredKeys: ['internal/**', { path: 'secret', locales: ['es'] }] });

      await expect(executeCommand(translateCommand, [])).rejects.toThrow();
      expect(existsSync(path.join(localesDir(), 'it.json'))).toBe(false);

      (ConfigProvider as any).instance = null;
      expect(() => ConfigProvider.getInstance().getConfig()).toThrow(
        /files\.json\.ignoredKeys\.1\.locales: Locale "es" is not a target locale/
      );
    });
  });
});
