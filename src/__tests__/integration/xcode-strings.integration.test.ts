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

describe('Xcode .strings Repository Integration Tests', () => {
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
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-strings-${Date.now()}-${Math.random().toString(36).substring(7)}`);
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

  it('should handle an Xcode .strings repository', async () => {
    // Set up Xcode .strings repository structure
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
"hello" = "Hello World";
"welcome" = "Welcome to the app";
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.strings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const itDir = path.join(testDir, 'it.lproj');
    expect(existsSync(path.join(itDir, 'Localizable.strings'))).toBe(true);

    const content = await readFile(path.join(itDir, 'Localizable.strings'), 'utf-8');
    expect(content).toContain('[it] My Application');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Welcome to the app');
  });

  it('should handle .strings with comments', async () => {
    // Set up Xcode .strings file with section comments
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `/* General section */
"app_name" = "My Application";

/* Greetings section */
"hello" = "Hello World";
"welcome" = "Welcome to the app";
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.strings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(content).toContain('[it] My Application');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Welcome to the app');
    // Verify comment structure is maintained
    expect(content).toContain('/* General section */');
    expect(content).toContain('/* Greetings section */');
  });

  it('should add new keys when source is changed', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
"hello" = "Hello World";
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.strings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Add a new key to source
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
"hello" = "Hello World";
"goodbye" = "Goodbye";
`
    );

    // Translate again
    await executeCommand(translateCommand, []);

    // Verify translation includes new key
    const content = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(content).toContain('[it] My Application');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Goodbye');
  });

  it('should remove keys when source is changed', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
"hello" = "Hello World";
"welcome" = "Welcome to the app";
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.strings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify all keys are translated
    const contentBefore = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(contentBefore).toContain('[it] My Application');
    expect(contentBefore).toContain('[it] Hello World');
    expect(contentBefore).toContain('[it] Welcome to the app');

    // Remove 2 keys from source
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
`
    );

    // Translate again
    await executeCommand(translateCommand, []);

    // Verify removed keys are absent
    const contentAfter = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(contentAfter).toContain('[it] My Application');
    expect(contentAfter).not.toContain('[it] Hello World');
    expect(contentAfter).not.toContain('[it] Welcome to the app');
  });

  it('should handle empty .strings file', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      ''
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.strings',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate - should not crash with empty file
    await executeCommand(translateCommand, []);

    // Verify translation file was created
    const itDir = path.join(testDir, 'it.lproj');
    expect(existsSync(path.join(itDir, 'Localizable.strings'))).toBe(true);
  });

  it('should not add ignored keys to new target files', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
"hello" = "Hello World";
"welcome" = "Welcome to the app";
`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', '[locale].lproj/Localizable.strings',
    ]);

    // Add ignoredKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-strings'].ignoredKeys = ['hello'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(content).toContain('[it] My Application');
    expect(content).toContain('[it] Welcome to the app');
    // Ignored key should NOT be translated (no [it] prefix)
    expect(content).not.toContain('[it] Hello World');
  });

  it('should preserve ignored keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Application";
"hello" = "Hello World";
"welcome" = "Welcome to the app";
`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source', 'en',
      '--target', 'it',
      '--paths', '[locale].lproj/Localizable.strings',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys
    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(contentBefore).toContain('[it] Hello World');

    // Add ignoredKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-strings'].ignoredKeys = ['hello'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.strings'),
      `"app_name" = "My Updated Application";
"hello" = "Hello World";
"welcome" = "Welcome to the app";
`
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(path.join(testDir, 'it.lproj', 'Localizable.strings'), 'utf-8');
    expect(contentAfter).toContain('[it] My Updated Application');
    expect(contentAfter).toContain('[it] Hello World'); // preserved, not removed
    expect(contentAfter).toContain('[it] Welcome to the app');
  });

});
