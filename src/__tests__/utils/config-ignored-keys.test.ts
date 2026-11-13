import { describe, it, expect } from 'vitest';

import { Config } from '#modules/config/config.types.js';

/**
 * Schema-level coverage for per-locale `ignoredKeys` entries. The behaviour
 * they drive is covered end to end in the per-format integration tests.
 */
function buildConfig(ignoredKeys?: unknown[], target: string[] = ['it', 'fr', 'de']) {
  return {
    version: '1.0.0',
    locales: { source: 'en', target },
    files: {
      json: { include: ['src/i18n/[locale].json'], ignoredKeys },
    },
  };
}

describe('config schema: ignoredKeys', () => {
  it('defaults to an empty list', () => {
    const parsed = Config.parse(buildConfig());

    expect(parsed.files.json?.ignoredKeys).toEqual([]);
  });

  it('still accepts plain string patterns', () => {
    const parsed = Config.parse(buildConfig(['internal/**', '**/debug']));

    expect(parsed.files.json?.ignoredKeys).toEqual(['internal/**', '**/debug']);
  });

  it('accepts the per-locale object form and keeps it as written', () => {
    const parsed = Config.parse(buildConfig([{ path: 'legal/**', locales: ['fr', 'de'] }]));

    expect(parsed.files.json?.ignoredKeys).toEqual([{ path: 'legal/**', locales: ['fr', 'de'] }]);
  });

  it('accepts a mix of strings and objects, preserving order', () => {
    const ignoredKeys = ['internal/**', { path: 'legal/**', locales: ['fr'] }, '**/debug'];
    const parsed = Config.parse(buildConfig(ignoredKeys));

    expect(parsed.files.json?.ignoredKeys).toEqual(ignoredKeys);
  });

  it('rejects an empty locales list', () => {
    const result = Config.safeParse(buildConfig([{ path: 'legal/**', locales: [] }]));

    expect(result.success).toBe(false);
  });

  it('rejects an object without locales', () => {
    const result = Config.safeParse(buildConfig([{ path: 'legal/**' }]));

    expect(result.success).toBe(false);
  });

  it('rejects an object without path', () => {
    const result = Config.safeParse(buildConfig([{ locales: ['fr'] }]));

    expect(result.success).toBe(false);
  });

  it('applies KeyPath validation to the object path', () => {
    const result = Config.safeParse(buildConfig([{ path: '/legal', locales: ['fr'] }]));

    expect(result.success).toBe(false);
  });

  it('rejects an unknown locale code', () => {
    const result = Config.safeParse(buildConfig([{ path: 'legal/**', locales: ['xx-NOPE'] }]));

    expect(result.success).toBe(false);
  });

  it('rejects a valid locale that is not a target, pointing at the offending entry', () => {
    const result = Config.safeParse(
      buildConfig(['internal/**', { path: 'legal/**', locales: ['fr', 'es'] }])
    );

    expect(result.success).toBe(false);
    const issues = result.error?.issues ?? [];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toEqual(['files', 'json', 'ignoredKeys', 1, 'locales']);
    expect(issues[0]?.message).toContain('"es"');
    expect(issues[0]?.message).toContain('locales.target');
  });

  it('rejects the source locale', () => {
    const result = Config.safeParse(buildConfig([{ path: 'legal/**', locales: ['en'] }]));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('"en"');
  });

  it('reports one issue per non-target locale across file types', () => {
    const result = Config.safeParse({
      version: '1.0.0',
      locales: { source: 'en', target: ['it'] },
      files: {
        json: {
          include: ['src/i18n/[locale].json'],
          ignoredKeys: [{ path: 'a', locales: ['fr', 'de'] }],
        },
        po: {
          include: ['locales/[locale].po'],
          ignoredKeys: [
            { path: 'b', locales: ['it'] },
            { path: 'c', locales: ['es'] },
          ],
        },
      },
    });

    expect(result.success).toBe(false);
    const paths = (result.error?.issues ?? []).map((issue) => issue.path.join('.'));
    expect(paths).toEqual([
      'files.json.ignoredKeys.0.locales',
      'files.json.ignoredKeys.0.locales',
      'files.po.ignoredKeys.1.locales',
    ]);
  });

  it('accepts per-locale rules on several file types when all locales are targets', () => {
    const result = Config.safeParse({
      version: '1.0.0',
      locales: { source: 'en', target: ['it', 'fr'] },
      files: {
        json: {
          include: ['src/i18n/[locale].json'],
          ignoredKeys: [{ path: 'a', locales: ['fr'] }],
        },
        po: { include: ['locales/[locale].po'], ignoredKeys: [{ path: 'b', locales: ['it'] }] },
      },
    });

    expect(result.success).toBe(true);
  });
});
