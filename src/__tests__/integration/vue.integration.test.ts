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

describe('Vue Repository Integration Tests', () => {
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
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-vue-${Date.now()}-${Math.random().toString(36).substring(7)}`);
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

  it('should handle a Vue component repository', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<template>
  <div>{{ $t('greeting') }}</div>
</template>

<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye"
  }
}
</i18n>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Goodbye');
    expect(content).toContain('"it":');
    // Template should be preserved
    expect(content).toContain('<template>');
    expect(content).toContain("{{ $t('greeting') }}");
  });

  it('should handle multiple Vue components', async () => {
    // Set up multiple Vue components
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    
    await writeFile(
      path.join(testDir, 'src', 'components', 'Button.vue'),
      `<template><button>{{ $t('label') }}</button></template>
<i18n>
{"en": {"label": "Click me"}}
</i18n>`
    );

    await writeFile(
      path.join(testDir, 'src', 'components', 'Card.vue'),
      `<template><div>{{ $t('title') }}</div></template>
<i18n>
{"en": {"title": "Card Title", "description": "Card description"}}
</i18n>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations for both components
    const buttonContent = await readFile(path.join(testDir, 'src', 'components', 'Button.vue'), 'utf-8');
    const cardContent = await readFile(path.join(testDir, 'src', 'components', 'Card.vue'), 'utf-8');

    expect(buttonContent).toContain('[it] Click me');
    expect(cardContent).toContain('[it] Card Title');
    expect(cardContent).toContain('[it] Card description');
  });

  it('should add keys to existing locales when source is changed', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye"
  }
}
</i18n>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Goodbye');
    expect(content).toContain('"it":');

    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye",
    "welcome": "Welcome"
      }
    }
    </i18n>`
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newContent = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(newContent).toContain('[it] Welcome');
    expect(newContent).toContain('[it] Goodbye');
    expect(newContent).toContain('[it] Hello World');
  });

  it('should remove keys from existing locales when source is changed', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye",
    "welcome": "Welcome"
  }
}
</i18n>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Goodbye');
    expect(content).toContain('[it] Welcome');

    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World"
  }
}
</i18n>`
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newContent = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(newContent).toContain('[it] Hello World');
    expect(newContent).not.toContain('[it] Goodbye');
    expect(newContent).not.toContain('[it] Welcome');
  });

  it('should maintain the same order of keys in existing locales', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "welcome": "Welcome"
  }
}
</i18n>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye",
    "welcome": "Welcome"
  }
}
</i18n>`
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations and order
    const newContent = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');

    // Check that the order of keys is maintained in the <i18n> block
    const match = newContent.match(/<i18n>\s*({[\s\S]*?})\s*<\/i18n>/);
    expect(match).toBeTruthy();
    const i18nJson = match![1];
    const localeData = JSON.parse(i18nJson || '{}');

    // Check English order
    const enKeys = Object.keys(localeData.en);
    expect(enKeys).toEqual(['greeting', 'farewell', 'welcome']);
    // Italian order should match English
    if (localeData.it) {
      const itKeys = Object.keys(localeData.it);
      expect(itKeys).toEqual(['greeting', 'farewell', 'welcome']);
    }
  });

  it('should handle empty i18n block', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      '<i18n></i18n>'
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newContent = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(newContent).toEqual(`<i18n>
{}
</i18n>`);
  });

  it('should handle no i18n block', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      '<template><div>{{ $t("greeting") }}</div></template>'
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newContent = await readFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), 'utf-8');
    expect(newContent).toEqual(`<template><div>{{ $t("greeting") }}</div></template>

<i18n>
{}
</i18n>
`);
  });

  it('should handle invalid json syntax in i18n block', async () => {

    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      '<i18n>{invalid json}</i18n>'
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify error is logged but translation completes gracefully
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to parse i18n JSON content in Vue file',
      expect.any(Error)
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
