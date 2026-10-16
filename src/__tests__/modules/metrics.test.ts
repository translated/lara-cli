import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  utimesSync,
  readFileSync,
  rmSync,
  writeFileSync,
  chmodSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LaraApiError } from '@translated/lara';

import {
  AUTH_SUCCESS_FILE_PREFIX,
  CI_ENV_VARS,
  FLUSH_LOCK_FILE,
  INSTALLATION_FILE,
  MAX_UINT32,
  QUEUE_FILE,
  SESSION_FILE,
  SESSION_IDLE_TIMEOUT_MS,
  TOKEN_COOLDOWN_FILE,
} from '#modules/metrics/metrics.const.js';

type Metrics = typeof import('#modules/metrics/metrics.js');

const ACCESS_KEY_ID = 'test-access-key-id';
const ACCOUNT_ID = 'acc_4kQpXbW2mNvRt7yZjD3sLh';
const CHANNEL_KEY = 'metrics-key';
const INGEST_TOKEN = 'ingest-token-aaa';
const ENV_KEYS = [
  'DO_NOT_TRACK',
  'METRICS_URL',
  'METRICS_API_KEY',
  'LARA_ACCESS_KEY_ID',
  'LARA_ACCESS_KEY_SECRET',
  'LARA_STATE_DIR',
  // Cleared too: the suite runs on CI, and `ci` is reported from these.
  ...CI_ENV_VARS,
] as const;

let stateDir: string;
let savedEnv: Record<string, string | undefined>;

/** A Lara JWT carries the account in its `id` claim. Only the payload is read. */
function laraJwt(accountId: string, extra: Record<string, unknown> = {}): string {
  const payload = Buffer.from(JSON.stringify({ ...extra, id: accountId })).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
}

/**
 * A fresh module instance: the session id, the cached token and the in-memory
 * counters all reset, exactly as they would in a new CLI process. Passing null
 * simulates a run where the SDK never authenticated.
 */
async function loadMetrics(accountId: string | null = ACCOUNT_ID): Promise<Metrics> {
  vi.resetModules();
  const metrics = await import('#modules/metrics/metrics.js');
  if (accountId !== null) {
    metrics.trackLaraClient({ token: laraJwt(accountId) });
  }
  return metrics;
}

function queuePath(): string {
  return join(stateDir, QUEUE_FILE);
}

function queueFiles(): string[] {
  return readdirSync(stateDir)
    .filter(
      (name) =>
        name === QUEUE_FILE || (name.startsWith(`${QUEUE_FILE}.`) && name.endsWith('.jsonl'))
    )
    .sort()
    .map((name) => join(stateDir, name));
}

function clearQueue(): void {
  for (const file of queueFiles()) {
    rmSync(file, { force: true });
  }
}

function queuedEvents(): Record<string, unknown>[] {
  return queueFiles().flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
  );
}

function response(status: number): Response {
  return new Response(null, { status });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tokenOk(token = INGEST_TOKEN, expiresIn = 3600): Response {
  return jsonResponse(200, { status: 'success', token, expiresIn });
}

function rateLimited(retryAfterSeconds: number): Response {
  return new Response(JSON.stringify({ code: 'rate_limited', retryAfterSeconds }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSeconds),
    },
  });
}

type Call = { init: RequestInit };
type Route = (call: number) => Response;

/**
 * Stands in for the two-step backend. Defaults to the happy path: a token, then
 * a 202. Either route can be overridden per call number.
 */
function mockBackend(routes: { token?: Route; ingest?: Route } = {}) {
  const tokenCalls: Call[] = [];
  const ingestCalls: Call[] = [];

  const spy = vi.fn((input: unknown, init: unknown) => {
    const url = String(input);
    const request = (init ?? {}) as RequestInit;
    if (url.endsWith('/auth/issue-token')) {
      tokenCalls.push({ init: request });
      return routes.token ? routes.token(tokenCalls.length) : tokenOk();
    }
    ingestCalls.push({ init: request });
    return routes.ingest ? routes.ingest(ingestCalls.length) : response(202);
  });

  vi.stubGlobal('fetch', spy);
  return { spy, tokenCalls, ingestCalls };
}

function bodyOf(call: Call): Record<string, unknown> {
  return JSON.parse(String(call.init.body)) as Record<string, unknown>;
}

function authOf(call: Call): string {
  return (call.init.headers as Record<string, string>).Authorization!;
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  stateDir = mkdtempSync(join(tmpdir(), 'lara-metrics-test-'));

  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  process.env.LARA_STATE_DIR = stateDir;
  process.env.METRICS_URL = 'https://metrics.example/';
  process.env.METRICS_API_KEY = CHANNEL_KEY;
  process.env.LARA_ACCESS_KEY_ID = ACCESS_KEY_ID;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(stateDir, { recursive: true, force: true });
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

describe('opt-out and configuration', () => {
  it('writes nothing and calls no network once instrumented in no-trace mode', async () => {
    const { spy } = mockBackend();
    const metrics = await loadMetrics();

    metrics.instrument('translate', true);
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(spy).not.toHaveBeenCalled();
    expect(queuedEvents()).toEqual([]);
  });

  it('deletes what an earlier, traced run had queued', async () => {
    const metrics = await loadMetrics();
    const { spy } = mockBackend();
    writeFileSync(queuePath(), `${JSON.stringify({ eventType: 'call_success' })}\n`);

    metrics.instrument('translate', true);

    expect(existsSync(queuePath())).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('writes nothing and calls no network when DO_NOT_TRACK is set', async () => {
    process.env.DO_NOT_TRACK = '1';
    const { spy } = mockBackend();
    const metrics = await loadMetrics();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(spy).not.toHaveBeenCalled();
    expect(queuedEvents()).toEqual([]);
  });

  it.each(['0', 'false', ''])(
    'treats %o as "leave telemetry alone", not as an opt-out',
    async (value) => {
      process.env.DO_NOT_TRACK = value;
      const { ingestCalls } = mockBackend();
      const metrics = await loadMetrics();

      metrics.queueEvent({ eventType: 'call_success' });
      await metrics.flushQueue();

      expect(ingestCalls).toHaveLength(1);
    }
  );

  it('stays off when the bake step never replaced the placeholders', async () => {
    delete process.env.METRICS_URL;
    delete process.env.METRICS_API_KEY;
    const { spy } = mockBackend();
    const metrics = await loadMetrics();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(spy).not.toHaveBeenCalled();
    expect(queuedEvents()).toEqual([]);
  });

  it('stays off without a resolvable account: an event with no accountId joins nothing', async () => {
    const { spy } = mockBackend();
    const metrics = await loadMetrics(null);

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(queuedEvents()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not even create the state directory when telemetry is off', async () => {
    const missing = join(stateDir, 'never-created');
    process.env.LARA_STATE_DIR = missing;
    process.env.DO_NOT_TRACK = '1';
    const metrics = await loadMetrics();

    await metrics.flushQueue();
    metrics.queueEvent({ eventType: 'call_success' });
    metrics.installationId();

    expect(existsSync(missing)).toBe(false);
  });

  it('reports when key, url and a resolvable account are all present', async () => {
    const metrics = await loadMetrics();

    metrics.queueEvent({ eventType: 'call_success' });

    expect(queuedEvents()).toHaveLength(1);
  });
});

describe('installationId', () => {
  it('is a UUID, persisted, and stable across restarts', async () => {
    const first = await loadMetrics();
    const id = first.installationId();

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(readFileSync(join(stateDir, INSTALLATION_FILE), 'utf8')).toBe(id);

    const second = await loadMetrics();
    expect(second.installationId()).toBe(id);
  });

  it('regenerates when the file is empty or gone', async () => {
    const metrics = await loadMetrics();
    const first = metrics.installationId();

    writeFileSync(join(stateDir, INSTALLATION_FILE), '   ');
    const second = (await loadMetrics()).installationId();

    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('announces telemetry once, on stderr, when the installation is first stored', async () => {
    const written: string[] = [];
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        written.push(String(chunk));
        return true;
      });

    try {
      (await loadMetrics()).installationId();
      expect(written.join('')).toContain('--no-trace');
      expect(written.join('')).toContain('DO_NOT_TRACK=1');

      // Second run, same machine: the id is already on disk, so nothing is said.
      written.length = 0;
      (await loadMetrics()).installationId();
      expect(written).toEqual([]);
    } finally {
      stderr.mockRestore();
    }
  });

  it('is the installationId sent to the token endpoint', async () => {
    const metrics = await loadMetrics();
    const { tokenCalls } = mockBackend();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(bodyOf(tokenCalls[0]!)).toEqual({
      installationId: readFileSync(join(stateDir, INSTALLATION_FILE), 'utf8'),
    });
  });
});

describe('accountId', () => {
  it('is the raw acc_ id read from the Lara JWT, never a hash', async () => {
    const metrics = await loadMetrics();

    expect(metrics.currentAccountId()).toBe(ACCOUNT_ID);

    metrics.queueEvent({ eventType: 'call_success' });
    expect(queuedEvents()[0]!.accountId).toBe(ACCOUNT_ID);
  });

  it('survives a restart in which the SDK never authenticated', async () => {
    const first = await loadMetrics();
    expect(first.currentAccountId()).toBe(ACCOUNT_ID);

    const second = await loadMetrics(null);
    expect(second.currentAccountId()).toBe(ACCOUNT_ID);
  });

  it('is scoped to the access key id: another key does not inherit it', async () => {
    const first = await loadMetrics();
    expect(first.currentAccountId()).toBe(ACCOUNT_ID);

    process.env.LARA_ACCESS_KEY_ID = 'a-different-access-key-id';
    const second = await loadMetrics(null);
    expect(second.currentAccountId()).toBeNull();
  });

  it.each([
    ['a claim that is not an account id', laraJwt('user_123')],
    [
      'a token with no id claim',
      `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{}').toString('base64url')}.s`,
    ],
    ['a malformed token', 'not-a-jwt'],
    ['an empty token', ''],
  ])('refuses %s', async (_label, token) => {
    vi.resetModules();
    const metrics = await import('#modules/metrics/metrics.js');
    metrics.trackLaraClient({ token });

    expect(metrics.currentAccountId()).toBeNull();
    metrics.queueEvent({ eventType: 'call_success' });
    expect(queuedEvents()).toEqual([]);
  });

  it('survives a client the SDK no longer shapes the way we expect', async () => {
    vi.resetModules();
    const metrics = await import('#modules/metrics/metrics.js');
    metrics.trackLaraClient(undefined);

    expect(metrics.currentAccountId()).toBeNull();
    expect(() => metrics.queueEvent({ eventType: 'call_success' })).not.toThrow();
  });
});

describe('usage sessions', () => {
  function state(): { scope: string; sessionId: string; lastActivity: number } {
    return JSON.parse(readFileSync(join(stateDir, SESSION_FILE), 'utf8'));
  }

  it('shares a session across commands and renews the inactivity deadline', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const first = await loadMetrics();
    first.instrument('init');
    first.finishCommand(0);
    const original = state().sessionId;
    now += 20 * 60_000;
    const second = await loadMetrics();
    second.instrument('translate');
    second.finishCommand(0);
    expect(state().sessionId).toBe(original);
    expect(state().lastActivity).toBe(now);
    now += 20 * 60_000;
    const third = await loadMetrics();
    third.instrument('memory list');
    third.finishCommand(0);
    expect(queuedEvents().map((event) => event.sessionId)).toEqual([original, original, original]);
  });

  it.each([SESSION_IDLE_TIMEOUT_MS, SESSION_IDLE_TIMEOUT_MS + 1])(
    'opens a new session after %i ms without activity',
    async (elapsed) => {
      let now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      const first = await loadMetrics();
      first.queueEvent({ eventType: 'call_success' });
      const original = state().sessionId;
      now += elapsed;
      const second = await loadMetrics();
      second.queueEvent({ eventType: 'call_success' });
      expect(state().sessionId).not.toBe(original);
      expect(queuedEvents()).toHaveLength(2);
    }
  );

  it('keeps a long command in its original session and renews activity when it finishes', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordApiAnswer();
    const original = state().sessionId;
    now += SESSION_IDLE_TIMEOUT_MS + 1;
    metrics.finishCommand(0);
    expect(queuedEvents().every((event) => event.sessionId === original)).toBe(true);
    expect(state().lastActivity).toBe(now);
    const next = await loadMetrics();
    next.queueEvent({ eventType: 'call_success' });
    expect(state().sessionId).toBe(original);
  });

  it('does not replace a newer session when an older long command finishes', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const first = await loadMetrics();
    first.instrument('translate');
    first.recordApiAnswer();
    const original = state().sessionId;
    now += SESSION_IDLE_TIMEOUT_MS + 1;
    const second = await loadMetrics();
    second.instrument('translate');
    second.finishCommand(0);
    const newer = state().sessionId;
    expect(newer).not.toBe(original);
    now += 1;
    first.recordApiAnswer();
    first.finishCommand(0);
    expect(state().sessionId).toBe(newer);
    const next = await loadMetrics();
    next.queueEvent({ eventType: 'call_success' });
    expect(state().sessionId).toBe(newer);
  });

  it('starts a new session when switching accounts and when switching back', async () => {
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    const first = state().sessionId;
    (await loadMetrics('acc_other')).queueEvent({ eventType: 'call_success' });
    const other = state().sessionId;
    expect(other).not.toBe(first);
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    expect(state().sessionId).not.toBe(other);
    expect(state().sessionId).not.toBe(first);
  });

  it('shares the account session after API key rotation', async () => {
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    const first = state().sessionId;
    process.env.LARA_ACCESS_KEY_ID = 'rotated-key';
    const next = await loadMetrics();
    next.instrument('translate');
    next.queueEvent({ eventType: 'call_success' });
    expect(state().sessionId).toBe(first);
  });

  it.each([
    'invalid JSON',
    JSON.stringify({ sessionId: 'invalid', scope: 'cli:' + ACCOUNT_ID, lastActivity: Date.now() }),
    JSON.stringify({
      sessionId: 'd0f8feed-530b-4fa4-a163-a60111111111',
      scope: 'cli:' + ACCOUNT_ID,
      lastActivity: 'bad',
    }),
  ])('replaces corrupted session state: %s', async (broken) => {
    writeFileSync(join(stateDir, SESSION_FILE), broken);
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    expect(state().sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(queuedEvents()).toHaveLength(1);
  });

  it('opens a new session when the saved activity is in the future', async () => {
    const metrics = await loadMetrics();
    metrics.queueEvent({ eventType: 'call_success' });
    const old = state();
    writeFileSync(
      join(stateDir, SESSION_FILE),
      JSON.stringify({ ...old, lastActivity: Date.now() + 60_000 })
    );
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    expect(state().sessionId).not.toBe(old.sessionId);
  });

  it('keeps an opt-out from creating or extending a session', async () => {
    const first = await loadMetrics();
    first.queueEvent({ eventType: 'call_success' });
    const before = readFileSync(join(stateDir, SESSION_FILE), 'utf8');
    const quiet = await loadMetrics();
    quiet.instrument('translate', true);
    quiet.recordApiAnswer();
    quiet.finishCommand(0);
    expect(readFileSync(join(stateDir, SESSION_FILE), 'utf8')).toBe(before);
  });

  it('joins an existing session under brief lock contention without overwriting it', async () => {
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    const before = state();
    mkdirSync(join(stateDir, `${SESSION_FILE}.lock`));
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    expect(state()).toEqual(before);
    expect(queuedEvents()).toHaveLength(2);
    expect(queuedEvents().every((event) => event.sessionId === before.sessionId)).toBe(true);
  });

  it('recovers the session lock after a crashed writer', async () => {
    const lock = join(stateDir, `${SESSION_FILE}.lock`);
    mkdirSync(lock);
    const old = new Date(Date.now() - 60_000);
    utimesSync(lock, old, old);
    (await loadMetrics()).queueEvent({ eventType: 'call_success' });
    expect(queuedEvents()).toHaveLength(1);
    expect(existsSync(lock)).toBe(false);
  });

  it('attributes errors before authentication to the existing account session', async () => {
    const first = await loadMetrics();
    first.queueEvent({ eventType: 'call_success' });
    const original = state().sessionId;
    const failed = await loadMetrics(null);
    failed.instrument('translate');
    failed.finishCommand(1);
    expect(queuedEvents().at(-1)).toMatchObject({
      eventType: 'call_error',
      accountId: ACCOUNT_ID,
      sessionId: original,
    });
  });
});

describe('queueEvent', () => {
  it('stamps eventId, channel, accountId, version, sessionId and timestamp', async () => {
    const metrics = await loadMetrics();

    metrics.queueEvent({ eventType: 'auth_success' });
    metrics.queueEvent({ eventType: 'call_success' });
    const [first, second] = queuedEvents();

    expect(first).toMatchObject({
      eventType: 'auth_success',
      channel: 'cli',
      accountId: ACCOUNT_ID,
    });
    expect(first!.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof first!.channelVersion).toBe('string');
    expect(String(first!.timestamp)).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    // One session id for the whole invocation, one event id per event.
    expect(second!.sessionId).toBe(first!.sessionId);
    expect(second!.eventId).not.toBe(first!.eventId);
  });

  it('does not let a caller override the identity of an event', async () => {
    const metrics = await loadMetrics();

    metrics.queueEvent({
      eventType: 'call_success',
      channel: 'slack',
      accountId: 'acc_someone_else',
      timestamp: '1999-01-01T00:00:00.000Z',
    });

    expect(queuedEvents()[0]).toMatchObject({ channel: 'cli', accountId: ACCOUNT_ID });
    expect(queuedEvents()[0]!.timestamp).not.toBe('1999-01-01T00:00:00.000Z');
  });

  it('queues auth_fail without an accountId: the backend takes it, and it is the one that matters', async () => {
    const metrics = await loadMetrics(null);

    metrics.queueEvent({ eventType: 'auth_fail', errorType: 'auth_401' });

    const [event] = queuedEvents();
    expect(event).toMatchObject({ eventType: 'auth_fail', channel: 'cli' });
    // Omit means omit — never an empty string or a stand-in id.
    expect(event).not.toHaveProperty('accountId');
  });

  it('falls back to a temp directory when the preferred one cannot be created', async () => {
    const locked = join(stateDir, 'locked');
    writeFileSync(join(stateDir, 'sentinel'), '');
    chmodSync(stateDir, 0o500);
    process.env.LARA_STATE_DIR = join(locked, 'nested');

    try {
      const metrics = await loadMetrics();
      expect(() => metrics.queueEvent({ eventType: 'call_success' })).not.toThrow();
      expect(existsSync(join(locked, 'nested'))).toBe(false);
      expect(
        readdirSync(join(tmpdir(), 'lara-cli')).some(
          (name) => name.startsWith(`${QUEUE_FILE}.`) && name.endsWith('.jsonl')
        )
      ).toBe(true);
    } finally {
      chmodSync(stateDir, 0o700);
      rmSync(join(tmpdir(), 'lara-cli'), { recursive: true, force: true });
    }
  });

  it('never writes the ingestion token to disk', async () => {
    const metrics = await loadMetrics();
    mockBackend();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();
    metrics.queueEvent({ eventType: 'call_success' });

    expect(JSON.stringify(queuedEvents())).not.toContain(INGEST_TOKEN);
    expect(readFileSync(join(stateDir, INSTALLATION_FILE), 'utf8')).not.toContain(INGEST_TOKEN);
  });
});

describe('token exchange', () => {
  it('buys a token with the channel key, then ingests with the token', async () => {
    const metrics = await loadMetrics();
    const { spy, tokenCalls, ingestCalls } = mockBackend();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    // Order matters: the key must never reach the ingestion endpoint.
    expect(spy.mock.calls[0]![0]).toBe('https://metrics.example/auth/issue-token');
    expect(spy.mock.calls[1]![0]).toBe('https://metrics.example/metrics/ingest-events');
    expect(authOf(tokenCalls[0]!)).toBe(`Bearer ${CHANNEL_KEY}`);
    expect(authOf(ingestCalls[0]!)).toBe(`Bearer ${INGEST_TOKEN}`);
    expect(String(ingestCalls[0]!.init.body)).not.toContain(CHANNEL_KEY);
  });

  it('reuses the token for a second flush in the same process', async () => {
    const metrics = await loadMetrics();
    const { tokenCalls } = mockBackend();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(tokenCalls).toHaveLength(1);
  });

  it('re-issues a token that is already inside its refresh margin', async () => {
    const metrics = await loadMetrics();
    // expiresIn shorter than the margin: the cache is stale the moment it lands.
    const { tokenCalls } = mockBackend({ token: () => tokenOk(INGEST_TOKEN, 10) });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(tokenCalls).toHaveLength(2);
  });

  it('asks for a new token once on 401 and retries once', async () => {
    const metrics = await loadMetrics();
    const { tokenCalls, ingestCalls } = mockBackend({
      token: (n) => tokenOk(`token-${n}`),
      ingest: (n) => (n === 1 ? response(401) : response(202)),
    });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(tokenCalls).toHaveLength(2);
    expect(authOf(ingestCalls[0]!)).toBe('Bearer token-1');
    expect(authOf(ingestCalls[1]!)).toBe('Bearer token-2');
    expect(queuedEvents()).toEqual([]);
  });

  it('gives up after one retry and keeps the queue', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend({ ingest: () => response(401) });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(ingestCalls).toHaveLength(2);
    expect(queuedEvents()).toHaveLength(1);
  });

  it('keeps the queue when the token endpoint is unreachable', async () => {
    const metrics = await loadMetrics();
    const spy = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    vi.stubGlobal('fetch', spy);

    metrics.queueEvent({ eventType: 'call_success' });
    await expect(metrics.flushQueue()).resolves.toBeUndefined();

    expect(queuedEvents()).toHaveLength(1);
  });

  it('keeps the queue when the token endpoint is rate limited', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend({ token: () => rateLimited(7) });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(ingestCalls).toHaveLength(0);
    expect(queuedEvents()).toHaveLength(1);
  });

  it('waits out the cooldown instead of asking again every run', async () => {
    const first = await loadMetrics();
    const limited = mockBackend({ token: () => rateLimited(30) });

    first.queueEvent({ eventType: 'call_success' });
    await first.flushQueue();
    expect(limited.tokenCalls).toHaveLength(1);
    expect(Number(readFileSync(join(stateDir, TOKEN_COOLDOWN_FILE), 'utf8'))).toBeGreaterThan(
      Date.now()
    );

    // A whole new process, still inside the window the backend asked for.
    vi.unstubAllGlobals();
    const second = await loadMetrics();
    const quiet = mockBackend();
    await second.flushQueue();

    expect(quiet.tokenCalls).toHaveLength(0);
    expect(queuedEvents()).toHaveLength(1);
  });

  it('asks again once the cooldown has passed', async () => {
    const metrics = await loadMetrics();
    writeFileSync(join(stateDir, TOKEN_COOLDOWN_FILE), String(Date.now() - 1_000));
    const { tokenCalls } = mockBackend();

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(tokenCalls).toHaveLength(1);
    expect(queuedEvents()).toEqual([]);
  });

  it('drops the queue when the baked channel key is rejected', async () => {
    const metrics = await loadMetrics();
    const { tokenCalls, ingestCalls } = mockBackend({
      token: () => jsonResponse(401, { code: 'api_key_invalid', message: 'nope' }),
    });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    // The key is compiled into this published version: it will never work again.
    expect(queuedEvents()).toEqual([]);
    expect(ingestCalls).toHaveLength(0);

    // And it stops asking for the rest of the process.
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();
    expect(tokenCalls).toHaveLength(1);
  });

  it('keeps the queue on a 401 that is not the key being invalid', async () => {
    const metrics = await loadMetrics();
    mockBackend({ token: () => jsonResponse(401, { code: 'api_key_missing' }) });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(queuedEvents()).toHaveLength(1);
  });
});

describe('flushQueue', () => {
  it('sends the queue as a batch and clears it on 202', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();

    metrics.queueEvent({ eventType: 'call_success' });
    metrics.queueEvent({ eventType: 'auth_success' });
    await metrics.flushQueue();

    const events = bodyOf(ingestCalls[0]!).events as Record<string, unknown>[];
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ eventType: 'auth_success', channel: 'cli' });
    expect(queuedEvents()).toEqual([]);
  });

  it.each(['same module', 'separate module'])(
    'does not upload the same snapshot concurrently from the %s',
    async (module) => {
      const first = await loadMetrics();
      const second = module === 'same module' ? first : await loadMetrics();
      let releaseUpload!: (response: Response) => void;
      let uploadStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        uploadStarted = resolve;
      });
      const upload = new Promise<Response>((resolve) => {
        releaseUpload = resolve;
      });
      const batches: Record<string, unknown>[][] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn((input: unknown, init: RequestInit) => {
          if (String(input).endsWith('/auth/issue-token')) return tokenOk();
          batches.push(
            (JSON.parse(String(init.body)) as { events: Record<string, unknown>[] }).events
          );
          if (batches.length === 1) {
            uploadStarted();
            return upload;
          }
          return response(202);
        })
      );

      first.queueEvent({ eventType: 'call_success', marker: 'first' });
      const flushing = first.flushQueue();
      await started;
      second.queueEvent({ eventType: 'call_success', marker: 'later' });
      await second.flushQueue();
      releaseUpload(response(202));
      await flushing;

      expect(batches).toHaveLength(1);
      expect(queuedEvents().map((event) => event.marker)).toEqual(['later']);
      await second.flushQueue();
      const delivered = batches.flat();
      expect(delivered.map((event) => event.marker)).toEqual(['first', 'later']);
      expect(new Set(delivered.map((event) => event.eventId)).size).toBe(delivered.length);
      expect(queuedEvents()).toEqual([]);
    }
  );

  it('leaves a busy sender and its queued events alone', async () => {
    const metrics = await loadMetrics();
    const { spy } = mockBackend();
    const lock = join(stateDir, FLUSH_LOCK_FILE);
    mkdirSync(lock);
    metrics.queueEvent({ eventType: 'call_success' });

    await metrics.flushQueue();

    expect(spy).not.toHaveBeenCalled();
    expect(queuedEvents()).toHaveLength(1);
    expect(existsSync(lock)).toBe(true);
  });

  it('recovers a stale lock left by a killed process', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();
    const lock = join(stateDir, FLUSH_LOCK_FILE);
    mkdirSync(lock);
    const old = new Date(Date.now() - 60_000);
    utimesSync(lock, old, old);
    metrics.queueEvent({ eventType: 'call_success' });

    await metrics.flushQueue();

    expect(ingestCalls).toHaveLength(1);
    expect(queuedEvents()).toEqual([]);
    expect(existsSync(lock)).toBe(false);
  });

  it.each([202, 400, 503, 'network error'])('releases its lock after %s', async (status) => {
    const metrics = await loadMetrics();
    mockBackend({
      ingest: () => {
        if (status === 'network error') throw new Error('connection reset');
        return response(status as number);
      },
    });
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(existsSync(join(stateDir, FLUSH_LOCK_FILE))).toBe(false);
    const { ingestCalls } = mockBackend();
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();
    expect(ingestCalls).toHaveLength(1);
    expect(queuedEvents()).toEqual([]);
  });

  it('keeps the same event ids on retry after the server accepted a batch but its response was lost', async () => {
    const metrics = await loadMetrics();
    const first = mockBackend({
      ingest: () => {
        throw new Error('response lost');
      },
    });
    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();
    const second = mockBackend();
    await metrics.flushQueue();

    // Delivery is at least once: the backend must store each eventId once.
    expect(bodyOf(second.ingestCalls[0]!)).toEqual(bodyOf(first.ingestCalls[0]!));
    expect(queuedEvents()).toEqual([]);
  });

  it.each([202, 400, 413])(
    'preserves events published during an upload acknowledged with %i',
    async (status) => {
      const first = await loadMetrics();
      const second = await loadMetrics();
      let resolveUpload!: (response: Response) => void;
      let uploadStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        uploadStarted = resolve;
      });
      const upload = new Promise<Response>((resolve) => {
        resolveUpload = resolve;
      });
      vi.stubGlobal(
        'fetch',
        vi.fn((input: unknown) => {
          if (String(input).endsWith('/auth/issue-token')) return tokenOk();
          uploadStarted();
          return upload;
        })
      );
      first.queueEvent({ eventType: 'call_success', marker: 'sent' });
      const flushing = first.flushQueue();
      await started;
      second.queueEvent({ eventType: 'call_success', marker: 'later' });
      resolveUpload(response(status));
      await flushing;

      expect(queuedEvents().map((event) => event.marker)).toEqual(['later']);
      const { ingestCalls } = mockBackend();
      await second.flushQueue();
      expect(
        (bodyOf(ingestCalls[0]!).events as Record<string, unknown>[]).map((event) => event.marker)
      ).toEqual(['later']);
      expect(queuedEvents()).toEqual([]);
    }
  );

  it('keeps both the snapshot and later events after a failed upload', async () => {
    const metrics = await loadMetrics();
    mockBackend({
      ingest: () => {
        metrics.queueEvent({ eventType: 'call_success', marker: 'later' });
        return response(503);
      },
    });
    metrics.queueEvent({ eventType: 'call_success', marker: 'retry' });
    await metrics.flushQueue();
    expect(queuedEvents().map((event) => event.marker)).toEqual(['retry', 'later']);
  });

  it('purges segment files too when a later command opts out', async () => {
    const metrics = await loadMetrics();
    metrics.queueEvent({ eventType: 'call_success' });
    expect(queueFiles()).toHaveLength(1);
    metrics.instrument('translate', true);
    expect(queueFiles()).toEqual([]);
  });

  it('drops an event past the backend age bound instead of losing the batch with it', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();
    const stale = new Date(Date.now() - 40 * 24 * 60 * 60 * 1_000).toISOString();
    writeFileSync(
      queuePath(),
      `${JSON.stringify({ eventType: 'call_success', channel: 'cli', accountId: ACCOUNT_ID, timestamp: stale })}\n`
    );

    metrics.queueEvent({ eventType: 'auth_success' });
    await metrics.flushQueue();

    const events = bodyOf(ingestCalls[0]!).events as Record<string, unknown>[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'auth_success' });
    expect(queuedEvents()).toEqual([]);
  });

  it.each([
    ['no timestamp at all', {}],
    ['a timestamp that is not a date', { timestamp: 'yesterday' }],
    ['a clock running far ahead', { timestamp: new Date(Date.now() + 7_200_000).toISOString() }],
  ])('drops a line the backend would reject: %s', async (_label, broken) => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();
    writeFileSync(
      queuePath(),
      `${JSON.stringify({ eventType: 'call_success', channel: 'cli', accountId: ACCOUNT_ID, ...broken })}\n`
    );

    metrics.queueEvent({ eventType: 'auth_success' });
    await metrics.flushQueue();

    const events = bodyOf(ingestCalls[0]!).events as Record<string, unknown>[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'auth_success' });
  });

  it('clears a queue that holds nothing but expired events', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();
    const stale = new Date(Date.now() - 40 * 24 * 60 * 60 * 1_000).toISOString();
    writeFileSync(
      queuePath(),
      `${JSON.stringify({ eventType: 'call_success', channel: 'cli', accountId: ACCOUNT_ID, timestamp: stale })}\n`
    );

    await metrics.flushQueue();

    expect(ingestCalls).toHaveLength(0);
    expect(queuedEvents()).toEqual([]);
  });

  it.each([400, 413])('clears the queue on %i: it will never be accepted', async (status) => {
    const metrics = await loadMetrics();
    mockBackend({ ingest: () => response(status) });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(queuedEvents()).toEqual([]);
  });

  it.each([403, 429, 500, 503])('keeps the queue on %i: recoverable', async (status) => {
    const metrics = await loadMetrics();
    mockBackend({ ingest: () => response(status) });

    metrics.queueEvent({ eventType: 'call_success' });
    await metrics.flushQueue();

    expect(queuedEvents()).toHaveLength(1);
  });

  it('keeps the queue and does not throw when the network is down', async () => {
    const metrics = await loadMetrics();
    mockBackend({
      ingest: () => {
        throw new Error('socket hang up');
      },
    });

    metrics.queueEvent({ eventType: 'call_success' });
    await expect(metrics.flushQueue()).resolves.toBeUndefined();

    expect(queuedEvents()).toHaveLength(1);
  });

  it('sends at most the last MAX_QUEUE events', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();

    const lines: string[] = [];
    for (let index = 0; index < 1_200; index++) {
      lines.push(
        JSON.stringify({ eventType: 'call_success', index, timestamp: new Date().toISOString() })
      );
    }
    writeFileSync(queuePath(), `${lines.join('\n')}\n`);

    await metrics.flushQueue();

    const events = bodyOf(ingestCalls[0]!).events as { index: number }[];
    expect(events).toHaveLength(1_000);
    expect(events[0]!.index).toBe(200);
    expect(events.at(-1)!.index).toBe(1_199);
  });

  it('drops a corrupted queue instead of retrying it forever', async () => {
    const metrics = await loadMetrics();
    const { spy } = mockBackend();

    writeFileSync(queuePath(), '{not json\n');
    await metrics.flushQueue();

    expect(spy).not.toHaveBeenCalled();
    expect(existsSync(queuePath())).toBe(false);
  });

  it('does nothing when there is no queue', async () => {
    const metrics = await loadMetrics();
    const { spy } = mockBackend();

    await metrics.flushQueue();

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('errorTypeFor', () => {
  it.each([
    [400, 'validation_error'],
    [401, 'auth_401'],
    [402, 'payment_402'],
    [403, 'auth_403'],
    [413, 'payload_too_large'],
    [429, 'rate_limit_429'],
    [500, 'server_5xx'],
    [503, 'server_5xx'],
  ])('maps %i to the shared vocabulary', async (status, expected) => {
    const metrics = await loadMetrics();
    expect(metrics.errorTypeFor(new LaraApiError(status, 'Error', 'boom'))).toBe(expected);
  });

  it.each(['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'])(
    'tells Lara being unreachable (%s) apart from Lara refusing',
    async (code) => {
      const metrics = await loadMetrics();
      const failure = Object.assign(new Error('fetch failed'), { code });

      expect(metrics.errorTypeFor(failure)).toBe('network_error');
      // The SDK wraps it, so the cause is where it usually shows up.
      expect(metrics.errorTypeFor(new Error('translation failed', { cause: failure }))).toBe(
        'network_error'
      );
    }
  );

  it('reads an unanswered auth call as Lara unreachable, not as Lara failing', async () => {
    const metrics = await loadMetrics();

    // What the SDK raises when /v2/auth never answered.
    expect(metrics.errorTypeFor(new LaraApiError(500, 'AuthenticationError', 'no answer'))).toBe(
      'network_error'
    );
    // A 500 Lara did answer with stays a server error.
    expect(metrics.errorTypeFor(new LaraApiError(500, 'Error', 'boom'))).toBe('server_5xx');
    // A refused key is still a refused key.
    expect(metrics.errorTypeFor(new LaraApiError(401, 'AuthenticationError', 'bad key'))).toBe(
      'auth_401'
    );
  });

  it('recognises the quota error, which has no dedicated status code', async () => {
    const metrics = await loadMetrics();
    expect(metrics.errorTypeFor(new Error('Your plan quota is exhausted'))).toBe('quota_exceeded');
  });

  it('recognises a malformed file, whatever parser raised it', async () => {
    const metrics = await loadMetrics();
    const yaml = new Error('bad indentation');
    yaml.name = 'YAMLParseError';

    // What a broken i18n JSON actually throws.
    let json: unknown;
    try {
      JSON.parse('{"a": 1,,}');
    } catch (error) {
      json = error;
    }

    expect(metrics.errorTypeFor(json)).toBe('parse_error');
    expect(metrics.errorTypeFor(yaml)).toBe('parse_error');
  });

  it('keeps the parse error a later, vaguer failure would have buried', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');

    metrics.recordError(new SyntaxError("Expected ',' or '}' after property value in JSON"));
    // What the command finally unwinds with once the other files are done.
    metrics.recordError(new Error('Some files could not be translated'));
    metrics.finishCommand(1);

    expect(queuedEvents()[0]).toMatchObject({
      eventType: 'call_error',
      errorType: 'parse_error',
    });
  });

  it('recognises timeouts by name and by message', async () => {
    const metrics = await loadMetrics();
    const aborted = new Error('aborted');
    aborted.name = 'AbortError';

    expect(metrics.errorTypeFor(aborted)).toBe('timeout');
    expect(metrics.errorTypeFor(new Error('connect ETIMEDOUT'))).toBe('timeout');
    expect(metrics.errorTypeFor(new Error('request timed out'))).toBe('timeout');
  });

  it('looks through an error raised only to unwind', async () => {
    const metrics = await loadMetrics();
    const fatal = new Error('Authentication failed', {
      cause: new LaraApiError(401, 'Error', 'bad key'),
    });

    expect(metrics.errorTypeFor(fatal)).toBe('auth_401');
  });

  it('keeps its own classification when the cause says nothing', async () => {
    const metrics = await loadMetrics();
    const wrapped = new Error('connect ETIMEDOUT', { cause: new Error('no idea') });

    expect(metrics.errorTypeFor(wrapped)).toBe('timeout');
  });

  it('falls back to unknown, never to free text', async () => {
    const metrics = await loadMetrics();
    expect(metrics.errorTypeFor(new Error('something odd'))).toBe('unknown');
    expect(metrics.errorTypeFor('a string')).toBe('unknown');
    expect(metrics.errorTypeFor(undefined)).toBe('unknown');
  });
});

describe('finishCommand', () => {
  it('emits call_success on the first run and on every run after it', async () => {
    const first = await loadMetrics();
    first.instrument('translate');
    first.setContext({ mode: 'text' });
    first.finishCommand(0);

    const second = await loadMetrics();
    second.instrument('translate');
    second.setContext({ mode: 'text' });
    second.finishCommand(0);

    // first_call is deprecated: activation is derived from the earliest success.
    expect(queuedEvents().map((event) => event.eventType)).toEqual([
      'call_success',
      'call_success',
    ]);
  });

  it('keeps the classified error when a vaguer one follows', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordError(new LaraApiError(429, 'Error', 'slow down'));
    // What the command finally unwinds with says nothing about why it failed.
    metrics.recordError(new Error('Some files could not be translated'));
    metrics.finishCommand(1);

    expect(queuedEvents()[0]!.errorType).toBe('rate_limit_429');
  });

  it('emits call_error with errorType and latencyMs on a non-zero exit', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.setContext({ mode: 'config' });
    metrics.recordError(new LaraApiError(429, 'Error', 'slow down'));
    metrics.finishCommand(1);

    expect(queuedEvents()[0]).toMatchObject({
      eventType: 'call_error',
      errorType: 'rate_limit_429',
    });
    expect(typeof queuedEvents()[0]!.latencyMs).toBe('number');
  });

  it('always carries a feature, and maps every mode onto the shared vocabulary', async () => {
    for (const [mode, feature] of [
      ['text', 'text'],
      ['file', 'document'],
      ['config', 'document'],
    ] as const) {
      clearQueue();
      const metrics = await loadMetrics();
      metrics.instrument('translate');
      metrics.setContext({ mode });
      metrics.finishCommand(0);

      expect(queuedEvents()[0]!.metadata).toMatchObject({ feature, surface: mode });
    }
  });

  it('reports the language pair only when a single one is known', async () => {
    const direct = await loadMetrics();
    direct.instrument('translate');
    direct.setContext({ mode: 'text', sourceLang: 'EN', targetLang: 'pt-BR' });
    direct.finishCommand(0);

    // Lowercased BCP 47, as the shared standard requires.
    expect(queuedEvents()[0]!.metadata).toMatchObject({
      sourceLang: 'en',
      targetLang: 'pt-br',
    });

    clearQueue();
    const fanout = await loadMetrics();
    fanout.instrument('translate');
    fanout.setContext({ mode: 'config', elements: 12, locales: 3 });
    fanout.finishCommand(0);

    const metadata = queuedEvents()[0]!.metadata as Record<string, unknown>;
    expect(metadata).toMatchObject({ feature: 'document', elements: 12, locales: 3 });
    expect(metadata).not.toHaveProperty('sourceLang');
    expect(metadata).not.toHaveProperty('targetLang');
    // `mode` is reported as `surface`; it must not also leak as a bare key.
    expect(metadata).not.toHaveProperty('mode');
  });

  it('reports the file types as one sorted, de-duplicated value', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.setContext({ mode: 'config', fileTypes: ['po', 'json', 'po'] });
    metrics.finishCommand(0);

    expect(queuedEvents()[0]!.metadata).toMatchObject({ fileTypes: 'json,po' });
  });

  it('leaves fileTypes out entirely when nothing was read from a file', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.setContext({ mode: 'text' });
    metrics.finishCommand(0);

    expect(queuedEvents()[0]!.metadata).not.toHaveProperty('fileTypes');
  });

  it('reports the characters recorded during the run', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordTranslated(120);
    metrics.recordTranslated(80);
    metrics.finishCommand(0);

    expect(queuedEvents()[0]!.charsTranslated).toBe(200);
  });

  it('clamps counters the backend would reject', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordTranslated(MAX_UINT32 + 5_000);
    metrics.finishCommand(0);

    expect(queuedEvents()[0]!.charsTranslated).toBe(MAX_UINT32);
  });

  it('emits exactly one terminal event even if the exit hook fires twice', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.finishCommand(0);
    metrics.finishCommand(1);

    expect(queuedEvents()).toHaveLength(1);
  });
});

describe('instrumentCommand', () => {
  /** Runs the exit hook the module registered, the way node would. */
  function fireExitHook(code: number): void {
    const listeners = process.listeners('exit');
    const hook = listeners.at(-1)!;
    process.removeListener('exit', hook);
    (hook as (code: number) => void)(code);
  }

  it('opens the window without touching the network', async () => {
    const metrics = await loadMetrics();
    const { spy } = mockBackend();
    writeFileSync(queuePath(), `${JSON.stringify({ eventType: 'call_success' })}\n`);

    metrics.instrument('translate');

    // A flush here would put a token exchange in front of the user's command,
    // before it has even validated its arguments.
    expect(spy).not.toHaveBeenCalled();
  });

  it('ships what an earlier run left behind along with its own events', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();
    writeFileSync(
      queuePath(),
      `${JSON.stringify({ eventType: 'call_error', stale: true, timestamp: new Date().toISOString() })}\n`
    );

    metrics.instrument('translate');
    metrics.setContext({ mode: 'text' });
    await metrics.finishAndFlush(0);

    const sent = bodyOf(ingestCalls[0]!).events as Record<string, unknown>[];
    expect(sent.map((event) => event.eventType)).toEqual(['call_error', 'call_success']);
    expect(queuedEvents()).toEqual([]);
  });

  it('registers an exit hook that queues exactly one terminal event', async () => {
    const metrics = await loadMetrics();
    mockBackend();

    metrics.instrument('translate');
    metrics.setContext({ mode: 'text' });
    fireExitHook(0);

    expect(queuedEvents().map((event) => event.eventType)).toEqual(['call_success']);
  });

  it('reports the exit code of a failed run', async () => {
    const metrics = await loadMetrics();
    mockBackend();

    metrics.instrument('translate');
    metrics.recordError(new LaraApiError(500, 'Error', 'down'));
    fireExitHook(1);

    expect(queuedEvents()[0]).toMatchObject({
      eventType: 'call_error',
      errorType: 'server_5xx',
      metadata: { exitCode: 1 },
    });
  });

  it('closes a command that never translates with its own call event', async () => {
    const metrics = await loadMetrics();
    mockBackend();

    metrics.instrument('memory list');
    metrics.recordApiAnswer();
    metrics.finishCommand(0);

    const events = queuedEvents();
    expect(events.map((event) => event.eventType)).toEqual(['auth_success', 'call_success']);
    // A `lara memory list` must not read as a translation in the funnel.
    expect(events[1]!.metadata).toMatchObject({
      command: 'memory list',
      feature: 'resource_management',
    });
    expect(events[1]!.charsTranslated).toBe(0);
  });
});

describe('finishAndFlush', () => {
  it('closes the run and delivers it in the same breath', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();

    metrics.instrument('translate');
    metrics.setContext({ mode: 'text' });
    await metrics.finishAndFlush(0);

    const sent = bodyOf(ingestCalls[0]!).events as Record<string, unknown>[];
    expect(sent.map((event) => event.eventType)).toEqual(['call_success']);
    expect(queuedEvents()).toEqual([]);
  });

  it('never throws, whatever the backend does', async () => {
    const metrics = await loadMetrics();
    mockBackend({
      token: () => {
        throw new Error('DNS is on fire');
      },
    });

    metrics.instrument('translate');
    await expect(metrics.finishAndFlush(1)).resolves.toBeUndefined();
    expect(queuedEvents()).toHaveLength(1);
  });
});

describe('recordApiAnswer', () => {
  it('sends auth_success at most once per run', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordApiAnswer();
    metrics.recordApiAnswer();

    expect(queuedEvents()).toHaveLength(1);
    expect(queuedEvents()[0]!.eventType).toBe('auth_success');
  });

  it('reports activation only once across init, translations and repeated init', async () => {
    const { ingestCalls } = mockBackend();
    for (const command of ['init', 'translate', 'init', 'memory list'] as const) {
      const metrics = await loadMetrics();
      metrics.instrument(command);
      metrics.recordApiAnswer();
      await metrics.finishAndFlush(0);
    }
    const batches = ingestCalls.map((call) => bodyOf(call).events as Record<string, unknown>[]);
    expect(batches.map((batch) => batch.map((event) => event.eventType))).toEqual([
      ['auth_success', 'call_success'],
      ['call_success'],
      ['call_success'],
      ['call_success'],
    ]);
    expect(new Set(batches.flat().map((event) => event.sessionId)).size).toBe(1);
  });

  it('keeps just the original pending activation across runs while ingestion is unavailable', async () => {
    mockBackend({ ingest: () => response(503) });
    const first = await loadMetrics();
    first.instrument('init');
    first.recordApiAnswer();
    const original = queuedEvents()[0];
    await first.finishAndFlush(0);
    const second = await loadMetrics();
    second.instrument('translate');
    second.recordApiAnswer();
    await second.finishAndFlush(0);

    const auth = queuedEvents().filter((event) => event.eventType === 'auth_success');
    expect(auth).toEqual([original]);
    expect(
      readdirSync(stateDir).filter((name) => name.startsWith(AUTH_SUCCESS_FILE_PREFIX))
    ).toEqual([]);
    const { ingestCalls } = mockBackend();
    await second.flushQueue();
    expect(
      (bodyOf(ingestCalls[0]!).events as Record<string, unknown>[]).filter(
        (event) => event.eventType === 'auth_success'
      )
    ).toEqual([original]);
    expect(
      readdirSync(stateDir).filter((name) => name.startsWith(AUTH_SUCCESS_FILE_PREFIX))
    ).toHaveLength(1);
  });

  it('scopes activation to the account rather than the API key', async () => {
    mockBackend();
    const first = await loadMetrics();
    first.recordApiAnswer();
    await first.flushQueue();
    process.env.LARA_ACCESS_KEY_ID = 'another-key-for-the-same-account';
    const rotated = await loadMetrics();
    rotated.recordApiAnswer();
    expect(queuedEvents()).toEqual([]);
    const other = await loadMetrics('acc_different');
    other.recordApiAnswer();
    expect(queuedEvents()).toHaveLength(1);
    expect(queuedEvents()[0]!.accountId).toBe('acc_different');
  });

  it('reuses the account/channel event id on a different installation', async () => {
    const first = await loadMetrics();
    first.recordApiAnswer();
    const original = queuedEvents()[0]!;
    process.env.LARA_STATE_DIR = join(stateDir, 'other-installation');
    const second = await loadMetrics();
    second.recordApiAnswer();
    const file = readdirSync(process.env.LARA_STATE_DIR).find((name) => name.endsWith('.jsonl'))!;
    const event = JSON.parse(readFileSync(join(process.env.LARA_STATE_DIR, file), 'utf8'));
    expect(event.eventId).toBe(original.eventId);
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(event.sessionId).not.toBe(original.sessionId);
  });

  it.each([400, 413])('does not mark a rejected activation as delivered on %i', async (status) => {
    const first = await loadMetrics();
    mockBackend({ ingest: () => response(status) });
    first.recordApiAnswer();
    const originalId = queuedEvents()[0]!.eventId;
    await first.flushQueue();
    expect(queuedEvents()).toEqual([]);
    const second = await loadMetrics();
    second.recordApiAnswer();
    expect(queuedEvents()).toHaveLength(1);
    expect(queuedEvents()[0]!.eventId).toBe(originalId);
  });

  it('collapses legacy per-command auth events into one activation at flush', async () => {
    const metrics = await loadMetrics();
    const { ingestCalls } = mockBackend();
    const timestamp = new Date().toISOString();
    writeFileSync(
      queuePath(),
      [
        { eventType: 'auth_success', eventId: 'old-1', accountId: ACCOUNT_ID, timestamp },
        { eventType: 'call_success', eventId: 'call-1', accountId: ACCOUNT_ID, timestamp },
        { eventType: 'auth_success', eventId: 'old-2', accountId: ACCOUNT_ID, timestamp },
        { eventType: 'call_success', eventId: 'call-2', accountId: ACCOUNT_ID, timestamp },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n')
    );
    await metrics.flushQueue();
    const events = bodyOf(ingestCalls[0]!).events as Record<string, unknown>[];
    expect(events.map((event) => event.eventType)).toEqual([
      'auth_success',
      'call_success',
      'call_success',
    ]);
    expect(events[0]!.eventId).not.toBe('old-1');
    expect(events[0]!.eventId).not.toBe('old-2');
    const second = await loadMetrics();
    second.recordApiAnswer();
    expect(queuedEvents()).toEqual([]);
  });

  it('does not let an opt-out consume the first authentication milestone', async () => {
    const quiet = await loadMetrics();
    quiet.instrument('init', true);
    quiet.recordApiAnswer();
    expect(readdirSync(stateDir)).toEqual([]);
    const tracked = await loadMetrics();
    tracked.recordApiAnswer();
    expect(queuedEvents().map((event) => event.eventType)).toEqual(['auth_success']);
  });

  it('keeps reporting authentication failures after activation without reactivating the account', async () => {
    const first = await loadMetrics();
    mockBackend();
    first.recordApiAnswer();
    await first.flushQueue();
    const failed = await loadMetrics();
    failed.recordApiAnswer(new LaraApiError(401, 'AuthenticationError', 'revoked'));
    expect(queuedEvents().map((event) => event.eventType)).toEqual(['auth_fail']);
    clearQueue();
    const recovered = await loadMetrics();
    recovered.recordApiAnswer();
    expect(queuedEvents()).toEqual([]);
  });

  it('sends auth_fail with a mapped errorType', async () => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordApiAnswer(new LaraApiError(401, 'Error', 'bad key'));

    expect(queuedEvents()[0]).toMatchObject({
      eventType: 'auth_fail',
      errorType: 'auth_401',
    });
  });

  it.each([
    [400, 'auth_success'],
    [402, 'auth_success'],
    [429, 'auth_success'],
  ])('reads a %i as the key having been accepted', async (status, expected) => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordApiAnswer(new LaraApiError(status, 'Error', 'boom'));

    expect(queuedEvents()[0]!.eventType).toBe(expected);
  });

  it.each([
    ['a 5xx', new LaraApiError(503, 'Error', 'down')],
    ['a network failure', new Error('socket hang up')],
  ])('says nothing about the key on %s', async (_label, error) => {
    const metrics = await loadMetrics();
    metrics.instrument('translate');
    metrics.recordApiAnswer(error);

    expect(queuedEvents()).toEqual([]);
  });
});

describe('metadata every event carries', () => {
  it('reports the platform, the runtime and whether a pipeline ran it', async () => {
    process.env.GITHUB_ACTIONS = 'true';
    const metrics = await loadMetrics();

    metrics.instrument('translate');
    metrics.recordApiAnswer();
    metrics.finishCommand(0);

    for (const event of queuedEvents()) {
      expect(event.metadata).toMatchObject({
        os: process.platform,
        nodeVersion: process.versions.node,
        ci: true,
      });
    }
  });

  it('reads CI=0 as a person, the same way the opt-out switches are read', async () => {
    process.env.CI = '0';
    const metrics = await loadMetrics();

    metrics.instrument('translate');
    metrics.finishCommand(0);

    expect(queuedEvents()[0]!.metadata).toMatchObject({ ci: false });
  });

  it('names the command on every event, auth included', async () => {
    const metrics = await loadMetrics();

    metrics.instrument('glossary import-csv');
    metrics.recordApiAnswer();
    metrics.finishCommand(0);

    expect(
      queuedEvents().map((event) => (event.metadata as Record<string, unknown>).command)
    ).toEqual(['glossary import-csv', 'glossary import-csv']);
  });

  it('adds what Lara answered to a failure, as a status and a short token', async () => {
    const metrics = await loadMetrics();

    metrics.instrument('translate');
    metrics.recordApiAnswer(new LaraApiError(401, 'AuthenticationError', 'bad key'));
    metrics.recordError(new LaraApiError(402, 'PaymentRequired', 'out of credit'));
    metrics.finishCommand(1);

    const [authFail, callError] = queuedEvents();
    expect(authFail!.metadata).toMatchObject({
      httpStatus: 401,
      laraErrorType: 'AuthenticationError',
    });
    expect(callError!.metadata).toMatchObject({
      httpStatus: 402,
      laraErrorType: 'PaymentRequired',
    });
  });

  it('refuses a Lara error type that is really a message', async () => {
    const metrics = await loadMetrics();

    metrics.instrument('translate');
    metrics.recordError(new LaraApiError(400, 'the file /home/me/secrets.json is invalid', 'bad'));
    metrics.finishCommand(1);

    const metadata = queuedEvents()[0]!.metadata as Record<string, unknown>;
    expect(metadata.httpStatus).toBe(400);
    expect(metadata).not.toHaveProperty('laraErrorType');
  });
});
