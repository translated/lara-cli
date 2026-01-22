import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
});
