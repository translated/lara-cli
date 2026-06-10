import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Version of this package read from package.json. Falls back to 'unknown' if
 * the file can't be read or has no string version field, so a missing/malformed
 * package.json degrades to a harmless value instead of crashing the CLI.
 */
export function getPackageVersion(): string {
  try {
    const { version } = require('../../package.json') as { version?: string };
    return typeof version === 'string' ? version : 'unknown';
  } catch {
    return 'unknown';
  }
}
