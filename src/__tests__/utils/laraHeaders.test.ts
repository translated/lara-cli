import { describe, it, expect } from 'vitest';
import { Credentials, Translator } from '@translated/lara';
import { applyLaraClientHeaders } from '#utils/laraHeaders.js';
import { getPackageVersion } from '#utils/version.js';

describe('applyLaraClientHeaders', () => {
  // Guard against SDK internal changes: constructing a real Translator makes no
  // network calls, so we can verify the headers actually land on the internal
  // client's extra-headers map (sent with every request). If the SDK renames or
  // removes that internal, this test fails instead of silently dropping headers.
  it('attaches both headers to the real SDK client so every request carries them', () => {
    const translator = new Translator(new Credentials('test-key-id', 'test-key-secret'));

    applyLaraClientHeaders(translator);

    const extraHeaders = (
      translator as unknown as { client: { extraHeaders: Record<string, string> } }
    ).client.extraHeaders;

    expect(extraHeaders['X-Lara-Client']).toBe('CLI');
    expect(extraHeaders['X-Lara-Client-Version']).toBe(getPackageVersion());
  });

  it('does not throw when the internal client lacks setExtraHeader', () => {
    const fakeTranslator = {} as unknown as Translator;
    expect(() => applyLaraClientHeaders(fakeTranslator)).not.toThrow();
  });
});
