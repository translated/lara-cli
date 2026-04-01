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

describe('Xcode .stringsdict Repository Integration Tests', () => {
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
      `test-stringsdict-${Date.now()}-${Math.random().toString(36).substring(7)}`
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

  it('should handle an Xcode .stringsdict repository', async () => {
    // Set up .stringsdict repository structure
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const itDir = path.join(testDir, 'it.lproj');
    expect(existsSync(path.join(itDir, 'Localizable.stringsdict'))).toBe(true);

    const content = await readFile(path.join(itDir, 'Localizable.stringsdict'), 'utf-8');
    expect(content).toContain('[it] %d item');
    expect(content).toContain('[it] %d items');
    // Verify plist structure is preserved
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain('<plist version="1.0">');
    expect(content).toContain('<key>item_count</key>');
  });

  it('should handle multiple plural entries', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify both plural entries are translated
    const content = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(content).toContain('[it] %d item');
    expect(content).toContain('[it] %d items');
    expect(content).toContain('[it] %d day');
    expect(content).toContain('[it] %d days');
    expect(content).toContain('<key>item_count</key>');
    expect(content).toContain('<key>day_count</key>');
  });

  it('should handle all CLDR plural categories', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>zero</key>
            <string>No items</string>
            <key>one</key>
            <string>%d item</string>
            <key>two</key>
            <string>%d items (two)</string>
            <key>few</key>
            <string>%d items (few)</string>
            <key>many</key>
            <string>%d items (many)</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify all CLDR plural categories in output
    const content = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(content).toContain('[it] No items');
    expect(content).toContain('[it] %d item');
    expect(content).toContain('[it] %d items (two)');
    expect(content).toContain('[it] %d items (few)');
    expect(content).toContain('[it] %d items (many)');
    expect(content).toContain('[it] %d items');
    expect(content).toContain('<key>zero</key>');
    expect(content).toContain('<key>one</key>');
    expect(content).toContain('<key>two</key>');
    expect(content).toContain('<key>few</key>');
    expect(content).toContain('<key>many</key>');
    expect(content).toContain('<key>other</key>');
  });

  it('should add new plural entries when source is changed', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate
    await executeCommand(translateCommand, []);

    // Verify initial translation
    const initialContent = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(initialContent).toContain('[it] %d item');
    expect(initialContent).toContain('[it] %d items');

    // Add a new plural entry to the source
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Re-translate
    (ConfigProvider as any).instance = null;
    await executeCommand(translateCommand, []);

    // Verify new entry is in target
    const newContent = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(newContent).toContain('[it] %d item');
    expect(newContent).toContain('[it] %d items');
    expect(newContent).toContain('[it] %d day');
    expect(newContent).toContain('[it] %d days');
    expect(newContent).toContain('<key>day_count</key>');
  });

  it('should remove plural entries when source is changed', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate
    await executeCommand(translateCommand, []);

    // Verify both entries exist
    const initialContent = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(initialContent).toContain('<key>item_count</key>');
    expect(initialContent).toContain('<key>day_count</key>');

    // Remove day_count from source
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    // Re-translate
    (ConfigProvider as any).instance = null;
    await executeCommand(translateCommand, []);

    // Verify removed entry is absent
    const newContent = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(newContent).toContain('<key>item_count</key>');
    expect(newContent).not.toContain('<key>day_count</key>');
    expect(newContent).not.toContain('[it] %d day');
    expect(newContent).not.toContain('[it] %d days');
  });

  it('should handle empty stringsdict file', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate - should not crash with empty file
    await executeCommand(translateCommand, []);

    // Verify translation file was created (even if empty)
    const itDir = path.join(testDir, 'it.lproj');
    expect(existsSync(path.join(itDir, 'Localizable.stringsdict'))).toBe(true);

    const content = await readFile(path.join(itDir, 'Localizable.stringsdict'), 'utf-8');
    // Verify plist structure is preserved
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain('<plist version="1.0">');
    expect(content).toContain('<dict>');
    expect(content).toContain('</dict>');
  });

  it('should not add ignored keys to new target files', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    // Add ignoredKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-stringsdict'].ignoredKeys = ['item_count/*'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // day_count should be translated
    expect(content).toContain('[it] %d day');
    expect(content).toContain('[it] %d days');
    // item_count should NOT be present (ignored key not added to new target)
    expect(content).not.toContain('[it] %d item');
    expect(content).not.toContain('[it] %d items');
  });

  it('should preserve ignored keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without ignoredKeys
    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(contentBefore).toContain('[it] %d item');
    expect(contentBefore).toContain('[it] %d items');
    expect(contentBefore).toContain('[it] %d day');
    expect(contentBefore).toContain('[it] %d days');

    // Add ignoredKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-stringsdict'].ignoredKeys = ['item_count/*'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    // Modify the source to trigger a re-translation
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day remaining</string>
            <key>other</key>
            <string>%d days remaining</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // item_count should be preserved (not removed) even though it's ignored
    expect(contentAfter).toContain('[it] %d item');
    expect(contentAfter).toContain('[it] %d items');
    // day_count should be re-translated with updated values
    expect(contentAfter).toContain('[it] %d day remaining');
    expect(contentAfter).toContain('[it] %d days remaining');
  });

  it('should copy locked keys from source without translation', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-stringsdict'].lockedKeys = ['item_count/*'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // Locked keys should have source values (no [it] prefix)
    expect(content).not.toContain('[it] %d item');
    expect(content).not.toContain('[it] %d items');
    // Non-locked keys should be translated
    expect(content).toContain('[it] %d day');
    expect(content).toContain('[it] %d days');
  });

  it('should update locked keys when source changes', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    // Add lockedKeys to config
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-stringsdict'].lockedKeys = ['item_count/*'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(contentBefore).not.toContain('[it] %d item');

    // Update source value of locked key
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d element</string>
            <key>other</key>
            <string>%d elements</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // Locked keys should have the new source values
    expect(contentAfter).toContain('%d element');
    expect(contentAfter).toContain('%d elements');
    expect(contentAfter).not.toContain('[it] %d element');
    expect(contentAfter).not.toContain('[it] %d elements');
    // Non-locked keys should be translated
    expect(contentAfter).toContain('[it] %d day');
    expect(contentAfter).toContain('[it] %d days');
  });

  it('should only translate included keys when includeKeys is configured', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    // Add includeKeys - only translate day_count
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-stringsdict'].includeKeys = ['day_count/*'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await executeCommand(translateCommand, []);

    const content = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // Included keys should be translated
    expect(content).toContain('[it] %d day');
    expect(content).toContain('[it] %d days');
    // Non-included keys should NOT be present
    expect(content).not.toContain('[it] %d item');
    expect(content).not.toContain('[it] %d items');
  });

  it('should preserve non-included keys in existing target files', async () => {
    await mkdir(path.join(testDir, 'en.lproj'), { recursive: true });
    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d day</string>
            <key>other</key>
            <string>%d days</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      '[locale].lproj/Localizable.stringsdict',
    ]);

    (ConfigProvider as any).instance = null;

    // First translate without includeKeys - all keys get translated
    await executeCommand(translateCommand, []);

    const contentBefore = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    expect(contentBefore).toContain('[it] %d item');

    // Add includeKeys and update source to trigger re-translate
    const configPath = path.join(testDir, 'lara.yaml');
    const config = yaml.parse(await readFile(configPath, 'utf-8'));
    config.files['xcode-stringsdict'].includeKeys = ['day_count/*'];
    await writeFile(configPath, yaml.stringify(config));
    (ConfigProvider as any).instance = null;

    await writeFile(
      path.join(testDir, 'en.lproj', 'Localizable.stringsdict'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>day_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d jour</string>
            <key>other</key>
            <string>%d jours</string>
        </dict>
    </dict>
</dict>
</plist>`
    );

    await executeCommand(translateCommand, []);

    const contentAfter = await readFile(
      path.join(testDir, 'it.lproj', 'Localizable.stringsdict'),
      'utf-8'
    );
    // Included keys should be updated
    expect(contentAfter).toContain('[it] %d jour');
    expect(contentAfter).toContain('[it] %d jours');
    // Non-included keys should be preserved
    expect(contentAfter).toContain('[it] %d item');
    expect(contentAfter).toContain('[it] %d items');
  });
});
