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

describe('PO (Gettext) Repository Integration Tests', () => {
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
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-po-${Date.now()}-${Math.random().toString(36).substring(7)}`);
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

  it('should handle a PO file repository', async () => {
    // Set up PO repository structure
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hello"

msgid "World"
msgstr "World"

msgid "Welcome"
msgstr "Welcome to our application"
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
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(content).toContain('[it] Hello');
    expect(content).toContain('[it] World');
    expect(content).toContain('[it] Welcome to our application');
    // Verify PO file structure is preserved
    expect(content).toContain('msgid "Hello"');
    expect(content).toContain('msgstr');
  });

  it('should handle PO files with context', async () => {
    // Set up PO repository with context
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgctxt "button"
msgid "Save"
msgstr "Save"

msgctxt "button"
msgid "Cancel"
msgstr "Cancel"
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
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(content).toContain('[it] Save');
    expect(content).toContain('[it] Cancel');
    expect(content).toContain('msgctxt "button"');
  });

  it('should add keys to existing locales when source is changed', async () => {
    // Set up PO repository structure
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `msgid ""
      msgstr ""
      "Content-Type: text/plain; charset=UTF-8\\n"

      msgid "Hello"
      msgstr "Hello"
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
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(content).toContain('[it] Hello');
    expect(content).not.toContain('[it] World');

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

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(newContent).toContain('[it] Hello');
    expect(newContent).toContain('[it] World');
  });

  it('should remove keys from existing locales when source is changed', async () => {
    // Set up PO repository structure
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
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

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(content).toContain('[it] Hello');
    expect(content).toContain('[it] World');

    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `msgid ""
      msgstr ""
      "Content-Type: text/plain; charset=UTF-8\\n"

      msgid "Hello"
      msgstr "Hello"
    `
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(newContent).toContain('[it] Hello');
    expect(newContent).not.toContain('[it] World');
  });

  it('should maintain the same order of keys in existing locales', async () => {
    // Set up PO repository structure
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
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

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `msgid ""
      msgstr ""
      "Content-Type: text/plain; charset=UTF-8\\n"

      msgid "Hello"
      msgstr "Hello"

      msgid "Welcome"
      msgstr "Welcome to our application"

      msgid "World"
      msgstr "World"
    `
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation and order
    const newContent = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    const helloIdx = newContent.indexOf('[it] Hello');
    const welcomeIdx = newContent.indexOf('[it] Welcome to our application');
    const worldIdx = newContent.indexOf('[it] World');

    expect(helloIdx).toBeGreaterThan(-1);
    expect(welcomeIdx).toBeGreaterThan(-1);
    expect(worldIdx).toBeGreaterThan(-1);

    // Ensure the order is: Hello, Welcome, World
    expect(helloIdx).toBeLessThan(welcomeIdx);
    expect(welcomeIdx).toBeLessThan(worldIdx);
  });

  it('should handle empty PO file', async () => {
    // Set up PO repository structure
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      ``
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'locales', 'it', 'messages.po'), 'utf-8');
    expect(newContent).toContain('msgid ""');
    expect(newContent).toContain('msgstr ""');
  });

  it('should handle invalid PO file', async () => {
    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set up PO repository structure
    await mkdir(path.join(testDir, 'locales', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'locales', 'en', 'messages.po'),
      `
      {invalid json}

      msgstr "Hello"
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
      'locales/[locale]/messages.po',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate - expect it to throw an error due to invalid PO file
    await expect(executeCommand(translateCommand, [])).rejects.toThrow('Process exited with code 1');

    // Verify error and console output
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error translating locales/[locale]/messages.po'),
      expect.any(String)
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
