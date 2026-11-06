import { it, expect } from 'vitest';
import { Config } from '../../modules/config/config.types.js';
const base = {
  version: '1.0.0',
  locales: { source: 'en', target: ['it'] },
  files: { json: { include: ['locales/[locale].json'] } },
};
it('preserves old configs and accepts all Think levels', () => {
  expect(Config.parse(base).translation.reasoning).toBeUndefined();
  for (const reasoningEffort of ['low', 'medium', 'high']) {
    expect(
      Config.parse({ ...base, translation: { reasoning: true, reasoningEffort } }).translation
    ).toMatchObject({ reasoning: true, reasoningEffort });
  }
});
it.each(['HIGH', 'invalid', null, 1])('rejects invalid configured effort %s', (reasoningEffort) => {
  expect(
    Config.safeParse({ ...base, translation: { reasoning: true, reasoningEffort } }).success
  ).toBe(false);
});
