import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { executeCommand } from './test-helpers.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Direct Translation Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

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
      `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;

    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stdoutWriteSpy.mockRestore();
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

  describe('text mode', () => {
    it('should translate text and output to stdout', async () => {
      await executeCommand(translateCommand, [
        '--text',
        'Hello, world!',
        '--source',
        'en',
        '--target',
        'fr',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[fr] Hello, world!\n');
    });

    it('should work without a lara.yaml config file', async () => {
      // No config file in the test directory
      expect(existsSync(path.join(testDir, 'lara.yaml'))).toBe(false);

      await executeCommand(translateCommand, [
        '--text',
        'Hello',
        '--source',
        'en',
        '--target',
        'it',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[it] Hello\n');
    });

    it('should support BCP 47 locale codes', async () => {
      await executeCommand(translateCommand, [
        '--text',
        'Hello',
        '--source',
        'en-US',
        '--target',
        'fr-FR',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[fr-FR] Hello\n');
    });

    it('should error when text is empty', async () => {
      await expect(
        executeCommand(translateCommand, ['--text', '   ', '--source', 'en', '--target', 'fr'])
      ).rejects.toThrow();
    });

    it('should error when --source is missing', async () => {
      await expect(
        executeCommand(translateCommand, ['--text', 'Hello', '--target', 'fr'])
      ).rejects.toThrow();
    });

    it('should error when --target is missing', async () => {
      await expect(
        executeCommand(translateCommand, ['--text', 'Hello', '--source', 'en'])
      ).rejects.toThrow();
    });

    it('should error when source equals target', async () => {
      await expect(
        executeCommand(translateCommand, ['--text', 'Hello', '--source', 'en', '--target', 'en'])
      ).rejects.toThrow();
    });

    it('should error when --text and --file are used together', async () => {
      await writeFile(path.join(testDir, 'test.txt'), 'Hello');

      await expect(
        executeCommand(translateCommand, [
          '--text',
          'Hello',
          '--file',
          path.join(testDir, 'test.txt'),
          '--source',
          'en',
          '--target',
          'fr',
        ])
      ).rejects.toThrow();
    });

    it('should error when multiple target locales are provided', async () => {
      await expect(
        executeCommand(translateCommand, ['--text', 'Hello', '--source', 'en', '--target', 'fr,it'])
      ).rejects.toThrow();
    });

    it('should error when --force is used with --text', async () => {
      await expect(
        executeCommand(translateCommand, [
          '--text',
          'Hello',
          '--source',
          'en',
          '--target',
          'fr',
          '--force',
        ])
      ).rejects.toThrow();
    });

    it('should error when --paths is used with --text', async () => {
      await expect(
        executeCommand(translateCommand, [
          '--text',
          'Hello',
          '--source',
          'en',
          '--target',
          'fr',
          '--paths',
          'src/i18n/[locale].json',
        ])
      ).rejects.toThrow();
    });
  });

  describe('file mode - txt files', () => {
    it('should translate a txt file and output to stdout', async () => {
      const inputFile = path.join(testDir, 'hello.txt');
      await writeFile(inputFile, 'Hello, world!');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[fr] Hello, world!');
    });

    it('should write to output file when --output is specified', async () => {
      const inputFile = path.join(testDir, 'hello.txt');
      const outputFile = path.join(testDir, 'hello-fr.txt');
      await writeFile(inputFile, 'Hello, world!');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
        '--output',
        outputFile,
      ]);

      expect(existsSync(outputFile)).toBe(true);
      const content = await readFile(outputFile, 'utf8');
      expect(content).toBe('[fr] Hello, world!');
    });

    it('should create output directory if it does not exist', async () => {
      const inputFile = path.join(testDir, 'hello.txt');
      const outputFile = path.join(testDir, 'output', 'subdir', 'hello-fr.txt');
      await writeFile(inputFile, 'Hello, world!');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
        '--output',
        outputFile,
      ]);

      expect(existsSync(outputFile)).toBe(true);
      const content = await readFile(outputFile, 'utf8');
      expect(content).toBe('[fr] Hello, world!');
    });

    it('should error when file does not exist', async () => {
      await expect(
        executeCommand(translateCommand, [
          '--file',
          path.join(testDir, 'nonexistent.txt'),
          '--source',
          'en',
          '--target',
          'fr',
        ])
      ).rejects.toThrow();
    });

    it('should error when --output is used without --file', async () => {
      await expect(
        executeCommand(translateCommand, [
          '--text',
          'Hello',
          '--source',
          'en',
          '--target',
          'fr',
          '--output',
          path.join(testDir, 'out.txt'),
        ])
      ).rejects.toThrow();
    });

    it('should translate multi-line txt file line-by-line', async () => {
      const inputFile = path.join(testDir, 'multi.txt');
      await writeFile(inputFile, 'Hello\n\nWelcome\nGoodbye\n');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      const output = stdoutCalls.find((call: string) => call.includes('[fr]'));
      expect(output).toBeDefined();
      expect(output).toContain('[fr] Hello');
      expect(output).toContain('[fr] Welcome');
      expect(output).toContain('[fr] Goodbye');
      // Verify empty lines are preserved
      expect(output).toContain('\n\n');
    });

    it('should work without a lara.yaml config file', async () => {
      expect(existsSync(path.join(testDir, 'lara.yaml'))).toBe(false);

      const inputFile = path.join(testDir, 'hello.txt');
      await writeFile(inputFile, 'Translate me');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'es',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[es] Translate me');
    });
  });

  describe('file mode - unsupported file types', () => {
    it('should error when file type is not supported', async () => {
      const inputFile = path.join(testDir, 'image.png');
      await writeFile(inputFile, 'fake png content');

      await expect(
        executeCommand(translateCommand, ['--file', inputFile, '--source', 'en', '--target', 'fr'])
      ).rejects.toThrow();
    });

    it('should error for csv files', async () => {
      const inputFile = path.join(testDir, 'data.csv');
      await writeFile(inputFile, 'col1,col2\nval1,val2');

      await expect(
        executeCommand(translateCommand, ['--file', inputFile, '--source', 'en', '--target', 'fr'])
      ).rejects.toThrow();
    });
  });

  describe('file mode - structured files (JSON)', () => {
    it('should translate JSON file preserving structure', async () => {
      const inputFile = path.join(testDir, 'messages.json');
      await writeFile(
        inputFile,
        JSON.stringify(
          {
            greeting: 'Hello',
            farewell: 'Goodbye',
          },
          null,
          2
        ) + '\n'
      );

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'it',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      const jsonOutput = stdoutCalls.find((call: string) => call.includes('[it]'));
      expect(jsonOutput).toBeDefined();

      const parsed = JSON.parse(jsonOutput!);
      expect(parsed.greeting).toBe('[it] Hello');
      expect(parsed.farewell).toBe('[it] Goodbye');
    });

    it('should preserve non-string values in JSON', async () => {
      const inputFile = path.join(testDir, 'data.json');
      await writeFile(
        inputFile,
        JSON.stringify(
          {
            title: 'Welcome',
            count: 42,
            active: true,
          },
          null,
          2
        ) + '\n'
      );

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'de',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      const jsonOutput = stdoutCalls.find((call: string) => call.includes('[de]'));
      expect(jsonOutput).toBeDefined();

      const parsed = JSON.parse(jsonOutput!);
      expect(parsed.title).toBe('[de] Welcome');
      expect(parsed.count).toBe(42);
      expect(parsed.active).toBe(true);
    });

    it('should preserve JSON formatting with tabs', async () => {
      const inputFile = path.join(testDir, 'tabbed.json');
      await writeFile(inputFile, '{\n\t"key": "value"\n}\n');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      const jsonOutput = stdoutCalls.find((call: string) => call.includes('[fr]'));
      expect(jsonOutput).toBeDefined();
      expect(jsonOutput).toContain('\t');
    });

    it('should handle nested JSON objects', async () => {
      const inputFile = path.join(testDir, 'nested.json');
      await writeFile(
        inputFile,
        JSON.stringify(
          {
            nav: {
              home: 'Home',
              about: 'About',
            },
          },
          null,
          2
        ) + '\n'
      );

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      const jsonOutput = stdoutCalls.find((call: string) => call.includes('[fr]'));
      expect(jsonOutput).toBeDefined();

      const parsed = JSON.parse(jsonOutput!);
      expect(parsed.nav.home).toBe('[fr] Home');
      expect(parsed.nav.about).toBe('[fr] About');
    });

    it('should write structured JSON to output file', async () => {
      const inputFile = path.join(testDir, 'input.json');
      const outputFile = path.join(testDir, 'output.json');
      await writeFile(inputFile, JSON.stringify({ hello: 'Hello' }, null, 2) + '\n');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'es',
        '--output',
        outputFile,
      ]);

      expect(existsSync(outputFile)).toBe(true);
      const content = await readFile(outputFile, 'utf8');
      const parsed = JSON.parse(content);
      expect(parsed.hello).toBe('[es] Hello');
    });
  });

  describe('validation', () => {
    it('should error when --source is used without --file or --text', async () => {
      await expect(executeCommand(translateCommand, ['--source', 'en'])).rejects.toThrow();
    });

    it('should error when --output is used without --file', async () => {
      await expect(
        executeCommand(translateCommand, [
          '--text',
          'Hello',
          '--source',
          'en',
          '--target',
          'fr',
          '--output',
          'out.txt',
        ])
      ).rejects.toThrow();
    });

    it('should error when --file is used with --force', async () => {
      const inputFile = path.join(testDir, 'test.txt');
      await writeFile(inputFile, 'Hello');

      await expect(
        executeCommand(translateCommand, [
          '--file',
          inputFile,
          '--source',
          'en',
          '--target',
          'fr',
          '--force',
        ])
      ).rejects.toThrow();
    });

    it('should error when --file is used with --paths', async () => {
      const inputFile = path.join(testDir, 'test.txt');
      await writeFile(inputFile, 'Hello');

      await expect(
        executeCommand(translateCommand, [
          '--file',
          inputFile,
          '--source',
          'en',
          '--target',
          'fr',
          '--paths',
          'src/[locale].json',
        ])
      ).rejects.toThrow();
    });

    it('should error when --translation-memories is used without --file or --text', async () => {
      await expect(
        executeCommand(translateCommand, ['--translation-memories', 'mem_123'])
      ).rejects.toThrow();
    });

    it('should error when --glossaries is used without --file or --text', async () => {
      await expect(executeCommand(translateCommand, ['--glossaries', 'gls_123'])).rejects.toThrow();
    });
  });

  describe('translation memories and glossaries', () => {
    it('should accept --translation-memories with --text', async () => {
      await executeCommand(translateCommand, [
        '--text',
        'Hello',
        '--source',
        'en',
        '--target',
        'fr',
        '--translation-memories',
        'mem_abc123',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[fr] Hello\n');
    });

    it('should accept --glossaries with --file', async () => {
      const inputFile = path.join(testDir, 'hello.txt');
      await writeFile(inputFile, 'Hello');

      await executeCommand(translateCommand, [
        '--file',
        inputFile,
        '--source',
        'en',
        '--target',
        'fr',
        '--glossaries',
        'gls_xyz789',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[fr] Hello');
    });

    it('should accept both --translation-memories and --glossaries together', async () => {
      await executeCommand(translateCommand, [
        '--text',
        'Hello',
        '--source',
        'en',
        '--target',
        'fr',
        '--translation-memories',
        'mem_abc,mem_def',
        '--glossaries',
        'gls_xyz',
      ]);

      const stdoutCalls = stdoutWriteSpy.mock.calls.map((call: unknown[]) => call[0]);
      expect(stdoutCalls).toContainEqual('[fr] Hello\n');
    });
  });
});
