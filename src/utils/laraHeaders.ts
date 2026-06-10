import { Translator } from '@translated/lara';
import { getPackageVersion } from './version.js';

type ClientWithExtraHeader = { setExtraHeader?: (name: string, value: string) => void };

/**
 * Attach the headers that identify this CLI (and its version) to every request
 * the Translator makes, for billing/analytics.
 *
 * The SDK has no public constructor option for custom headers, but its internal
 * client exposes setExtraHeader(), and those headers are merged into every HTTP
 * request (translate, detect, memories.*, glossaries.*). We reach the internal
 * client through a defensive cast: if the SDK ever changes its internals we skip
 * silently rather than crash the CLI (the laraHeaders test guards against that
 * by asserting the real SDK still applies the headers).
 */
export function applyLaraClientHeaders(translator: Translator): void {
  const internal = (translator as unknown as { client?: ClientWithExtraHeader }).client;
  if (typeof internal?.setExtraHeader !== 'function') {
    return;
  }
  internal.setExtraHeader('X-Lara-Client', 'CLI');
  internal.setExtraHeader('X-Lara-Client-Version', getPackageVersion());
}
