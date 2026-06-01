import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

import {
  executeCommand,
  mockGetGlossaries,
  mockCreateGlossary,
  mockUpdateGlossary,
  mockDeleteGlossary,
  mockAddGlossaryEntry,
  mockDeleteGlossaryEntry,
  mockImportGlossaryCsv,
} from './test-helpers.js';
import glossaryCommand from '../../cli/cmd/glossary/glossary.js';
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

describe('Glossary Command Integration Tests', () => {
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
      `glossary-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    (ConfigProvider as any).instance = null;

    mockGetGlossaries.mockReset();
    mockGetGlossaries.mockResolvedValue([]);
    mockCreateGlossary.mockReset();
    mockCreateGlossary.mockImplementation(async (name: string) => ({ id: 'gls_generated', name }));
    mockUpdateGlossary.mockReset();
    mockUpdateGlossary.mockImplementation(async (id: string, name: string) => ({ id, name }));
    mockDeleteGlossary.mockReset();
    mockDeleteGlossary.mockImplementation(async (id: string) => ({ id, name: 'deleted' }));
    mockAddGlossaryEntry.mockReset();
    mockAddGlossaryEntry.mockResolvedValue({ id: 'imp_generated' } as never);
    mockDeleteGlossaryEntry.mockReset();
    mockDeleteGlossaryEntry.mockResolvedValue({ id: 'imp_generated' } as never);
    mockImportGlossaryCsv.mockReset();
    mockImportGlossaryCsv.mockResolvedValue({ id: 'imp_generated' } as never);

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
    it('lists glossaries via the bare command', async () => {
      mockGetGlossaries.mockResolvedValueOnce([{ id: 'gls_1', name: 'One' }]);

      await executeCommand(glossaryCommand, []);

      expect(mockGetGlossaries).toHaveBeenCalledTimes(1);
    });

    it('lists glossaries via the list subcommand', async () => {
      mockGetGlossaries.mockResolvedValueOnce([{ id: 'gls_1', name: 'One' }]);

      await executeCommand(glossaryCommand, ['list']);

      expect(mockGetGlossaries).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('creates a glossary and adds its id to lara.yaml', async () => {
      await writeConfig();

      await executeCommand(glossaryCommand, ['create', 'My Glossary']);

      expect(mockCreateGlossary).toHaveBeenCalledWith('My Glossary');

      const config = await readConfig();
      expect(config.glossaries).toEqual(['gls_generated']);
    });

    it('creates a glossary even without a lara.yaml present', async () => {
      await executeCommand(glossaryCommand, ['create', 'My Glossary']);

      expect(mockCreateGlossary).toHaveBeenCalledWith('My Glossary');
      expect(existsSync(path.join(testDir, 'lara.yaml'))).toBe(false);
    });

    it('errors when no name is provided in non-interactive mode', async () => {
      await expect(executeCommand(glossaryCommand, ['create'])).rejects.toThrow();
      expect(mockCreateGlossary).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates a glossary name', async () => {
      await executeCommand(glossaryCommand, ['update', 'gls_1', 'Renamed']);

      expect(mockUpdateGlossary).toHaveBeenCalledWith('gls_1', 'Renamed');
    });

    it('errors when the name is missing in non-interactive mode', async () => {
      await expect(executeCommand(glossaryCommand, ['update', 'gls_1'])).rejects.toThrow();
      expect(mockUpdateGlossary).not.toHaveBeenCalled();
    });

    it('errors when the id is missing in non-interactive mode', async () => {
      await expect(executeCommand(glossaryCommand, ['update'])).rejects.toThrow();
      expect(mockUpdateGlossary).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a glossary and removes its id from lara.yaml', async () => {
      await writeConfig({ ...baseConfig, glossaries: ['gls_1'] });

      await executeCommand(glossaryCommand, ['delete', 'gls_1']);

      expect(mockDeleteGlossary).toHaveBeenCalledWith('gls_1');

      const config = await readConfig();
      expect(config.glossaries).toEqual([]);
    });

    it('deletes a glossary even without a lara.yaml present', async () => {
      await executeCommand(glossaryCommand, ['delete', 'gls_1']);

      expect(mockDeleteGlossary).toHaveBeenCalledWith('gls_1');
    });

    it('errors when the id is missing in non-interactive mode', async () => {
      await expect(executeCommand(glossaryCommand, ['delete'])).rejects.toThrow();
      expect(mockDeleteGlossary).not.toHaveBeenCalled();
    });
  });

  describe('add-entry', () => {
    it('adds a source→target entry', async () => {
      await executeCommand(glossaryCommand, ['add-entry', 'gls_1', 'en', 'cat', 'it', 'gatto']);

      expect(mockAddGlossaryEntry).toHaveBeenCalledWith('gls_1', [
        { language: 'en', value: 'cat' },
        { language: 'it', value: 'gatto' },
      ]);
    });

    it('errors on an invalid locale', async () => {
      await expect(
        executeCommand(glossaryCommand, ['add-entry', 'gls_1', 'bad', 'cat', 'it', 'gatto'])
      ).rejects.toThrow();
      expect(mockAddGlossaryEntry).not.toHaveBeenCalled();
    });

    it('errors when required values are missing in non-interactive mode', async () => {
      await expect(
        executeCommand(glossaryCommand, ['add-entry', 'gls_1', 'en', 'cat'])
      ).rejects.toThrow();
      expect(mockAddGlossaryEntry).not.toHaveBeenCalled();
    });
  });

  describe('delete-entry', () => {
    it('deletes an entry by term', async () => {
      await executeCommand(glossaryCommand, ['delete-entry', 'gls_1', 'en', 'cat']);

      expect(mockDeleteGlossaryEntry).toHaveBeenCalledWith('gls_1', {
        language: 'en',
        value: 'cat',
      });
    });

    it('errors when the value is missing in non-interactive mode', async () => {
      await expect(
        executeCommand(glossaryCommand, ['delete-entry', 'gls_1', 'en'])
      ).rejects.toThrow();
      expect(mockDeleteGlossaryEntry).not.toHaveBeenCalled();
    });
  });

  describe('import-csv', () => {
    it('imports a CSV file', async () => {
      const csvPath = path.join(testDir, 'terms.csv');
      await writeFile(csvPath, 'en,it\ncat,gatto\n');

      await executeCommand(glossaryCommand, ['import-csv', 'gls_1', csvPath]);

      expect(mockImportGlossaryCsv).toHaveBeenCalledWith('gls_1', csvPath);
    });

    it('errors when the file does not exist', async () => {
      await expect(
        executeCommand(glossaryCommand, ['import-csv', 'gls_1', path.join(testDir, 'missing.csv')])
      ).rejects.toThrow();
      expect(mockImportGlossaryCsv).not.toHaveBeenCalled();
    });
  });

  describe('credentials', () => {
    it('errors when API credentials are missing', async () => {
      delete process.env.LARA_ACCESS_KEY_ID;
      delete process.env.LARA_ACCESS_KEY_SECRET;

      await expect(executeCommand(glossaryCommand, ['list'])).rejects.toThrow();
    });
  });
});
