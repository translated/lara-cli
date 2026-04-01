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
    testDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `test-vue-${Date.now()}-${Math.random().toString(36).substring(7)}`
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
    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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
    const buttonContent = await readFile(
      path.join(testDir, 'src', 'components', 'Button.vue'),
      'utf-8'
    );
    const cardContent = await readFile(
      path.join(testDir, 'src', 'components', 'Card.vue'),
      'utf-8'
    );

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
    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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
    const newContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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
    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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
    const newContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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
    const newContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );

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
    await writeFile(path.join(testDir, 'src', 'components', 'HelloWorld.vue'), '<i18n></i18n>');

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
    const newContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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
    const newContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
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

  it('should not add ignored keys to new target files', async () => {
    // Set up Vue repository structure
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye",
    "internal": "Debug info"
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

    // Add ignoredKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.vue.ignoredKeys = ['internal'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Goodbye');
    expect(content).not.toContain('[it] Debug info');
  });

  it('should preserve ignored keys in existing target files', async () => {
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

    // First translate without ignoredKeys - all keys get translated
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    expect(content).toContain('[it] Goodbye');

    // Now add ignoredKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.vue.ignoredKeys = ['farewell'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    // Modify source greeting to trigger re-translate, preserving existing it locale
    const currentContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    const match = currentContent.match(/<i18n>\s*([\s\S]*?)\s*<\/i18n>/);
    const localeData = JSON.parse(match![1]!);
    localeData.en.greeting = 'Hi World';
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>\n${JSON.stringify(localeData, null, 2)}\n</i18n>`
    );

    // Translate again
    await executeCommand(translateCommand, []);

    // Verify: greeting is re-translated, farewell is preserved (not removed)
    const newContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    expect(newContent).toContain('[it] Hi World');
    expect(newContent).toContain('[it] Goodbye');
  });

  it('should copy locked keys from source without translation', async () => {
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye",
    "internal": "Debug info"
  }
}
</i18n>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.vue.lockedKeys = ['internal'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    // Locked key should have source value (no [it] prefix)
    expect(content).not.toContain('[it] Debug info');
    // Non-locked keys should be translated
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Goodbye');
  });

  it('should update locked keys when source changes', async () => {
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "internal": "Debug info"
  }
}
</i18n>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.vue.lockedKeys = ['internal'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    expect(contentBefore).not.toContain('[it] Debug info');

    // Update source value of locked key
    const currentContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    const match = currentContent.match(/<i18n>\s*([\s\S]*?)\s*<\/i18n>/);
    const localeData = JSON.parse(match![1]!);
    localeData.en.internal = 'Updated debug';
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>\n${JSON.stringify(localeData, null, 2)}\n</i18n>`
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    // Locked key should have the new source value
    expect(contentAfter).toContain('Updated debug');
    expect(contentAfter).not.toContain('[it] Updated debug');
    expect(contentAfter).toContain('[it] Hello World');
  });

  it('should only translate included keys when includeKeys is configured', async () => {
    await mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>
{
  "en": {
    "greeting": "Hello World",
    "farewell": "Goodbye",
    "internal": "Debug info"
  }
}
</i18n>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/components/*.vue',
    ]);

    // Add includeKeys to config - only translate greeting
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.vue.includeKeys = ['greeting'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    // Included key should be translated
    expect(content).toContain('[it] Hello World');
    // Non-included keys should NOT be present
    expect(content).not.toContain('[it] Goodbye');
    expect(content).not.toContain('[it] Debug info');
  });

  it('should preserve non-included keys in existing target files', async () => {
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

    // First translate without includeKeys - all keys get translated
    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    expect(contentBefore).toContain('[it] Goodbye');

    // Add includeKeys and modify source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files.vue.includeKeys = ['greeting'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    // Modify source greeting to trigger re-translate, preserving existing it locale
    const currentContent = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    const match = currentContent.match(/<i18n>\s*([\s\S]*?)\s*<\/i18n>/);
    const localeData = JSON.parse(match![1]!);
    localeData.en.greeting = 'Hello Updated World';
    await writeFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      `<i18n>\n${JSON.stringify(localeData, null, 2)}\n</i18n>`
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(
      path.join(testDir, 'src', 'components', 'HelloWorld.vue'),
      'utf-8'
    );
    // Included key should be updated
    expect(contentAfter).toContain('[it] Hello Updated World');
    // Non-included key should be preserved
    expect(contentAfter).toContain('[it] Goodbye');
  });
});
