import { describe, it, expect } from 'vitest';

import { Config, DEFAULT_BATCH_SIZE, DEFAULT_ORPHAN_KEYS } from '#modules/config/config.types.js';

/**
 * Schema-level coverage for `translation.orphanKeys`. The behaviour it drives is
 * tested end to end in `integration/orphan-keys.integration.test.ts`; here we
 * only pin down parsing, the default, and rejection of bad values — the default
 * in particular, because it is what keeps existing projects on the old
 * preserve-orphans behaviour after upgrading.
 */
const baseConfig = {
  version: '1.0.0',
  locales: { source: 'en', target: ['it'] },
  files: {
    json: { include: ['src/i18n/[locale].json'] },
  },
};

describe('config schema: translation.orphanKeys', () => {
  it('defaults to keep when the translation section is absent', () => {
    const parsed = Config.parse(baseConfig);

    expect(parsed.translation.orphanKeys).toBe('keep');
    expect(DEFAULT_ORPHAN_KEYS).toBe('keep');
    expect(parsed.translation.batchSize).toBe(DEFAULT_BATCH_SIZE);
  });

  it('defaults to keep when the translation section omits the field', () => {
    const parsed = Config.parse({ ...baseConfig, translation: { batchSize: 10 } });

    expect(parsed.translation.orphanKeys).toBe('keep');
    expect(parsed.translation.batchSize).toBe(10);
  });

  it('accepts both modes', () => {
    for (const mode of ['keep', 'delete'] as const) {
      const parsed = Config.parse({ ...baseConfig, translation: { orphanKeys: mode } });
      expect(parsed.translation.orphanKeys).toBe(mode);
      // Setting one field must not clobber the other's default.
      expect(parsed.translation.batchSize).toBe(DEFAULT_BATCH_SIZE);
    }
  });

  it('rejects an unknown mode', () => {
    const result = Config.safeParse({ ...baseConfig, translation: { orphanKeys: 'remove' } });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('orphanKeys');
  });
});
