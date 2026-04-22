import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import yaml from 'yaml';

import { executeCommand, mockTranslate, mockTranslateBatchWithFallback } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Batch translation', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExit = process.exit;

    process.exit = vi.fn() as any;

    testDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `test-batch-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });

    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;

    mockTranslate.mockClear();
    mockTranslateBatchWithFallback.mockClear();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exit = originalExit;

    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }

    const lockFilePath = path.join(originalCwd, 'lara.lock');
    if (existsSync(lockFilePath)) {
      await unlink(lockFilePath).catch(() => {});
    }

    (ConfigProvider as any).instance = null;
  });

  async function writeJsonSource(keys: Record<string, string>): Promise<void> {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(keys, null, 2)
    );
  }

  async function initJson(): Promise<void> {
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
  }

  async function patchConfig(mutate: (cfg: any) => void): Promise<void> {
    const configPath = path.join(testDir, 'lara.yaml');
    const cfg = yaml.parse(await readFile(configPath, 'utf-8'));
    mutate(cfg);
    await writeFile(configPath, yaml.stringify(cfg));
    (ConfigProvider as any).instance = null;
  }

  it('sends all plain keys in a single batch call', async () => {
    const keys = {
      k1: 'one',
      k2: 'two',
      k3: 'three',
      k4: 'four',
      k5: 'five',
    };
    await writeJsonSource(keys);
    await initJson();

    await executeCommand(translateCommand, []);

    expect(mockTranslateBatchWithFallback).toHaveBeenCalledTimes(1);
    const [textBlocks, , targetLocale] = mockTranslateBatchWithFallback.mock.calls[0]!;
    expect(targetLocale).toBe('it');
    expect(textBlocks.map((b) => b.text)).toEqual(['one', 'two', 'three', 'four', 'five']);

    // Non-batchable path (single translate) must NOT have been hit
    expect(mockTranslate).not.toHaveBeenCalled();

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContent).toEqual({
      k1: '[it] one',
      k2: '[it] two',
      k3: '[it] three',
      k4: '[it] four',
      k5: '[it] five',
    });
  });

  it('chunks batches by translation.batchSize', async () => {
    const keys: Record<string, string> = {};
    for (let i = 1; i <= 7; i++) {
      keys[`k${i}`] = `v${i}`;
    }
    await writeJsonSource(keys);
    await initJson();

    await patchConfig((cfg) => {
      cfg.translation = { batchSize: 3 };
    });

    await executeCommand(translateCommand, []);

    // 7 keys with batchSize 3 → chunks of 3, 3, 1
    expect(mockTranslateBatchWithFallback).toHaveBeenCalledTimes(3);
    const callSizes = mockTranslateBatchWithFallback.mock.calls.map((c) => c[0].length).sort();
    expect(callSizes).toEqual([1, 3, 3]);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    for (let i = 1; i <= 7; i++) {
      expect(itContent[`k${i}`]).toBe(`[it] v${i}`);
    }
  });

  it('translates keys with per-key instructions one-by-one and still batches the rest', async () => {
    await writeJsonSource({
      plain1: 'alpha',
      special: 'beta',
      plain2: 'gamma',
    });
    await initJson();

    await patchConfig((cfg) => {
      const file = cfg.files.json;
      file.keyInstructions = [{ path: 'special', instruction: 'Keep proper noun casing' }];
    });

    await executeCommand(translateCommand, []);

    expect(mockTranslate).toHaveBeenCalledTimes(1);
    const [soloBlocks, , , soloOptions] = mockTranslate.mock.calls[0]!;
    expect(soloBlocks).toEqual([{ text: 'beta', translatable: true }]);
    expect((soloOptions as any).instructions).toEqual(['Keep proper noun casing']);

    expect(mockTranslateBatchWithFallback).toHaveBeenCalledTimes(1);
    const [batchBlocks, , , batchOptions] = mockTranslateBatchWithFallback.mock.calls[0]!;
    expect(batchBlocks.map((b) => b.text)).toEqual(['alpha', 'gamma']);
    expect((batchOptions as any).instructions).toBeUndefined();

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContent).toEqual({
      plain1: '[it] alpha',
      special: '[it] beta',
      plain2: '[it] gamma',
    });
  });

  it('passes fileInstruction to the batched call', async () => {
    await writeJsonSource({ a: 'one', b: 'two' });
    await initJson();

    await patchConfig((cfg) => {
      const file = cfg.files.json;
      file.fileInstructions = [{ path: 'i18n/locales/[locale].json', instruction: 'Be formal' }];
    });

    await executeCommand(translateCommand, []);

    expect(mockTranslateBatchWithFallback).toHaveBeenCalledTimes(1);
    const [, , , options] = mockTranslateBatchWithFallback.mock.calls[0]!;
    expect((options as any).instructions).toEqual(['Be formal']);
  });

  it('skips non-string and empty-string values without calling the API', async () => {
    await mkdir(path.join(testDir, 'i18n', 'locales'), { recursive: true });
    await writeFile(
      path.join(testDir, 'i18n', 'locales', 'en.json'),
      JSON.stringify(
        {
          hello: 'world',
          blank: '',
          count: 42,
        },
        null,
        2
      )
    );
    await initJson();

    await executeCommand(translateCommand, []);

    // Only the "hello" key is actually translatable
    expect(mockTranslateBatchWithFallback).toHaveBeenCalledTimes(1);
    const [blocks] = mockTranslateBatchWithFallback.mock.calls[0]!;
    expect(blocks.map((b) => b.text)).toEqual(['world']);

    const itContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8')
    );
    expect(itContent.hello).toBe('[it] world');
    expect(itContent.blank).toBe('');
    expect(itContent.count).toBe(42);
  });

  it('preserves key order in the output file after batching', async () => {
    await writeJsonSource({
      z: 'first',
      m: 'second',
      a: 'third',
    });
    await initJson();

    await executeCommand(translateCommand, []);

    const raw = await readFile(path.join(testDir, 'i18n', 'locales', 'it.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(Object.keys(parsed)).toEqual(['z', 'm', 'a']);
    expect(parsed).toEqual({
      z: '[it] first',
      m: '[it] second',
      a: '[it] third',
    });
  });
});
