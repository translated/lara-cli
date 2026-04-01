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

describe('TXT Repository Integration Tests', () => {
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
      `test-txt-${Date.now()}-${Math.random().toString(36).substring(7)}`
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

  it('should handle a plain text repository', async () => {
    // Set up TXT repository structure
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Hello World\n\nWelcome to our application.\n\nThank you for using our product.\n'
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Welcome to our application.');
    expect(content).toContain('[it] Thank you for using our product.');
    // Verify empty lines are preserved
    expect(content).toContain('\n\n');
  });

  it('should add new lines to target when source is changed', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), 'Hello World\n');

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate initial version
    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).not.toContain('[it] Welcome');

    // Add a new line to source
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), 'Hello World\nWelcome\n');

    // Translate updated version
    await executeCommand(translateCommand, []);

    const newContent = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(newContent).toContain('[it] Hello World');
    expect(newContent).toContain('[it] Welcome');
  });

  it('should remove lines from target when source is changed', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), 'Hello World\nWelcome\n');

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate initial version
    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Welcome');

    // Remove a line from source
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), 'Hello World\n');

    // Translate updated version
    await executeCommand(translateCommand, []);

    const newContent = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(newContent).toContain('[it] Hello World');
    expect(newContent).not.toContain('[it] Welcome');
  });

  it('should handle empty txt files', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), '');

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(content).toEqual('');
  });

  it('should not add ignored keys to new target files', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Hello World\nDo not translate this\nGoodbye\n'
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    // Add ignoredKeys
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.txt.ignoredKeys = ['line_1'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    // line_1 is "Do not translate this" - should NOT be translated
    expect(content).not.toContain('[it] Do not translate this');
    // Other lines should be translated
    expect(content).toContain('[it] Goodbye');
  });

  it('should preserve ignored keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), 'Hello World\nKeep this\n');

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys
    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'texts', 'it', 'messages.txt'),
      'utf-8'
    );
    expect(contentBefore).toContain('[it] Keep this');

    // Add ignoredKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.txt.ignoredKeys = ['line_1'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Updated Title\nKeep this\n'
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(contentAfter).toContain('[it] Updated Title');
    // line_1 preserved with its previous translated value
    expect(contentAfter).toContain('[it] Keep this');
  });

  it('should copy locked keys from source without translation', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Hello World\nDo not translate\nGoodbye\n'
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    // Add lockedKeys
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.txt.lockedKeys = ['line_1'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    // line_0 should be translated
    expect(content).toContain('[it] Hello World');
    // line_1 is locked - should have source value without [it] prefix
    expect(content).toContain('Do not translate');
    expect(content).not.toContain('[it] Do not translate');
    // line_2 should be translated
    expect(content).toContain('[it] Goodbye');
  });

  it('should update locked keys when source changes', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Hello World\nLocked content\n'
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    // Add lockedKeys
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.txt.lockedKeys = ['line_1'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'texts', 'it', 'messages.txt'),
      'utf-8'
    );
    expect(contentBefore).toContain('Locked content');
    expect(contentBefore).not.toContain('[it] Locked content');

    // Update source value of locked key
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Hello World\nUpdated locked content\n'
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    // Locked key should have new source value
    expect(contentAfter).toContain('Updated locked content');
    expect(contentAfter).not.toContain('[it] Updated locked content');
    expect(contentAfter).toContain('[it] Hello World');
  });

  it('should preserve structure with multiple empty lines', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Section One\n\n\nSection Two\n\nSection Three\n'
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    expect(content).toContain('[it] Section One');
    expect(content).toContain('[it] Section Two');
    expect(content).toContain('[it] Section Three');
    // Verify the double empty line is preserved
    expect(content).toContain('\n\n\n');
  });

  it('should handle [locale] at the start of the path', async () => {
    // Set up TXT files with locale as the first directory (no parent)
    await mkdir(path.join(testDir, 'en'), { recursive: true });
    await writeFile(path.join(testDir, 'en', 'messages.txt'), 'Hello World\nWelcome\n');

    // Initialize with [locale] at the start of path
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'it', 'messages.txt'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Welcome');
  });

  it('should only translate included keys when includeKeys is configured', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Hello World\nDo not translate this\nGoodbye\n'
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    // Add includeKeys - only translate line_0
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.txt.includeKeys = ['line_0'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    // Included line should be translated
    expect(content).toContain('[it] Hello World');
    // Non-included lines should NOT be present
    expect(content).not.toContain('[it] Do not translate this');
    expect(content).not.toContain('[it] Goodbye');
  });

  it('should preserve non-included keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'texts', 'en'), { recursive: true });
    await writeFile(path.join(testDir, 'texts', 'en', 'messages.txt'), 'Hello World\nKeep this\n');

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'texts/[locale]/messages.txt',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without includeKeys
    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'texts', 'it', 'messages.txt'),
      'utf-8'
    );
    expect(contentBefore).toContain('[it] Keep this');

    // Add includeKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.txt.includeKeys = ['line_0'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'texts', 'en', 'messages.txt'),
      'Updated Title\nKeep this\n'
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(path.join(testDir, 'texts', 'it', 'messages.txt'), 'utf-8');
    // Included line should be updated
    expect(contentAfter).toContain('[it] Updated Title');
    // Non-included line should be preserved
    expect(contentAfter).toContain('[it] Keep this');
  });
});
