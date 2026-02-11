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

describe('Android XML Repository Integration Tests', () => {
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
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-xml-${Date.now()}-${Math.random().toString(36).substring(7)}`);
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

  it('should handle an Android XML repository', async () => {
    // Set up Android XML repository structure
    // Android XML uses res/[locale]/strings.xml structure
    await mkdir(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My Application</string>
    <string name="hello">Hello World</string>
    <string name="welcome">Welcome to the app</string>
</resources>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'android/app/src/main/res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation - Android uses locale-specific directories
    const itDir = path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'it');
    expect(existsSync(path.join(itDir, 'strings.xml'))).toBe(true);

    const content = await readFile(path.join(itDir, 'strings.xml'), 'utf-8');
    expect(content).toContain('[it] My Application');
    expect(content).toContain('[it] Hello World');
    expect(content).toContain('[it] Welcome to the app');
    // Verify XML structure is preserved
    expect(content).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(content).toContain('<resources>');
    expect(content).toContain('<string name="app_name">');
  });

  it('should handle Android XML with plural resources', async () => {
    // Set up Android XML with plural resources
    await mkdir(path.join(testDir, 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'res', 'it', 'strings.xml'), 'utf-8');
    expect(content).toContain('[it] My App');
    expect(content).toContain('[it] %d item');
    expect(content).toContain('[it] %d items');
    expect(content).toContain('<plurals name="item_count">');
    expect(content).toContain('<item quantity="one">');
    expect(content).toContain('<item quantity="other">');
  });

  it('should handle Android XML with string array resources', async () => {
    // Set up Android XML with string array resources
    await mkdir(path.join(testDir, 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string-array name="colors">
          <item>Red</item>
          <item>Green</item>
          <item>Blue</item>
        </string-array>
      </resources>
    `);

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'res', 'it', 'strings.xml'), 'utf-8');
    expect(content).toContain('<string-array name="colors">');
    expect(content).toContain('<item>[it] Red</item>');
    expect(content).toContain('<item>[it] Green</item>');
    expect(content).toContain('<item>[it] Blue</item>');
  });

  it('should add new lines to Android XML when source is changed', async () => {

    await mkdir(path.join(testDir, 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="app_name">My App</string>
        <string name="welcome">Welcome</string>
      </resources>
    `);

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    await writeFile(
      path.join(testDir, 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="app_name">My App</string>
        <string name="welcome">Welcome</string>
        <string name="goodbye">Goodbye</string>
      </resources>
    `);

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'res', 'it', 'strings.xml'), 'utf-8');
    expect(newContent).toContain('[it] My App');
    expect(newContent).toContain('[it] Welcome');
    expect(newContent).toContain('[it] Goodbye');
    expect(newContent).toContain('<string name="goodbye">[it] Goodbye</string>');
  });

  it('should remove lines from Android XML when source is changed', async () => {
    // Set up Android XML repository structure
    await mkdir(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="app_name">My App</string>
        <string name="welcome">Welcome</string>
        <string name="goodbye">Goodbye</string>
      </resources>
    `);

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'android/app/src/main/res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'it', 'strings.xml'), 'utf-8');
    expect(content).toContain('[it] My App');
    expect(content).toContain('[it] Welcome');
    expect(content).toContain('[it] Goodbye');

    await writeFile(
      path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="app_name">My App</string>
      </resources>
    `);

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'it', 'strings.xml'), 'utf-8');
    expect(newContent).toContain('[it] My App');
    expect(newContent).not.toContain('[it] Welcome');
    expect(newContent).not.toContain('[it] Goodbye');
  });

  it('should maintain Android XML file order when source is changed', async () => {
    // Set up Android XML repository structure with mixed element types
    await mkdir(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="app_name">My App</string>
        <plurals name="item_count">
          <item quantity="one">%d item</item>
          <item quantity="other">%d items</item>
        </plurals>
        <string name="welcome">Welcome</string>
        <string-array name="colors">
          <item>Red</item>
          <item>Green</item>
        </string-array>
        <string name="goodbye">Goodbye</string>
      </resources>
    `);

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'android/app/src/main/res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify initial translation and order
    const initialContent = await readFile(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'it', 'strings.xml'), 'utf-8');
    expect(initialContent).toContain('[it] My App');
    expect(initialContent).toContain('[it] Welcome');
    expect(initialContent).toContain('[it] Goodbye');
    expect(initialContent).toContain('<plurals name="item_count">');
    expect(initialContent).toContain('<string-array name="colors">');
    
    // Verify initial order: app_name < item_count (plurals) < welcome < colors (string-array) < goodbye
    const appNameIndex = initialContent.indexOf('app_name');
    const itemCountIndex = initialContent.indexOf('item_count');
    const welcomeIndex = initialContent.indexOf('welcome');
    const colorsIndex = initialContent.indexOf('colors');
    const goodbyeIndex = initialContent.indexOf('goodbye');
    expect(appNameIndex).toBeLessThan(itemCountIndex);
    expect(itemCountIndex).toBeLessThan(welcomeIndex);
    expect(welcomeIndex).toBeLessThan(colorsIndex);
    expect(colorsIndex).toBeLessThan(goodbyeIndex);

    // Insert a new string element between welcome and colors (string-array)
    await writeFile(
      path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="app_name">My App</string>
        <plurals name="item_count">
          <item quantity="one">%d item</item>
          <item quantity="other">%d items</item>
        </plurals>
        <string name="welcome">Welcome</string>
        <string name="hello">Hello</string>
        <string-array name="colors">
          <item>Red</item>
          <item>Green</item>
        </string-array>
        <string name="goodbye">Goodbye</string>
      </resources>
    `);

    // Re-translate
    (ConfigProvider as any).instance = null;
    await executeCommand(translateCommand, []);

    // Verify translation includes new key and all elements are present
    const newContent = await readFile(path.join(testDir, 'android', 'app', 'src', 'main', 'res', 'it', 'strings.xml'), 'utf-8');
    expect(newContent).toContain('[it] My App');
    expect(newContent).toContain('[it] Welcome');
    expect(newContent).toContain('[it] Hello');
    expect(newContent).toContain('[it] Goodbye');
    expect(newContent).toContain('<plurals name="item_count">');
    expect(newContent).toContain('<string-array name="colors">');
    
    // Verify order is maintained: app_name < item_count (plurals) < welcome < hello < colors (string-array) < goodbye
    const newAppNameIndex = newContent.indexOf('app_name');
    const newItemCountIndex = newContent.indexOf('item_count');
    const newWelcomeIndex = newContent.indexOf('welcome');
    const newHelloIndex = newContent.indexOf('hello');
    const newColorsIndex = newContent.indexOf('colors');
    const newGoodbyeIndex = newContent.indexOf('goodbye');
    expect(newAppNameIndex).toBeLessThan(newItemCountIndex);
    expect(newItemCountIndex).toBeLessThan(newWelcomeIndex);
    expect(newWelcomeIndex).toBeLessThan(newHelloIndex);
    expect(newHelloIndex).toBeLessThan(newColorsIndex);
    expect(newColorsIndex).toBeLessThan(newGoodbyeIndex);
  });

  it('should handle an empty Android XML file correctly', async () => {
    // Set up Android XML repository structure with empty XML file
    await mkdir(path.join(testDir, 'res', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'res', 'en', 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'res/[locale]/strings.xml',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate - should not crash with empty file
    await executeCommand(translateCommand, []);

    // Verify translation file was created (even if empty)
    const itDir = path.join(testDir, 'res', 'it');
    expect(existsSync(path.join(itDir, 'strings.xml'))).toBe(true);

    const content = await readFile(path.join(itDir, 'strings.xml'), 'utf-8');
    // Verify XML structure is preserved
    expect(content).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(content).toContain('<resources>');
    expect(content).toContain('</resources>');
  });

});