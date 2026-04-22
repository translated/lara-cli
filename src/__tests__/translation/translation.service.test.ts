import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { translateMock } = vi.hoisted(() => ({ translateMock: vi.fn() }));

vi.mock('@translated/lara', () => {
  class Translator {
    translate = translateMock;
  }
  class Credentials {}
  return { Translator, Credentials };
});

const { TranslationService } = await import('#modules/translation/translation.service.js');

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

  it('throws AggregateError carrying both errors when fallback also fails', async () => {
    // Spy at the service level to skip the retry/backoff loop.
    const translateSpy = vi
      .spyOn(service, 'translate')
      .mockRejectedValueOnce(new Error('batch failure'))
      .mockRejectedValueOnce(new Error('per-item failure'));

    const error = await service
      .translateBatchWithFallback(blocks('a'), 'en', 'it', {} as any)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AggregateError);
    const aggregate = error as AggregateError;
    expect(aggregate.message).toContain('per-item fallback failed for: a');
    expect(aggregate.errors).toHaveLength(2);
    expect((aggregate.errors[0] as Error).message).toBe('batch failure');
    expect((aggregate.errors[1] as Error).message).toBe('per-item failure');

    translateSpy.mockRestore();
  });
});
