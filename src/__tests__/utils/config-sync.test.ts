import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

import { addIdToConfig, removeIdFromConfig } from '../../cli/cmd/common/config-sync.js';
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

describe('addIdToConfig', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `config-sync-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    (ConfigProvider as any).instance = null;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
    (ConfigProvider as any).instance = null;
  });

  async function writeConfig(config: unknown): Promise<void> {
    await writeFile(path.join(testDir, 'lara.yaml'), yaml.stringify(config));
    (ConfigProvider as any).instance = null;
  }

  async function readConfig(): Promise<any> {
    return yaml.parse(await readFile(path.join(testDir, 'lara.yaml'), 'utf-8'));
  }

  it('returns false when no config file exists', () => {
    expect(addIdToConfig('memories', 'mem_1')).toBe(false);
  });

  it('adds a memory id to the memories list', async () => {
    await writeConfig(baseConfig);

    expect(addIdToConfig('memories', 'mem_1')).toBe(true);

    const config = await readConfig();
    expect(config.memories).toEqual(['mem_1']);
  });

  it('adds a glossary id to the glossaries list', async () => {
    await writeConfig(baseConfig);

    expect(addIdToConfig('glossaries', 'gls_1')).toBe(true);

    const config = await readConfig();
    expect(config.glossaries).toEqual(['gls_1']);
  });

  it('does not duplicate an id that is already present', async () => {
    await writeConfig({ ...baseConfig, memories: ['mem_1'] });

    expect(addIdToConfig('memories', 'mem_1')).toBe(false);

    const config = await readConfig();
    expect(config.memories).toEqual(['mem_1']);
  });

  it('preserves other config fields when adding an id', async () => {
    await writeConfig({ ...baseConfig, memories: ['mem_1'] });

    expect(addIdToConfig('memories', 'mem_2')).toBe(true);

    const config = await readConfig();
    expect(config.memories).toEqual(['mem_1', 'mem_2']);
    expect(config.locales.source).toBe('en');
    expect(config.locales.target).toEqual(['it']);
    expect(config.files.json.include).toEqual(['src/i18n/[locale].json']);
  });
});

describe('removeIdFromConfig', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `config-sync-rm-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    (ConfigProvider as any).instance = null;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
    (ConfigProvider as any).instance = null;
  });

  async function writeConfig(config: unknown): Promise<void> {
    await writeFile(path.join(testDir, 'lara.yaml'), yaml.stringify(config));
    (ConfigProvider as any).instance = null;
  }

  async function readConfig(): Promise<any> {
    return yaml.parse(await readFile(path.join(testDir, 'lara.yaml'), 'utf-8'));
  }

  it('returns false when no config file exists', () => {
    expect(removeIdFromConfig('memories', 'mem_1')).toBe(false);
  });

  it('removes a present memory id', async () => {
    await writeConfig({ ...baseConfig, memories: ['mem_1', 'mem_2'] });

    expect(removeIdFromConfig('memories', 'mem_1')).toBe(true);

    const config = await readConfig();
    expect(config.memories).toEqual(['mem_2']);
  });

  it('removes a present glossary id', async () => {
    await writeConfig({ ...baseConfig, glossaries: ['gls_1'] });

    expect(removeIdFromConfig('glossaries', 'gls_1')).toBe(true);

    const config = await readConfig();
    expect(config.glossaries).toEqual([]);
  });

  it('returns false (no-op) when the id is absent', async () => {
    await writeConfig({ ...baseConfig, memories: ['mem_1'] });

    expect(removeIdFromConfig('memories', 'mem_missing')).toBe(false);

    const config = await readConfig();
    expect(config.memories).toEqual(['mem_1']);
  });

  it('preserves other config fields when removing an id', async () => {
    await writeConfig({ ...baseConfig, memories: ['mem_1', 'mem_2'] });

    expect(removeIdFromConfig('memories', 'mem_2')).toBe(true);

    const config = await readConfig();
    expect(config.memories).toEqual(['mem_1']);
    expect(config.locales.source).toBe('en');
    expect(config.files.json.include).toEqual(['src/i18n/[locale].json']);
  });
});
