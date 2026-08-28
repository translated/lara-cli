#!/usr/bin/env node
/**
 * End-to-end check of the metrics pipeline against the real built CLI, with two
 * throwaway servers on localhost standing in for Lara and for the metrics
 * backend. Run it before opening a PR that touches src/modules/metrics:
 *
 *   pnpm run verify:metrics
 *
 * Faking Lara as well as the metrics backend is what makes this worth running:
 * the account id is read off the JWT the SDK gets from POST /v2/auth, so a
 * harness that skipped the API would never exercise the one piece of identity
 * the whole standard hangs on. Everything else follows from a real run of the
 * command — the two-step token exchange, the flush on the way out, and the
 * degradation paths where the backend is not there at all.
 */
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

const REPO = process.argv[2] ?? process.cwd();
const CLI = join(REPO, 'build', 'index.js');
// From the built module, not retyped: `queueContent()` returns '' for a missing
// file, so a drifted filename would make every queue assertion below pass by
// looking at nothing.
const { QUEUE_FILE, INSTALLATION_FILE } = await import(
  pathToFileURL(join(REPO, 'build', 'modules', 'metrics', 'metrics.const.js')).href
);

const ACCESS_KEY_ID = 'e2e-access-key-id';
const ACCESS_KEY_SECRET = 'e2e-access-key-secret';
const ACCOUNT_ID = 'acc_e2eXbW2mNvRt7yZjD3sLh';
const CHANNEL_KEY = 'e2e-metrics-key';
const INGEST_TOKEN = 'e2e-ingest-token';

/** A Lara JWT: only the payload matters, and only its `id` claim. */
function laraJwt(accountId) {
  const payload = Buffer.from(JSON.stringify({ id: accountId })).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.e2e-signature`;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

// --- fake Lara API -----------------------------------------------------------
const laraCalls = [];
/** Flipped by the auth_fail scenario to make Lara reject the credentials. */
let laraRejects = false;
const lara = createServer(async (req, res) => {
  const body = await readBody(req);
  laraCalls.push({ url: req.url, method: req.method });

  if (laraRejects) {
    return json(res, 401, { error: { type: 'AuthenticationError', message: 'invalid key' } });
  }
  if (req.url === '/v2/auth') {
    return json(res, 200, { token: laraJwt(ACCOUNT_ID) });
  }
  if (req.url === '/v2/languages') {
    return json(res, 200, ['en', 'it']);
  }
  if (req.url === '/v2/memories') {
    return json(res, 200, []);
  }
  if (req.url === '/translate') {
    const parsed = JSON.parse(body);
    const blocks = (parsed.q ?? []).map((block) => ({
      text: block.translatable === false ? block.text : `[it] ${block.text}`,
      translatable: block.translatable,
    }));
    // The SDK reads this endpoint as a stream of NDJSON envelopes.
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    return res.end(
      `${JSON.stringify({
        status: 200,
        data: { content_type: 'text/plain', source_language: 'en', translation: blocks },
      })}\n`
    );
  }
  return json(res, 404, { error: `unexpected ${req.url}` });
});
const LARA_URL = await listen(lara);

// --- fake metrics backend ----------------------------------------------------
const received = [];
const tokenRequests = [];
/** Lets a single scenario make the next ingest answer something other than 202. */
let ingestResponder = null;

const metrics = createServer(async (req, res) => {
  const body = await readBody(req);

  if (req.url === '/auth/issue-token') {
    tokenRequests.push({ auth: req.headers.authorization, body: JSON.parse(body) });
    return json(res, 200, { status: 'success', token: INGEST_TOKEN, expiresIn: 3600 });
  }

  received.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body) });
  if (ingestResponder) {
    const status = ingestResponder(received.length);
    if (status !== 202) {
      return json(res, status, { code: 'token_expired', message: 'expired' });
    }
  }
  return json(res, 202, { status: 'success', accepted: JSON.parse(body).events.length });
});
const METRICS_URL = await listen(metrics);

// --- harness -----------------------------------------------------------------
const project = mkdtempSync(join(tmpdir(), 'lara-e2e-'));
const state = mkdtempSync(join(tmpdir(), 'lara-e2e-state-'));
writeFileSync(join(project, 'src.json'), JSON.stringify({ greeting: 'hello' }) + '\n');

// Must be async: execFileSync would block this process's event loop, so the
// listeners above could never accept the CLI's requests.
async function run(args, extraEnv = {}, cwd = project) {
  const env = {
    ...process.env,
    LARA_ACCESS_KEY_ID: ACCESS_KEY_ID,
    LARA_ACCESS_KEY_SECRET: ACCESS_KEY_SECRET,
    LARA_SERVER_URL: LARA_URL,
    LARA_STATE_DIR: state,
    METRICS_URL,
    METRICS_API_KEY: CHANNEL_KEY,
    ...extraEnv,
  };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete env[key];
    }
  }
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], {
      cwd,
      env,
      encoding: 'utf8',
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

const OK = ['translate', '--file', 'src.json', '-s', 'en', '-t', 'it', '-o', 'out.json'];
const FAILING = ['translate', '--file', 'missing.json', '-s', 'en', '-t', 'it'];

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const queueFile = join(state, QUEUE_FILE);
const queueContent = () => (existsSync(queueFile) ? readFileSync(queueFile, 'utf8').trim() : '');

// --- run 1: a real translation, delivered by the same run --------------------
const r1 = await run(OK);
check('run 1 exits 0', r1.code === 0, `code=${r1.code} ${r1.stderr.slice(0, 160)}`);
check(
  'run 1 translated through the fake Lara API',
  laraCalls.some((c) => c.url === '/translate')
);
check('run 1 delivered its own events (flush on the way out)', received.length === 1);
check('run 1 bought exactly one token', tokenRequests.length === 1, String(tokenRequests.length));
check('run 1 left an empty queue behind', queueContent() === '');

// --- run 2: fails before any API call, still attributable --------------------
const r2 = await run(FAILING);
check('run 2 (bad input) exits 1', r2.code === 1, `code=${r2.code}`);

// --- run 3: another good run -------------------------------------------------
const r3 = await run(OK);
check('run 3 exits 0', r3.code === 0, `code=${r3.code}`);

const events = received.flatMap((r) => r.body.events);
console.log('\nevents received:');
for (const event of events) {
  console.log(' ', JSON.stringify(event));
}

// --- the contract ------------------------------------------------------------
check(
  'all posts hit /metrics/ingest-events',
  received.every((r) => r.url === '/metrics/ingest-events')
);
check(
  'every ingest carries the issued token',
  received.every((r) => r.auth === `Bearer ${INGEST_TOKEN}`)
);
check(
  'every token request carries the channel key',
  tokenRequests.every((r) => r.auth === `Bearer ${CHANNEL_KEY}`)
);
check(
  'the channel key never reaches the ingestion endpoint',
  !JSON.stringify(received).includes(CHANNEL_KEY)
);
check(
  'one token bought per run',
  tokenRequests.length === received.length,
  `${tokenRequests.length} vs ${received.length}`
);
const installIds = new Set(tokenRequests.map((r) => r.body.installationId));
check(
  'one persisted installationId, a UUID, shared by every run',
  installIds.size === 1 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test([...installIds][0] ?? ''),
  [...installIds].join(',')
);
check(
  'the ingestion token is never written to disk',
  !readFileSync(join(state, INSTALLATION_FILE), 'utf8').includes(INGEST_TOKEN)
);

check('no deprecated first_call event', !events.some((e) => e.eventType === 'first_call'));
check(
  'funnel: auth_success, call_success, call_error, auth_success, call_success',
  JSON.stringify(events.map((e) => e.eventType)) ===
    JSON.stringify(['auth_success', 'call_success', 'call_error', 'auth_success', 'call_success']),
  events.map((e) => e.eventType).join(',')
);
check(
  'every event declares channel cli',
  events.every((e) => e.channel === 'cli')
);
check(
  'every event carries channelVersion',
  events.every((e) => typeof e.channelVersion === 'string')
);
check(
  'every event carries a unique eventId',
  new Set(events.map((e) => e.eventId)).size === events.length &&
    events.every((e) => /^[0-9a-f-]{36}$/.test(e.eventId ?? ''))
);
const accountIds = new Set(events.map((e) => e.accountId));
check('accountId identical across every event', accountIds.size === 1, [...accountIds].join(','));
check(
  'accountId is the raw Lara account id, not a hash',
  [...accountIds][0] === ACCOUNT_ID,
  [...accountIds][0]
);
check(
  'run 2 was attributable even though it never reached Lara',
  events.find((e) => e.eventType === 'call_error')?.accountId === ACCOUNT_ID
);
check(
  'no credential or secret anywhere in the payload',
  !JSON.stringify(received).includes('e2e-access-key')
);
const sessions = new Set(events.map((e) => e.sessionId));
check('each run has its own sessionId', sessions.size === 3, `${sessions.size} sessions`);

const success = events.find((e) => e.eventType === 'call_success');
check(
  'call_success carries feature, surface and the language pair',
  success?.metadata?.feature === 'document' &&
    success?.metadata?.surface === 'file' &&
    success?.metadata?.sourceLang === 'en' &&
    success?.metadata?.targetLang === 'it',
  JSON.stringify(success?.metadata)
);
check(
  'call_success counts characters',
  typeof success?.charsTranslated === 'number' && success.charsTranslated > 0,
  String(success?.charsTranslated)
);
const failure = events.find((e) => e.eventType === 'call_error');
check(
  'call_error carries errorType and latencyMs',
  typeof failure?.errorType === 'string' && typeof failure?.latencyMs === 'number',
  JSON.stringify(failure)
);
check(
  'every terminal event carries a feature',
  events.filter((e) => e.eventType.startsWith('call_')).every((e) => Boolean(e.metadata?.feature))
);
check(
  'metadata leaks no file path',
  !JSON.stringify(events.map((e) => e.metadata)).includes('.json')
);

// --- commands that authenticate but never translate --------------------------
{
  const before = received.flatMap((r) => r.body.events).length;
  const memory = await run(['memory', 'list']);
  check(
    'memory list exits 0',
    memory.code === 0,
    `code=${memory.code} ${memory.stderr.slice(0, 160)}`
  );

  const fresh = received.flatMap((r) => r.body.events).slice(before);
  check(
    'memory list reports auth and nothing else',
    JSON.stringify(fresh.map((e) => e.eventType)) === JSON.stringify(['auth_success']),
    fresh.map((e) => e.eventType).join(',')
  );
}

{
  const before = received.flatMap((r) => r.body.events).length;
  const init = await run([
    '-y',
    'init',
    '--force',
    '--source',
    'en',
    '--target',
    'it',
    '--paths',
    'locales/[locale].json',
  ]);
  check('init exits 0', init.code === 0, `code=${init.code} ${init.stderr.slice(0, 200)}`);

  const fresh = received.flatMap((r) => r.body.events).slice(before);
  check(
    'init verifies the key and reports auth_success, with no call event',
    JSON.stringify(fresh.map((e) => e.eventType)) === JSON.stringify(['auth_success']),
    fresh.map((e) => e.eventType).join(',')
  );
  check('init still wrote its config', existsSync(join(project, 'lara.yaml')));
}

// --- a key Lara refuses ------------------------------------------------------
{
  const before = received.flatMap((r) => r.body.events).length;
  laraRejects = true;
  const rejected = await run(OK);
  laraRejects = false;

  check('rejected key: the command fails', rejected.code !== 0, `code=${rejected.code}`);
  const fresh = received.flatMap((r) => r.body.events).slice(before);
  check(
    'rejected key: auth_fail and call_error both classified as auth_401',
    fresh.some((e) => e.eventType === 'auth_fail' && e.errorType === 'auth_401') &&
      fresh.some((e) => e.eventType === 'call_error' && e.errorType === 'auth_401'),
    fresh.map((e) => `${e.eventType}/${e.errorType ?? ''}`).join(',')
  );
  check(
    'rejected key: still attributed to the account seen earlier',
    fresh.every((e) => e.accountId === ACCOUNT_ID)
  );
}

// --- init keeps working when Lara cannot be reached at all -------------------
{
  const offlineProject = mkdtempSync(join(tmpdir(), 'lara-e2e-offline-'));
  const offline = await run(
    ['-y', 'init', '--force', '--source', 'en', '--target', 'it', '--paths', 'l/[locale].json'],
    { LARA_SERVER_URL: 'http://127.0.0.1:1' },
    offlineProject
  );

  check(
    'offline init: does not fail the command',
    offline.code === 0,
    String(offline.stderr).slice(0, 200)
  );
  check('offline init: still wrote its config', existsSync(join(offlineProject, 'lara.yaml')));
  check(
    'offline init: warns instead of dying silently',
    offline.stderr.includes('Could not verify your API credentials'),
    offline.stderr.slice(0, 200)
  );
  rmSync(offlineProject, { recursive: true, force: true });
}

// --- an expired token: one refresh, one retry --------------------------------
{
  const tokensBefore = tokenRequests.length;
  const ingestsBefore = received.length;
  ingestResponder = (n) => (n === ingestsBefore + 1 ? 401 : 202);
  const expired = await run(OK);
  ingestResponder = null;

  check('expired token: CLI still exits 0', expired.code === 0, `code=${expired.code}`);
  check(
    'expired token: one new token bought, one retry',
    tokenRequests.length === tokensBefore + 2 && received.length === ingestsBefore + 2,
    `tokens=${tokenRequests.length - tokensBefore} ingests=${received.length - ingestsBefore}`
  );
  check('expired token: the queue still drained', queueContent() === '');
}

// --- degradation: metrics backend unreachable --------------------------------
const before = received.length;
const dead = await run(OK, { METRICS_URL: 'http://127.0.0.1:1' });
check('unreachable backend: CLI still exits 0', dead.code === 0, `code=${dead.code}`);
// Ora draws its spinner on stderr, so "silent" means "byte-for-byte what a
// healthy run prints" — no extra warning, no stack trace.
check(
  'unreachable backend: output identical to a healthy run',
  dead.stderr === r3.stderr && dead.stdout === r3.stdout,
  dead.stderr.slice(0, 160)
);
check('unreachable backend: output file still written', existsSync(join(project, 'out.json')));
check('unreachable backend: queue survives for the next run', queueContent().length > 0);
check('unreachable backend: nothing reached the listener', received.length === before);

// --- degradation: Lara itself unreachable ------------------------------------
{
  const laraDead = await run(OK, { LARA_SERVER_URL: 'http://127.0.0.1:1' });
  check('unreachable Lara: CLI exits non-zero', laraDead.code !== 0, `code=${laraDead.code}`);
}

// --- opt-out -----------------------------------------------------------------
const optOutRoot = mkdtempSync(join(tmpdir(), 'lara-e2e-optout-'));
const optOutDir = join(optOutRoot, 'should-not-exist');
const off = await run(OK, { LARA_TELEMETRY_DISABLED: '1', LARA_STATE_DIR: optOutDir });
check('opt-out: CLI still exits 0', off.code === 0, `code=${off.code}`);
check('opt-out: no state directory created', !existsSync(optOutDir));

// --- unconfigured (what a build with un-baked placeholders does) --------------
const bareRoot = mkdtempSync(join(tmpdir(), 'lara-e2e-bare-'));
const bareDir = join(bareRoot, 'should-not-exist');
const bare = await run(OK, {
  METRICS_URL: undefined,
  METRICS_API_KEY: undefined,
  LARA_STATE_DIR: bareDir,
});
check('no metrics key: CLI still exits 0', bare.code === 0, `code=${bare.code}`);
check('no metrics key: no state directory created', !existsSync(bareDir));

lara.close();
metrics.close();
for (const dir of [project, state, optOutRoot, bareRoot]) {
  rmSync(dir, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
