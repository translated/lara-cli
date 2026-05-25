/**
 * U+FFFD retry guard — integration tests.
 *
 * The upstream Lara SDK has a UTF-8 streaming bug that corrupts multi-byte
 * characters split across TCP chunks (see `sdk-utf8-streaming.repro.test.ts`).
 * `TranslationEngine.executeTasks` mitigates it by detecting `�` in any
 * translation result and re-issuing the affected texts as solo calls — whose
 * tiny responses almost never span a chunk boundary.
 *
 * These tests drive the mitigation through the mocked TranslationService:
 *   1. Batch comes back with U+FFFD in one entry → solo retry is issued and
 *      the corrupted value is replaced with a clean one in the output file.
 *   2. Solo retry STILL returns U+FFFD → translate throws a clear error.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { executeCommand, mockTranslate, mockTranslateBatchWithFallback } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('U+FFFD retry guard', () => {
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
      `test-utf8-retry-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;
    mockTranslate.mockReset();
    mockTranslateBatchWithFallback.mockReset();
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

  async function writeSource(keys: Record<string, string>): Promise<void> {
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
      'bg',
      '--paths',
      'i18n/locales/[locale].json',
    ]);
    (ConfigProvider as any).instance = null;
  }

  it('retries U+FFFD-corrupted batch entries as solo calls and recovers', async () => {
    // Batch returns a result where one entry is corrupted with U+FFFD —
    // the same shape we observed in the wild (`тез��` in Bulgarian).
    mockTranslateBatchWithFallback.mockImplementationOnce(
      async (textBlocks: { text: string; translatable: boolean }[]) =>
        textBlocks.map((block) =>
          block.text === 'these changes'
            ? { text: 'тез�� изменения', translatable: true }
            : { text: `[bg] ${block.text}`, translatable: true }
        )
    );

    // Solo retry returns the clean translation — what a small response gives.
    mockTranslate.mockImplementationOnce(
      async (textBlocks: { text: string; translatable: boolean }[]) => [
        { text: 'тези изменения', translatable: textBlocks[0]!.translatable },
      ]
    );

    await writeSource({ clean: 'hello world', dirty: 'these changes' });
    await initJson();

    await executeCommand(translateCommand, []);

    // One batch call, one solo retry — exactly one of each.
    expect(mockTranslateBatchWithFallback).toHaveBeenCalledTimes(1);
    expect(mockTranslate).toHaveBeenCalledTimes(1);

    // The retry was issued for the corrupted text only.
    const [retryBlocks] = mockTranslate.mock.calls[0]!;
    expect(retryBlocks).toEqual([{ text: 'these changes', translatable: true }]);

    // Output file has the clean translation in place of the corrupted one.
    const bgContent = JSON.parse(
      await readFile(path.join(testDir, 'i18n', 'locales', 'bg.json'), 'utf-8')
    );
    expect(bgContent.clean).toBe('[bg] hello world');
    expect(bgContent.dirty).toBe('тези изменения');
    expect(JSON.stringify(bgContent)).not.toContain('�');
  });

  it('falls through to a neutral retry-please message after several silent retries', async () => {
    mockTranslateBatchWithFallback.mockImplementationOnce(
      async (textBlocks: { text: string; translatable: boolean }[]) =>
        textBlocks.map(() => ({ text: 'тез�� изменения', translatable: true }))
    );
    // Every solo retry also comes back corrupt — extremely unlikely in real
    // life, but the engine must give up after a few attempts and surface a
    // short message instead of writing a broken file.
    mockTranslate.mockImplementation(async () => [{ text: 'тез�� изменения', translatable: true }]);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await writeSource({ dirty: 'these changes' });
    await initJson();

    // The translate command catches engine errors and logs them via
    // console.error, then sets hasErrors and exits with code 1.
    await expect(executeCommand(translateCommand, [])).rejects.toThrow(
      /Process exited with code 1/
    );

    // Three silent solo retries before giving up.
    expect(mockTranslate).toHaveBeenCalledTimes(3);

    const loggedMessages = consoleErrorSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(loggedMessages).toMatch(/Translation failed for some keys\. Please retry\./);
    // No SDK internals leak into user-facing output.
    expect(loggedMessages).not.toMatch(/U\+FFFD/);
    expect(loggedMessages).not.toMatch(/@translated\/lara/);
    expect(loggedMessages).not.toMatch(/chunk\.toString/);

    consoleErrorSpy.mockRestore();
  });
});
