import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { LaraApiError } from '@translated/lara';

import { getErrorMessage, isQuotaError } from '#utils/error.js';
import { getPackageVersion } from '#utils/version.js';
import {
  ACCOUNT_FILE_PREFIX,
  BAKED_METRICS_API_KEY,
  BAKED_METRICS_URL,
  FLUSH_TIMEOUT_MS,
  INGEST_PATH,
  INSTALLATION_FILE,
  MAX_EVENT_AGE_MS,
  MAX_QUEUE,
  MAX_UINT32,
  METRICS_CHANNEL,
  PRE_AUTH_EVENT_TYPES,
  QUEUE_FILE,
  TOKEN_COOLDOWN_FILE,
  TOKEN_MARGIN_MS,
  TOKEN_PATH,
} from './metrics.const.js';

/**
 * Usage metrics for the `cli` channel.
 *
 * The rule that governs every line of this file: nothing here may slow down or
 * break the CLI. Events are appended synchronously to a queue file and sent in
 * a single bounded batch on the way out of the command; whatever could not be
 * delivered rides along with the next command's send — there is no flush on the
 * way in. Every exported function swallows its own errors; a missing key, an
 * unreachable backend or a read-only disk all degrade to "no telemetry", never
 * to a failed translation.
 *
 * Ingestion is two steps: the channel key buys a short-lived token from
 * /auth/issue-token, and only that token is accepted by /metrics/ingest-events.
 * The channel key never reaches the ingestion endpoint and the token never
 * reaches the disk.
 */

export type MetricsErrorType =
  | 'auth_401'
  | 'auth_403'
  | 'payment_402'
  | 'quota_exceeded'
  | 'rate_limit_429'
  | 'timeout'
  | 'server_5xx'
  | 'validation_error'
  | 'unknown';

type Transport = { url: string; key: string };

/** What a command tells the metrics module about itself while it runs. */
export type RunContext = {
  /** Which entry point the user reached for. Also decides `feature`. */
  mode?: 'text' | 'file' | 'config';
  sourceLang?: string;
  targetLang?: string;
  elements?: number;
  locales?: number;
};

/** The SDK's internal client, reached defensively — see trackLaraClient. */
type TokenBearingClient = { token?: string };

/** Groups every event of a single CLI invocation. */
const SESSION_ID = randomUUID();

let startedAt = Date.now();
let charsTranslated = 0;
let lastError: unknown = undefined;
let authEventSent = false;
let commandFinished = false;
/** Only translation commands close with a call_success / call_error. */
let terminalEvent = true;
let context: RunContext = {};

/** Memory only. A token on disk is a credential on disk. */
let cachedToken: { value: string; expiresAt: number } | null = null;
/** Set when the baked channel key is rejected: it will never become valid again. */
let channelKeyRejected = false;
let cachedAccountId: string | null = null;
let trackedClient: TokenBearingClient | null = null;

/** A value the bake step never replaced is not a configured value. */
function isConfigured(value: string | undefined): value is string {
  return Boolean(value) && !/^__.*__$/.test(value!);
}

function transport(): Transport | null {
  if (process.env.LARA_TELEMETRY_DISABLED) {
    return null;
  }
  const url = process.env.METRICS_URL ?? BAKED_METRICS_URL;
  const key = process.env.METRICS_API_KEY ?? BAKED_METRICS_API_KEY;
  if (!isConfigured(url) || !isConfigured(key)) {
    return null;
  }
  return { url: url.replace(/\/+$/, ''), key };
}

/**
 * Per-user, per-machine state directory. It lives in the home directory and not
 * in the project: the installation id and the resolved account id must survive
 * a fresh checkout.
 */
function stateDir(): string | null {
  const preferred = process.env.LARA_STATE_DIR ?? join(homedir(), '.lara');
  try {
    mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    // Home not writable (some CI images, locked-down containers).
  }
  try {
    const fallback = join(tmpdir(), 'lara-cli');
    mkdirSync(fallback, { recursive: true });
    return fallback;
  } catch {
    return null;
  }
}

/** Resolves a file inside the state directory, or null if there is nowhere to put it. */
function stateFile(name: string): string | null {
  const dir = stateDir();
  return dir ? join(dir, name) : null;
}

/**
 * One UUID per installation, generated once and persisted. The backend keys its
 * rate limits on this, so a fresh one per start-up would make them meaningless.
 */
export function installationId(): string | null {
  try {
    if (!transport()) {
      return null;
    }
    const file = stateFile(INSTALLATION_FILE);
    if (!file) {
      return null;
    }
    if (existsSync(file)) {
      const stored = readFileSync(file, 'utf8').trim();
      if (stored) {
        return stored;
      }
    }
    const fresh = randomUUID();
    writeFileSync(file, fresh);
    return fresh;
  } catch {
    return null;
  }
}

/**
 * Registers the SDK's Lara client so the account id can be read from the JWT it
 * already holds. The SDK authenticates with the access key on its own and keeps
 * the resulting token on its internal client; reaching it costs nothing, while
 * re-implementing the signed /v2/auth call would cost an extra round trip. The
 * cast is defensive: if the SDK changes its internals we lose the account id and
 * stop reporting, we never crash.
 */
export function trackLaraClient(client: unknown): void {
  trackedClient = (client ?? null) as TokenBearingClient | null;
}

/** Where the resolved account id is cached, keyed by access key id. */
function accountCacheFile(): string | null {
  const keyId = process.env.LARA_ACCESS_KEY_ID;
  if (!keyId) {
    return null;
  }
  const scope = createHash('sha256').update(keyId).digest('hex').slice(0, 16);
  return stateFile(`${ACCOUNT_FILE_PREFIX}${scope}`);
}

/**
 * The Lara account id lives in the `id` claim of the Lara JWT. Anything that is
 * not an `acc_` value is not an account id — a key hash or a key id would split
 * one customer into several accounts, which is exactly what the shared standard
 * forbids.
 */
function accountIdFromJwt(token: string): string | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as {
      id?: unknown;
    };
    return typeof payload.id === 'string' && payload.id.startsWith('acc_') ? payload.id : null;
  } catch {
    return null;
  }
}

/**
 * Memory, then the live JWT, then the last value seen on this machine. The disk
 * fallback is what lets a revoked or expired key still report auth_fail: at that
 * point there is no token to read the account from.
 */
export function currentAccountId(): string | null {
  if (cachedAccountId) {
    return cachedAccountId;
  }

  const live = trackedClient?.token ? accountIdFromJwt(trackedClient.token) : null;
  if (live) {
    cachedAccountId = live;
    try {
      const file = accountCacheFile();
      if (file) {
        writeFileSync(file, live);
      }
    } catch {
      // A cache we cannot write just means we resolve it again next run.
    }
    return live;
  }

  try {
    const file = accountCacheFile();
    if (file && existsSync(file)) {
      const stored = readFileSync(file, 'utf8').trim();
      if (stored.startsWith('acc_')) {
        cachedAccountId = stored;
        return stored;
      }
    }
  } catch {
    // Unreadable cache: no account id, no events. Never fatal.
  }

  return null;
}

/**
 * Never blocks, never touches the network, never throws. Every guard telemetry
 * has lives here: this is the only door onto the queue, so nothing upstream has
 * to re-check whether reporting is on.
 */
export function queueEvent(event: Record<string, unknown>): void {
  try {
    // Transport first: resolving the account id touches the disk, and telemetry
    // that is switched off must not so much as create the state directory.
    if (!transport()) {
      return;
    }
    const accountId = currentAccountId();
    // `auth_fail` is the one event that matters most when there is no account
    // id to attach: a key Lara rejected the first time it was used. The backend
    // accepts it, and `install`, without one. Everything else is dropped —
    // an event missing a required field would 400 the whole batch it rides in.
    if (!accountId && !PRE_AUTH_EVENT_TYPES.includes(String(event.eventType))) {
      return;
    }
    const file = stateFile(QUEUE_FILE);
    if (!file) {
      return;
    }
    // The identity fields come last on purpose: a caller cannot override the
    // channel it reports as, the account the event belongs to, or its clock.
    const line = JSON.stringify({
      ...event,
      eventId: randomUUID(),
      channel: METRICS_CHANNEL,
      // Omit means omit: an invented or empty id would be a fake account.
      ...(accountId ? { accountId } : {}),
      channelVersion: getPackageVersion(),
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString(),
    });
    appendFileSync(file, `${line}\n`);
  } catch {
    // Telemetry must never surface to the user.
  }
}

/**
 * The token endpoint rate limits per installation and answers 429 with a
 * Retry-After. Remembering it across processes is the difference between one
 * doomed request per CLI invocation and none: a burst of commands would
 * otherwise each pay a round trip on the user's path to be told to wait.
 */
function tokenCooldownActive(): boolean {
  try {
    const file = stateFile(TOKEN_COOLDOWN_FILE);
    if (!file || !existsSync(file)) {
      return false;
    }
    return Number(readFileSync(file, 'utf8').trim()) > Date.now();
  } catch {
    return false;
  }
}

function rememberTokenCooldown(response: Response): void {
  try {
    const file = stateFile(TOKEN_COOLDOWN_FILE);
    if (!file) {
      return;
    }
    const header = Number(response.headers.get('retry-after'));
    const seconds = Number.isFinite(header) && header > 0 ? header : 10;
    writeFileSync(file, String(Date.now() + seconds * 1_000));
  } catch {
    // Without the note we simply pay one wasted request next run.
  }
}

/**
 * Buys an ingestion token with the channel key. Cached in memory for the rest of
 * the process; never written anywhere.
 */
async function getToken(t: Transport, signal: AbortSignal): Promise<string | null> {
  if (channelKeyRejected) {
    return null;
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  if (tokenCooldownActive()) {
    return null;
  }

  const install = installationId();
  if (!install) {
    return null;
  }

  const response = await fetch(`${t.url}${TOKEN_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ installationId: install }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      rememberTokenCooldown(response);
      return null;
    }
    // A rejected key is baked into this published version: it will never start
    // working, so the queue behind it is dead weight.
    if (response.status === 401 || response.status === 403) {
      const code = await response
        .json()
        .then((body: unknown) => (body as { code?: unknown }).code)
        .catch(() => undefined);
      if (code === 'api_key_invalid' || response.status === 403) {
        channelKeyRejected = true;
      }
    }
    return null;
  }

  const body = (await response.json()) as { token?: unknown; expiresIn?: unknown };
  if (typeof body.token !== 'string' || !body.token) {
    return null;
  }
  const ttlMs = typeof body.expiresIn === 'number' ? body.expiresIn * 1_000 : 0;
  cachedToken = {
    value: body.token,
    expiresAt: Date.now() + Math.max(ttlMs - TOKEN_MARGIN_MS, 0),
  };
  return body.token;
}

function postEvents(
  t: Transport,
  token: string,
  events: unknown[],
  signal: AbortSignal
): Promise<Response> {
  return fetch(`${t.url}${INGEST_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events }),
    signal,
  });
}

/** Sends everything queued, in one batch. Bounded, silent, and never throws. */
export async function flushQueue(): Promise<void> {
  try {
    // Check the transport before touching the disk: with telemetry off, this
    // must not so much as create the state directory.
    const t = transport();
    if (!t) {
      return;
    }
    const file = stateFile(QUEUE_FILE);
    if (!file || !existsSync(file)) {
      return;
    }

    let events: unknown[];
    try {
      const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
      // Trim on disk, not just on the wire: a machine that has been failing to
      // flush for months would otherwise re-read and re-parse every line it is
      // never going to send.
      const kept = lines.slice(-MAX_QUEUE);
      if (kept.length < lines.length) {
        writeFileSync(file, `${kept.join('\n')}\n`);
      }
      // An event past the backend's 30-day bound is rejected together with the
      // whole batch, so one stale line would cost every fresh event with it.
      const cutoff = Date.now() - MAX_EVENT_AGE_MS;
      events = kept
        .map((line) => JSON.parse(line) as { timestamp?: unknown })
        .filter(
          (event) =>
            typeof event.timestamp !== 'string' || Date.parse(event.timestamp) >= cutoff
        );
    } catch {
      // A corrupted queue can never be accepted: drop it rather than retry forever.
      unlinkSync(file);
      return;
    }

    if (events.length === 0) {
      // Everything on disk aged past what the backend accepts: nothing to send,
      // and nothing worth re-reading next run either.
      writeFileSync(file, '');
      return;
    }

    // One budget for the whole exchange: the flush sits on the user's path.
    const signal = AbortSignal.timeout(FLUSH_TIMEOUT_MS);
    const send = async (): Promise<Response | null> => {
      const token = await getToken(t, signal);
      return token ? postEvents(t, token, events, signal) : null;
    };

    let response = await send();

    // An expired token is the one recoverable 401: one new token, one retry.
    // That is the whole refresh logic.
    if (response?.status === 401) {
      cachedToken = null;
      response = await send();
    }

    // A 429 comes with a Retry-After and the contract says to honour it. The
    // cooldown gates the token exchange, and no token means no flush — which is
    // exactly the wait, carried to the next process the same way.
    if (response?.status === 429) {
      rememberTokenCooldown(response);
    }

    // Drop only what will never be accepted: a batch the backend refuses on
    // sight, or one behind a channel key that this published version can never
    // fix. A 401/403/429/5xx is recoverable, so the queue survives to next run.
    const dead = response
      ? response.ok || response.status === 400 || response.status === 413
      : channelKeyRejected;
    if (dead) {
      writeFileSync(file, '');
    }
  } catch {
    // Network down, timeout, unwritable file: keep the queue for next time.
  }
}

/**
 * Maps an error to one of a closed vocabulary of tokens. Free text would make
 * the dashboard grouping useless, so every channel maps to the same words.
 */
export function errorTypeFor(error: unknown): MetricsErrorType {
  // An error raised only to unwind carries the real one as its cause. Classify
  // that, or a fatal 401 would be reported as a plain `unknown`.
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause !== undefined) {
    const fromCause = classify(cause);
    if (fromCause !== 'unknown') {
      return fromCause;
    }
  }
  return classify(error);
}

function classify(error: unknown): MetricsErrorType {
  if (isQuotaError(error)) {
    return 'quota_exceeded';
  }

  if (error instanceof LaraApiError) {
    switch (error.statusCode) {
      case 400:
        return 'validation_error';
      case 401:
        return 'auth_401';
      case 402:
        return 'payment_402';
      case 403:
        return 'auth_403';
      case 429:
        return 'rate_limit_429';
      default:
        break;
    }
    if (error.statusCode >= 500) {
      return 'server_5xx';
    }
  }

  const name = error instanceof Error ? error.name : '';
  if (name === 'AbortError' || name === 'TimeoutError') {
    return 'timeout';
  }
  if (/\btimed?\s?out\b|\btimeout\b|ETIMEDOUT/i.test(getErrorMessage(error))) {
    return 'timeout';
  }

  return 'unknown';
}

/** The backend 400s on values past uint32 rather than wrapping them in storage. */
function clampUint32(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(Math.trunc(value), MAX_UINT32);
}

/**
 * What a command reports. `auth-only` covers the commands that talk to Lara but
 * never translate — memory, glossary, init: a `lara memory list` counted as a
 * successful translation would move the funnel for work that never happened.
 */
export type CommandKind = 'translation' | 'auth-only';

/**
 * Opens the metrics window for a command. Pair it with finishAndFlush, which
 * runSafely does for every command in the CLI.
 *
 * The exit hook is the safety net, not the main path. It only appends to a file,
 * so it can never hang the user's terminal, and it covers the exits that bypass
 * finishAndFlush (prompt cancellations, argument validation). Those events go
 * out with the next run's flush.
 *
 * Nothing is flushed here. An open-time flush would put a token exchange and an
 * upload in front of the user's command — before it has even validated its
 * arguments — to send events that the closing flush picks up anyway: it reads
 * the whole queue file, so leftovers from earlier runs ride along with it.
 */
export function instrument(kind: CommandKind): void {
  startedAt = Date.now();
  terminalEvent = kind === 'translation';
  process.once('exit', (code: number) => finishCommand(code));
}

/** Non-personal facts about the run. Never paths, text or credentials. */
export function setContext(fields: RunContext): void {
  context = { ...context, ...fields };
}

export function recordTranslated(chars: number): void {
  if (Number.isFinite(chars) && chars > 0) {
    charsTranslated += chars;
  }
}

export function recordError(error: unknown): void {
  // Never let a later, vaguer error bury one that was already classified: the
  // per-file API failure is what the funnel needs, not the generic error the
  // command finally unwinds with.
  if (lastError !== undefined && errorTypeFor(error) === 'unknown') {
    return;
  }
  lastError = error;
}

/**
 * The CLI has no login step, so auth is only ever proven by a real API answer.
 * Sent at most once per run.
 */
export function recordAuthResult(ok: boolean, error?: unknown): void {
  if (authEventSent) {
    return;
  }
  authEventSent = true;
  queueEvent(
    ok ? { eventType: 'auth_success' } : { eventType: 'auth_fail', errorType: errorTypeFor(error) }
  );
}

/**
 * Builds the metadata block. `feature` names the capability that was exercised
 * and is never omitted — a dashboard cannot tell an absent value apart from a
 * capability that does not exist. `surface` says which entry point the user
 * reached for, in this CLI's own vocabulary.
 */
function buildMetadata(exitCode: number): Record<string, unknown> {
  const { mode, sourceLang, targetLang, ...rest } = context;

  const metadata: Record<string, unknown> = {
    ...rest,
    feature: mode === 'text' ? 'text' : 'document',
    exitCode,
  };

  if (mode) {
    metadata.surface = mode;
  }
  // Only when a single pair is actually known: config mode fans out to N targets.
  if (sourceLang) {
    metadata.sourceLang = sourceLang.toLowerCase();
  }
  if (targetLang) {
    metadata.targetLang = targetLang.toLowerCase();
  }

  return metadata;
}

/**
 * Queues the single terminal event for the command. Safe to call from a
 * `process.on('exit')` handler: it only ever writes synchronously.
 */
export function finishCommand(exitCode: number): void {
  if (commandFinished || !terminalEvent) {
    return;
  }
  commandFinished = true;

  try {
    const common = {
      latencyMs: clampUint32(Date.now() - startedAt),
      charsTranslated: clampUint32(charsTranslated),
      metadata: buildMetadata(exitCode),
    };

    if (exitCode !== 0) {
      queueEvent({ eventType: 'call_error', errorType: errorTypeFor(lastError), ...common });
      return;
    }

    queueEvent({ eventType: 'call_success', ...common });
  } catch {
    // Never let the exit path fail because of telemetry.
  }
}

/**
 * Closes the run and sends it, in that order. This is what makes a one-shot user
 * report at all: without it the last run's events sit on disk until the CLI is
 * used again. Never throws — the caller is on its way out.
 */
export async function finishAndFlush(exitCode: number): Promise<void> {
  finishCommand(exitCode);
  await flushQueue();
}
