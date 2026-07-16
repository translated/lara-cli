import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';

const {
  translateMock,
  memoriesListMock,
  memoriesCreateMock,
  memoriesUpdateMock,
  memoriesDeleteMock,
  memoriesAddTranslationMock,
  memoriesDeleteTranslationMock,
  memoriesImportTmxMock,
  glossariesListMock,
  glossariesCreateMock,
  glossariesUpdateMock,
  glossariesDeleteMock,
  glossariesAddOrReplaceEntryMock,
  glossariesDeleteEntryMock,
  glossariesImportCsvMock,
  setExtraHeaderMock,
} = vi.hoisted(() => ({
  translateMock: vi.fn(),
  setExtraHeaderMock: vi.fn(),
  memoriesListMock: vi.fn(),
  memoriesCreateMock: vi.fn(),
  memoriesUpdateMock: vi.fn(),
  memoriesDeleteMock: vi.fn(),
  memoriesAddTranslationMock: vi.fn(),
  memoriesDeleteTranslationMock: vi.fn(),
  memoriesImportTmxMock: vi.fn(),
  glossariesListMock: vi.fn(),
  glossariesCreateMock: vi.fn(),
  glossariesUpdateMock: vi.fn(),
  glossariesDeleteMock: vi.fn(),
  glossariesAddOrReplaceEntryMock: vi.fn(),
  glossariesDeleteEntryMock: vi.fn(),
  glossariesImportCsvMock: vi.fn(),
}));

vi.mock('@translated/lara', () => {
  class Translator {
    // Mirrors the SDK's internal LaraClient that applyLaraClientHeaders reaches
    // through to set X-Lara-Client* on every request.
    client = { setExtraHeader: setExtraHeaderMock };
    translate = translateMock;
    memories = {
      list: memoriesListMock,
      create: memoriesCreateMock,
      update: memoriesUpdateMock,
      delete: memoriesDeleteMock,
      addTranslation: memoriesAddTranslationMock,
      deleteTranslation: memoriesDeleteTranslationMock,
      importTmx: memoriesImportTmxMock,
    };
    glossaries = {
      list: glossariesListMock,
      create: glossariesCreateMock,
      update: glossariesUpdateMock,
      delete: glossariesDeleteMock,
      addOrReplaceEntry: glossariesAddOrReplaceEntryMock,
      deleteEntry: glossariesDeleteEntryMock,
      importCsv: glossariesImportCsvMock,
    };
  }
  class Credentials {}
  return { Translator, Credentials };
});

const { TranslationService } = await import('#modules/translation/translation.service.js');
const { getPackageVersion } = await import('#utils/version.js');

describe('TranslationService construction', () => {
  beforeEach(() => {
    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';
    (TranslationService as any).instance = null;
    setExtraHeaderMock.mockReset();
  });

  afterEach(() => {
    (TranslationService as any).instance = null;
  });

  it('sets the X-Lara-Client identification headers on the SDK client', () => {
    TranslationService.getInstance();

    expect(setExtraHeaderMock).toHaveBeenCalledWith('X-Lara-Client', 'CLI');
    expect(setExtraHeaderMock).toHaveBeenCalledWith('X-Lara-Client-Version', getPackageVersion());
    expect(setExtraHeaderMock).toHaveBeenCalledTimes(2);
  });
});

describe('TranslationService.translateBatchWithFallback', () => {
  let service: ReturnType<typeof TranslationService.getInstance>;

  beforeEach(() => {
    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';
    (TranslationService as any).instance = null;
    translateMock.mockReset();
    service = TranslationService.getInstance();
  });

  afterEach(() => {
    (TranslationService as any).instance = null;
  });

  const blocks = (...texts: string[]) => texts.map((text) => ({ text, translatable: true }));
  const response = (...texts: string[]) => ({
    translation: texts.map((text) => ({ text, translatable: true })),
  });

  it('returns the batch response when it matches input length', async () => {
    translateMock.mockResolvedValueOnce(response('[it] a', '[it] b', '[it] c'));

    const result = await service.translateBatchWithFallback(
      blocks('a', 'b', 'c'),
      'en',
      'it',
      {} as any
    );

    expect(result.map((r: { text: string }) => r.text)).toEqual(['[it] a', '[it] b', '[it] c']);
    expect(translateMock).toHaveBeenCalledTimes(1);
  });

  it('returns [] for empty input without calling the API', async () => {
    const result = await service.translateBatchWithFallback([], 'en', 'it', {} as any);
    expect(result).toEqual([]);
    expect(translateMock).not.toHaveBeenCalled();
  });

  it('falls back to per-item translation when the batch returns fewer items than inputs', async () => {
    translateMock
      .mockResolvedValueOnce(response('[it] only-a')) // short batch response
      .mockResolvedValueOnce(response('[it] a')) // per-item fallback for 'a'
      .mockResolvedValueOnce(response('[it] b')); // per-item fallback for 'b'

    const result = await service.translateBatchWithFallback(
      blocks('a', 'b'),
      'en',
      'it',
      {} as any
    );

    expect(result.map((r: { text: string }) => r.text)).toEqual(['[it] a', '[it] b']);
    expect(translateMock).toHaveBeenCalledTimes(3);
  });

  it('keeps the source text and marks the block when batch and per-item both fail', async () => {
    // Spy at the service level to skip the retry/backoff loop.
    const translateSpy = vi
      .spyOn(service, 'translate')
      .mockRejectedValueOnce(new Error('batch failure'))
      .mockRejectedValueOnce(new Error('per-item failure'));

    // One bad item must NOT abort: it returns the source text, flagged as failed.
    const result = await service.translateBatchWithFallback(blocks('a'), 'en', 'it', {} as any);

    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('a');
    expect(result[0]?.translationFailed).toBe(true);

    translateSpy.mockRestore();
  });

  it('keeps only the failing item as source and still translates the rest', async () => {
    translateMock
      .mockResolvedValueOnce(response('[it] only-a')) // batch returns 1 for 2 inputs -> fallback
      .mockResolvedValueOnce(response('[it] a')) // per-item 'a' ok
      .mockResolvedValueOnce({ translation: [] }); // per-item 'b' empty -> failed

    const result = await service.translateBatchWithFallback(
      blocks('a', 'b'),
      'en',
      'it',
      {} as any
    );

    expect(result.map((r) => r.text)).toEqual(['[it] a', 'b']);
    expect(result[0]?.translationFailed).toBeUndefined();
    expect(result[1]?.translationFailed).toBe(true);
  });

  it('stops calling after consecutive per-item failures instead of grinding the whole batch', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Batch (1 call) + every per-item call reject.
    const translateSpy = vi.spyOn(service, 'translate').mockRejectedValue(new Error('API down'));

    const result = await service.translateBatchWithFallback(
      blocks('a', 'b', 'c', 'd', 'e', 'f'),
      'en',
      'it',
      {} as any
    );

    // All six kept as source and marked failed.
    expect(result.map((r) => r.text)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.every((r) => r.translationFailed)).toBe(true);
    // 1 batch + 3 per-item attempts, then the circuit breaker stops calling.
    expect(translateSpy).toHaveBeenCalledTimes(4);

    translateSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});

describe('TranslationService memory & glossary management', () => {
  let service: ReturnType<typeof TranslationService.getInstance>;

  beforeEach(() => {
    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';
    (TranslationService as any).instance = null;
    memoriesListMock.mockReset();
    memoriesCreateMock.mockReset();
    memoriesUpdateMock.mockReset();
    memoriesDeleteMock.mockReset();
    memoriesAddTranslationMock.mockReset();
    memoriesDeleteTranslationMock.mockReset();
    memoriesImportTmxMock.mockReset();
    glossariesListMock.mockReset();
    glossariesCreateMock.mockReset();
    glossariesUpdateMock.mockReset();
    glossariesDeleteMock.mockReset();
    glossariesAddOrReplaceEntryMock.mockReset();
    glossariesDeleteEntryMock.mockReset();
    glossariesImportCsvMock.mockReset();
    service = TranslationService.getInstance();
  });

  afterEach(() => {
    (TranslationService as any).instance = null;
  });

  it('getTranslationMemories delegates to memories.list', async () => {
    const memories = [{ id: 'mem_1', name: 'One' }];
    memoriesListMock.mockResolvedValueOnce(memories);

    const result = await service.getTranslationMemories();

    expect(result).toBe(memories);
    expect(memoriesListMock).toHaveBeenCalledTimes(1);
  });

  it('createMemory delegates to memories.create with the name', async () => {
    const created = { id: 'mem_new', name: 'New Memory' };
    memoriesCreateMock.mockResolvedValueOnce(created);

    const result = await service.createMemory('New Memory');

    expect(result).toBe(created);
    expect(memoriesCreateMock).toHaveBeenCalledWith('New Memory');
  });

  it('updateMemory delegates to memories.update with id and name', async () => {
    const updated = { id: 'mem_1', name: 'Renamed' };
    memoriesUpdateMock.mockResolvedValueOnce(updated);

    const result = await service.updateMemory('mem_1', 'Renamed');

    expect(result).toBe(updated);
    expect(memoriesUpdateMock).toHaveBeenCalledWith('mem_1', 'Renamed');
  });

  it('getGlossaries delegates to glossaries.list', async () => {
    const glossaries = [{ id: 'gls_1', name: 'One' }];
    glossariesListMock.mockResolvedValueOnce(glossaries);

    const result = await service.getGlossaries();

    expect(result).toBe(glossaries);
    expect(glossariesListMock).toHaveBeenCalledTimes(1);
  });

  it('createGlossary delegates to glossaries.create with the name', async () => {
    const created = { id: 'gls_new', name: 'New Glossary' };
    glossariesCreateMock.mockResolvedValueOnce(created);

    const result = await service.createGlossary('New Glossary');

    expect(result).toBe(created);
    expect(glossariesCreateMock).toHaveBeenCalledWith('New Glossary');
  });

  it('updateGlossary delegates to glossaries.update with id and name', async () => {
    const updated = { id: 'gls_1', name: 'Renamed' };
    glossariesUpdateMock.mockResolvedValueOnce(updated);

    const result = await service.updateGlossary('gls_1', 'Renamed');

    expect(result).toBe(updated);
    expect(glossariesUpdateMock).toHaveBeenCalledWith('gls_1', 'Renamed');
  });

  it('deleteMemory delegates to memories.delete with the id', async () => {
    const deleted = { id: 'mem_1', name: 'Gone' };
    memoriesDeleteMock.mockResolvedValueOnce(deleted);

    const result = await service.deleteMemory('mem_1');

    expect(result).toBe(deleted);
    expect(memoriesDeleteMock).toHaveBeenCalledWith('mem_1');
  });

  it('addMemoryTranslation delegates to memories.addTranslation', async () => {
    const imp = { id: 'imp_1' };
    memoriesAddTranslationMock.mockResolvedValueOnce(imp);

    const result = await service.addMemoryTranslation('mem_1', 'en', 'it', 'Hello', 'Ciao');

    expect(result).toBe(imp);
    expect(memoriesAddTranslationMock).toHaveBeenCalledWith('mem_1', 'en', 'it', 'Hello', 'Ciao');
  });

  it('deleteMemoryTranslation delegates to memories.deleteTranslation', async () => {
    const imp = { id: 'imp_1' };
    memoriesDeleteTranslationMock.mockResolvedValueOnce(imp);

    const result = await service.deleteMemoryTranslation('mem_1', 'en', 'it', 'Hello', 'Ciao');

    expect(result).toBe(imp);
    expect(memoriesDeleteTranslationMock).toHaveBeenCalledWith(
      'mem_1',
      'en',
      'it',
      'Hello',
      'Ciao'
    );
  });

  it('importMemoryTmx delegates to memories.importTmx with a stream', async () => {
    const imp = { id: 'imp_1' };
    memoriesImportTmxMock.mockResolvedValueOnce(imp);
    const fakeStream = { fake: 'stream' } as never;
    const createReadStreamSpy = vi.spyOn(fs, 'createReadStream').mockReturnValue(fakeStream);

    try {
      const result = await service.importMemoryTmx('mem_1', '/path/to/file.tmx');

      expect(result).toBe(imp);
      expect(createReadStreamSpy).toHaveBeenCalledWith('/path/to/file.tmx');
      expect(memoriesImportTmxMock).toHaveBeenCalledWith('mem_1', fakeStream, undefined);
    } finally {
      createReadStreamSpy.mockRestore();
    }
  });

  it('deleteGlossary delegates to glossaries.delete with the id', async () => {
    const deleted = { id: 'gls_1', name: 'Gone' };
    glossariesDeleteMock.mockResolvedValueOnce(deleted);

    const result = await service.deleteGlossary('gls_1');

    expect(result).toBe(deleted);
    expect(glossariesDeleteMock).toHaveBeenCalledWith('gls_1');
  });

  it('addGlossaryEntry delegates to glossaries.addOrReplaceEntry with terms', async () => {
    const imp = { id: 'imp_1' };
    glossariesAddOrReplaceEntryMock.mockResolvedValueOnce(imp);
    const terms = [
      { language: 'en', value: 'cat' },
      { language: 'it', value: 'gatto' },
    ];

    const result = await service.addGlossaryEntry('gls_1', terms);

    expect(result).toBe(imp);
    expect(glossariesAddOrReplaceEntryMock).toHaveBeenCalledWith('gls_1', terms);
  });

  it('deleteGlossaryEntry delegates to glossaries.deleteEntry with the term', async () => {
    const imp = { id: 'imp_1' };
    glossariesDeleteEntryMock.mockResolvedValueOnce(imp);
    const term = { language: 'en', value: 'cat' };

    const result = await service.deleteGlossaryEntry('gls_1', term);

    expect(result).toBe(imp);
    expect(glossariesDeleteEntryMock).toHaveBeenCalledWith('gls_1', term);
  });

  it('importGlossaryCsv delegates to glossaries.importCsv with the default content type', async () => {
    const imp = { id: 'imp_1' };
    glossariesImportCsvMock.mockResolvedValueOnce(imp);
    const fakeStream = { fake: 'stream' } as never;
    const createReadStreamSpy = vi.spyOn(fs, 'createReadStream').mockReturnValue(fakeStream);

    try {
      const result = await service.importGlossaryCsv('gls_1', '/path/to/file.csv');

      expect(result).toBe(imp);
      expect(createReadStreamSpy).toHaveBeenCalledWith('/path/to/file.csv');
      expect(glossariesImportCsvMock).toHaveBeenCalledWith(
        'gls_1',
        fakeStream,
        'csv/table-uni',
        undefined
      );
    } finally {
      createReadStreamSpy.mockRestore();
    }
  });
});
