import { Translator } from '@translated/lara';
import { getPackageVersion } from './version.js';

/** The two members of the SDK's internal client this CLI reaches for. */
export type LaraInternalClient = {
  setExtraHeader?: (name: string, value: string) => void;
  token?: string;
};

/**
 * The SDK's internal HTTP client. It has no public accessor, so we reach it
 * through a defensive cast: callers get `undefined` and degrade quietly if the
 * SDK ever changes its internals, rather than crashing the CLI. Keeping the one
 * cast here means an SDK rename is one thing to fix, and the laraHeaders test —
 * which asserts the real SDK still applies our headers — guards every consumer.
 */
export function internalLaraClient(translator: Translator): LaraInternalClient | undefined {
  return (translator as unknown as { client?: LaraInternalClient }).client;
}

/**
 * Attach the headers that identify this CLI (and its version) to every request
 * the Translator makes, for billing/analytics.
 *
 * The SDK has no public constructor option for custom headers, but its internal
 * client exposes setExtraHeader(), and those headers are merged into every HTTP
 * request (translate, detect, memories.*, glossaries.*).
 */
export function applyLaraClientHeaders(translator: Translator): void {
  const internal = internalLaraClient(translator);
  if (typeof internal?.setExtraHeader !== 'function') {
    return;
  }
  internal.setExtraHeader('X-Lara-Client', 'CLI');
  internal.setExtraHeader('X-Lara-Client-Version', getPackageVersion());
}
