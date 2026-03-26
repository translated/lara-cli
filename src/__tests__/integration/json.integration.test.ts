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
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-json-${Date.now()}-${Math.random().toString(36).substring(7)}`);
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
      JSON.stringify({
        title: "Hello, world!",
        author: {
          name: "John Doe" 
        },
        messages: [
          "Welcome to MyApp",
          "Hello, world!"
        ]
      }
      , null, 2)
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
    const itContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const frContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

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
      JSON.stringify({
        title: "Hello, world!"
      }, null, 2)
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
    const itContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const frContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

    expect(itContent.title).toBe('[it] Hello, world!');
    expect(frContent.title).toBe('[fr] Hello, world!');

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, world!",
        subtitle: "Welcome to MyApp"
      }, null, 2)
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newItContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const newFrContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

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
      JSON.stringify({
        title: "Hello, world!",
        subtitle: "Welcome to MyApp"
      }, null, 2)
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
    const itContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const frContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

    expect(itContent.title).toBe('[it] Hello, world!');
    expect(itContent.subtitle).toBe('[it] Welcome to MyApp');
    expect(frContent.title).toBe('[fr] Hello, world!');
    expect(frContent.subtitle).toBe('[fr] Welcome to MyApp');

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, world!"
      }, null, 2)
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newItContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const newFrContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

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
      JSON.stringify({
        title: "Hello, world!",
        subtitle: "Welcome to MyApp"
      }, null, 2)
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
      JSON.stringify({
        title: "Hello, world!",
        secondaryTitle: "Secondary Title",
        subtitle: "Welcome to MyApp"
      }, null, 2)
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const itContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const frContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

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
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      '{}'
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
    const itContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    const frContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'fr.json'), 'utf-8'));

    expect(itContent).toEqual({});
    expect(frContent).toEqual({});
  });

  it('should not add ignored keys to new target files', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, world!",
        app: {
          debug: "Debug mode enabled",
          version: "1.0.0"
        }
      }, null, 2)
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'i18n/locales/[locale].json',
    ]);

    // Add ignoredKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.ignoredKeys = ['**/debug'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const itContent = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    expect(itContent.title).toBe('[it] Hello, world!');
    expect(itContent.app.version).toBe('[it] 1.0.0');
    expect(itContent.app.debug).toBeUndefined();
  });

  it('should preserve ignored keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, world!",
        app: {
          debug: "Debug mode enabled",
          version: "1.0.0"
        }
      }, null, 2)
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys - all keys get translated
    await executeCommand(translateCommand, []);

    const itContentBefore = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    expect(itContentBefore.app.debug).toBe('[it] Debug mode enabled');

    // Now add ignoredKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.ignoredKeys = ['**/debug'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, updated world!",
        app: {
          debug: "Debug mode enabled",
          version: "1.0.0"
        }
      }, null, 2)
    );

    await executeCommand(translateCommand, []);

    const itContentAfter = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    expect(itContentAfter.title).toBe('[it] Hello, updated world!');
    expect(itContentAfter.app.debug).toBe('[it] Debug mode enabled'); // preserved, not removed
    expect(itContentAfter.app.version).toBe('[it] 1.0.0');
  });

  it('should preserve ignored keys even when deleted from source', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, world!",
        app: {
          debug: "Debug mode enabled",
          version: "1.0.0"
        }
      }, null, 2)
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', 'i18n/locales/[locale].json',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys
    await executeCommand(translateCommand, []);

    const itContentBefore = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    expect(itContentBefore.app.debug).toBe('[it] Debug mode enabled');

    // Add ignoredKeys and remove the key from source
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.json.ignoredKeys = ['**/debug'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify({
        title: "Hello, world!",
        app: {
          version: "1.0.0"
        }
      }, null, 2)
    );

    await executeCommand(translateCommand, []);

    const itContentAfter = JSON.parse(await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8'));
    expect(itContentAfter.title).toBe('[it] Hello, world!');
    expect(itContentAfter.app.debug).toBe('[it] Debug mode enabled'); // preserved despite deletion from source
    expect(itContentAfter.app.version).toBe('[it] 1.0.0');
  });
});
