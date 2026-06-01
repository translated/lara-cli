import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

import {
  executeCommand,
  mockGetTranslationMemories,
  mockCreateMemory,
  mockUpdateMemory,
  mockDeleteMemory,
  mockAddMemoryTranslation,
  mockDeleteMemoryTranslation,
  mockImportMemoryTmx,
} from './test-helpers.js';
import memoryCommand from '../../cli/cmd/memory/memory.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseConfig = {
  version: '1.0.0',
  locales: { source: 'en', target: ['it'] },
  memories: [] as string[],
  glossaries: [] as string[],
  noTrace: false,
  translation: { batchSize: 50 },
  files: {
    json: {
      include: ['src/i18n/[locale].json'],
      exclude: [],
      fileInstructions: [],
      keyInstructions: [],
      lockedKeys: [],
      ignoredKeys: [],
      includeKeys: [],
    },
  },
};

describe('Memory Command Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;
  let logSpy: ReturnType<typeof vi.spyOn>;

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
      `memory-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;

    mockGetTranslationMemories.mockReset();
    mockGetTranslationMemories.mockResolvedValue([]);
    mockCreateMemory.mockReset();
    mockCreateMemory.mockImplementation(async (name: string) => ({ id: 'mem_generated', name }));
    mockUpdateMemory.mockReset();
    mockUpdateMemory.mockImplementation(async (id: string, name: string) => ({ id, name }));
    mockDeleteMemory.mockReset();
    mockDeleteMemory.mockImplementation(async (id: string) => ({ id, name: 'deleted' }));
    mockAddMemoryTranslation.mockReset();
    mockAddMemoryTranslation.mockResolvedValue({ id: 'imp_generated' } as never);
    mockDeleteMemoryTranslation.mockReset();
    mockDeleteMemoryTranslation.mockResolvedValue({ id: 'imp_generated' } as never);
    mockImportMemoryTmx.mockReset();
    mockImportMemoryTmx.mockResolvedValue({ id: 'imp_generated' } as never);

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exit = originalExit;

    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }

    (ConfigProvider as any).instance = null;
  });

  async function writeConfig(config: unknown = baseConfig): Promise<void> {
    await writeFile(path.join(testDir, 'lara.yaml'), yaml.stringify(config));
    (ConfigProvider as any).instance = null;
  }

  async function readConfig(): Promise<any> {
    return yaml.parse(await readFile(path.join(testDir, 'lara.yaml'), 'utf-8'));
  }

  describe('list', () => {
    it('lists memories via the bare command', async () => {
      mockGetTranslationMemories.mockResolvedValueOnce([{ id: 'mem_1', name: 'One' }]);

      await executeCommand(memoryCommand, []);

      expect(mockGetTranslationMemories).toHaveBeenCalledTimes(1);
    });

    it('lists memories via the list subcommand', async () => {
      mockGetTranslationMemories.mockResolvedValueOnce([{ id: 'mem_1', name: 'One' }]);

      await executeCommand(memoryCommand, ['list']);

      expect(mockGetTranslationMemories).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('creates a memory and adds its id to lara.yaml', async () => {
      await writeConfig();

      await executeCommand(memoryCommand, ['create', 'My Memory']);

      expect(mockCreateMemory).toHaveBeenCalledWith('My Memory');

      const config = await readConfig();
      expect(config.memories).toEqual(['mem_generated']);
    });

    it('creates a memory even without a lara.yaml present', async () => {
      await executeCommand(memoryCommand, ['create', 'My Memory']);

      expect(mockCreateMemory).toHaveBeenCalledWith('My Memory');
      expect(existsSync(path.join(testDir, 'lara.yaml'))).toBe(false);
    });

    it('errors when no name is provided in non-interactive mode', async () => {
      await expect(executeCommand(memoryCommand, ['create'])).rejects.toThrow();
      expect(mockCreateMemory).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates a memory name', async () => {
      await executeCommand(memoryCommand, ['update', 'mem_1', 'Renamed']);

      expect(mockUpdateMemory).toHaveBeenCalledWith('mem_1', 'Renamed');
    });

    it('errors when the name is missing in non-interactive mode', async () => {
      await expect(executeCommand(memoryCommand, ['update', 'mem_1'])).rejects.toThrow();
      expect(mockUpdateMemory).not.toHaveBeenCalled();
    });

    it('errors when the id is missing in non-interactive mode', async () => {
      await expect(executeCommand(memoryCommand, ['update'])).rejects.toThrow();
      expect(mockUpdateMemory).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a memory and removes its id from lara.yaml', async () => {
      await writeConfig({ ...baseConfig, memories: ['mem_1'] });

      await executeCommand(memoryCommand, ['delete', 'mem_1']);

      expect(mockDeleteMemory).toHaveBeenCalledWith('mem_1');

      const config = await readConfig();
      expect(config.memories).toEqual([]);
    });

    it('deletes a memory even without a lara.yaml present', async () => {
      await executeCommand(memoryCommand, ['delete', 'mem_1']);

      expect(mockDeleteMemory).toHaveBeenCalledWith('mem_1');
    });

    it('errors when the id is missing in non-interactive mode', async () => {
      await expect(executeCommand(memoryCommand, ['delete'])).rejects.toThrow();
      expect(mockDeleteMemory).not.toHaveBeenCalled();
    });
  });

  describe('add-translation', () => {
    it('adds a translation unit', async () => {
      await executeCommand(memoryCommand, [
        'add-translation',
        'mem_1',
        'en',
        'it',
        'Hello',
        'Ciao',
      ]);

      expect(mockAddMemoryTranslation).toHaveBeenCalledWith('mem_1', 'en', 'it', 'Hello', 'Ciao');
    });

    it('errors on an invalid locale', async () => {
      await expect(
        executeCommand(memoryCommand, [
          'add-translation',
          'mem_1',
          'not-a-locale',
          'it',
          'Hi',
          'Ciao',
        ])
      ).rejects.toThrow();
      expect(mockAddMemoryTranslation).not.toHaveBeenCalled();
    });

    it('errors when required values are missing in non-interactive mode', async () => {
      await expect(
        executeCommand(memoryCommand, ['add-translation', 'mem_1', 'en', 'it'])
      ).rejects.toThrow();
      expect(mockAddMemoryTranslation).not.toHaveBeenCalled();
    });
  });

  describe('delete-translation', () => {
    it('deletes a translation unit', async () => {
      await executeCommand(memoryCommand, [
        'delete-translation',
        'mem_1',
        'en',
        'it',
        'Hello',
        'Ciao',
      ]);

      expect(mockDeleteMemoryTranslation).toHaveBeenCalledWith(
        'mem_1',
        'en',
        'it',
        'Hello',
        'Ciao'
      );
    });

    it('errors when the translation is missing in non-interactive mode', async () => {
      await expect(
        executeCommand(memoryCommand, ['delete-translation', 'mem_1', 'en', 'it', 'Hello'])
      ).rejects.toThrow();
      expect(mockDeleteMemoryTranslation).not.toHaveBeenCalled();
    });
  });

  describe('import-tmx', () => {
    it('imports a TMX file', async () => {
      const tmxPath = path.join(testDir, 'sample.tmx');
      await writeFile(tmxPath, '<tmx></tmx>');

      await executeCommand(memoryCommand, ['import-tmx', 'mem_1', tmxPath]);

      expect(mockImportMemoryTmx).toHaveBeenCalledWith('mem_1', tmxPath);
    });

    it('errors when the file does not exist', async () => {
      await expect(
        executeCommand(memoryCommand, ['import-tmx', 'mem_1', path.join(testDir, 'missing.tmx')])
      ).rejects.toThrow();
      expect(mockImportMemoryTmx).not.toHaveBeenCalled();
    });
  });

  describe('credentials', () => {
    it('errors when API credentials are missing', async () => {
      delete process.env.LARA_ACCESS_KEY_ID;
      delete process.env.LARA_ACCESS_KEY_SECRET;

      await expect(executeCommand(memoryCommand, ['list'])).rejects.toThrow();
    });
  });
});
