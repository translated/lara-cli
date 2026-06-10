import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPackageVersion } from '#utils/version.js';

const here = dirname(fileURLToPath(import.meta.url));
// src/__tests__/utils -> repo root
const pkgVersion = (
  JSON.parse(readFileSync(join(here, '..', '..', '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

describe('getPackageVersion', () => {
  it('matches the version field in package.json', () => {
    expect(getPackageVersion()).toBe(pkgVersion);
  });

  it('always returns a string', () => {
    expect(typeof getPackageVersion()).toBe('string');
  });
});
