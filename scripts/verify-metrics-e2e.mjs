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
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
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
/** Status the translate endpoint answers with, past the auth check. 0 = translate. */
let laraTranslateStatus = 0;
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
    if (laraTranslateStatus) {
      return json(res, laraTranslateStatus, {
        error: { type: 'PaymentRequired', message: 'payment required' },
      });
    }
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
    const status = await ingestResponder(received.length);
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

const queueContent = () =>
  readdirSync(state)
    .filter(
      (name) =>
        name === QUEUE_FILE || (name.startsWith(`${QUEUE_FILE}.`) && name.endsWith('.jsonl'))
    )
    .sort()
    .map((name) => readFileSync(join(state, name), 'utf8').trim())
    .filter(Boolean)
    .join('\n');

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

check(
  'run 1 announced telemetry on stderr, naming no-trace and DO_NOT_TRACK',
  r1.stderr.includes('--no-trace') && r1.stderr.includes('DO_NOT_TRACK=1'),
  r1.stderr.slice(0, 200)
);

// --- run 2: fails before any API call, still attributable --------------------
const r2 = await run(FAILING);
check('run 2 (bad input) exits 1', r2.code === 1, `code=${r2.code}`);

// --- run 3: another good run -------------------------------------------------
const r3 = await run(OK);
check('run 3 exits 0', r3.code === 0, `code=${r3.code}`);

check(
  'run 3 said nothing: the notice is once per machine, not once per command',
  !r3.stderr.includes('DO_NOT_TRACK=1'),
  r3.stderr.slice(0, 120)
);

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
  'call_success carries feature, surface, the language pair and the file type',
  success?.metadata?.feature === 'document' &&
    success?.metadata?.surface === 'file' &&
    success?.metadata?.sourceLang === 'en' &&
    success?.metadata?.targetLang === 'it' &&
    success?.metadata?.fileTypes === 'json',
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
check(
  'every event names the command it belongs to',
  events.every((e) => e.metadata?.command === 'translate'),
  JSON.stringify(events.map((e) => e.metadata?.command))
);
check(
  'every event carries the platform, the runtime and the CI flag',
  events.every(
    (e) =>
      typeof e.metadata?.os === 'string' &&
      typeof e.metadata?.nodeVersion === 'string' &&
      typeof e.metadata?.ci === 'boolean'
  ),
  JSON.stringify(events[0]?.metadata)
);
check(
  'call_success reports how many memories and glossaries were in play',
  success?.metadata?.memories === 0 && success?.metadata?.glossaries === 0,
  JSON.stringify(success?.metadata)
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
    'memory list reports auth and its own call event',
    JSON.stringify(fresh.map((e) => e.eventType)) ===
      JSON.stringify(['auth_success', 'call_success']),
    fresh.map((e) => e.eventType).join(',')
  );
  check(
    'memory list is named as itself, as resource management, with nothing translated',
    fresh.every((e) => e.metadata?.command === 'memory list') &&
      fresh.at(-1)?.metadata?.feature === 'resource_management' &&
      fresh.at(-1)?.charsTranslated === 0,
    JSON.stringify(fresh.at(-1))
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
    'init verifies the key and closes with its own call event',
    JSON.stringify(fresh.map((e) => e.eventType)) ===
      JSON.stringify(['auth_success', 'call_success']),
    fresh.map((e) => e.eventType).join(',')
  );
  check(
    'init reports itself as setup',
    fresh.every((e) => e.metadata?.command === 'init') &&
      fresh.at(-1)?.metadata?.feature === 'setup',
    JSON.stringify(fresh.at(-1)?.metadata)
  );
  check('init still wrote its config', existsSync(join(project, 'lara.yaml')));
}

// --- handled resource errors must close the command as a failure -------------
for (const resource of ['memory', 'glossary']) {
  const before = received.flatMap((r) => r.body.events).length;
  const failed = await run([resource, 'update', 'missing', 'Renamed']);
  const fresh = received.flatMap((r) => r.body.events).slice(before);
  check(`${resource} update 404 exits 1`, failed.code === 1, failed.stderr);
  check(
    `${resource} update 404 emits call_error with the API status`,
    fresh.some((e) => e.eventType === 'call_error' && e.metadata?.httpStatus === 404) &&
      !fresh.some((e) => e.eventType === 'call_success'),
    JSON.stringify(fresh)
  );
  check(
    `${resource} update 404 prints its failure once`,
    failed.stderr.split('Translation failed').length === 2,
    failed.stderr
  );
}

// --- init must finish promptly even when Lara accepts but never answers -------
for (const hangPath of ['/v2/auth', '/v2/languages']) {
  const hung = createServer((req, res) => {
    if (req.url === hangPath) return;
    return json(res, 200, { token: laraJwt(ACCOUNT_ID) });
  });
  const hungUrl = await listen(hung);
  try {
    const started = Date.now();
    const init = await run(['-y', 'init', '--force', '-s', 'en', '-t', 'it'], {
      LARA_SERVER_URL: hungUrl,
      DO_NOT_TRACK: '1',
    });
    const elapsed = Date.now() - started;
    check(
      `init with stalled ${hangPath} exits successfully within 4s`,
      init.code === 0 && elapsed < 4_000,
      `${elapsed}ms, code=${init.code}`
    );
    check(
      `init with stalled ${hangPath} writes config and warns`,
      existsSync(join(project, 'lara.yaml')) && init.stderr.includes('timed out'),
      init.stderr
    );
  } finally {
    hung.closeAllConnections();
    await new Promise((resolve) => hung.close(resolve));
  }
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
  check(
    'rejected key: auth_fail carries what Lara answered',
    fresh.find((e) => e.eventType === 'auth_fail')?.metadata?.httpStatus === 401 &&
      fresh.find((e) => e.eventType === 'auth_fail')?.metadata?.laraErrorType ===
        'AuthenticationError',
    JSON.stringify(fresh.find((e) => e.eventType === 'auth_fail')?.metadata)
  );
}

// --- a first-ever key Lara refuses: auth_fail with no account id -------------
{
  const before = received.flatMap((r) => r.body.events).length;
  const virginDir = mkdtempSync(join(tmpdir(), 'lara-e2e-virgin-'));
  laraRejects = true;
  const rejected = await run(OK, {
    LARA_STATE_DIR: virginDir,
    // A key this machine has never seen: there is no cached account id to fall
    // back on, which is the whole point of the scenario.
    LARA_ACCESS_KEY_ID: 'e2e-never-seen-key-id',
  });
  laraRejects = false;

  check('first-ever rejected key: the command fails', rejected.code !== 0, `code=${rejected.code}`);
  const fresh = received.flatMap((r) => r.body.events).slice(before);
  const authFail = fresh.find((e) => e.eventType === 'auth_fail');
  check(
    'first-ever rejected key: auth_fail still reported',
    authFail?.errorType === 'auth_401',
    fresh.map((e) => `${e.eventType}/${e.errorType ?? ''}`).join(',')
  );
  check(
    'first-ever rejected key: accountId omitted, not faked',
    authFail !== undefined && !('accountId' in authFail),
    JSON.stringify(authFail ?? null)
  );
  check(
    'first-ever rejected key: no call event without an account id',
    !fresh.some((e) => e.eventType === 'call_error' || e.eventType === 'call_success'),
    fresh.map((e) => e.eventType).join(',')
  );
}

// --- a file the user broke: not our failure, and the funnel must say so ------
{
  const before = received.flatMap((r) => r.body.events).length;
  writeFileSync(join(project, 'broken.json'), '{"greeting": "hello",,}\n');
  const broken = await run([
    'translate',
    '--file',
    'broken.json',
    '-s',
    'en',
    '-t',
    'it',
    '-o',
    'broken-it.json',
  ]);

  check('malformed file: the command fails', broken.code !== 0, `code=${broken.code}`);
  const fresh = received.flatMap((r) => r.body.events).slice(before);
  check(
    'malformed file: call_error classified as parse_error, not unknown',
    fresh.some((e) => e.eventType === 'call_error' && e.errorType === 'parse_error'),
    fresh.map((e) => `${e.eventType}/${e.errorType ?? ''}`).join(',')
  );
}

// --- a key that is fine but out of credit -----------------------------------
{
  const before = received.flatMap((r) => r.body.events).length;
  laraTranslateStatus = 402;
  const broke = await run(OK);
  laraTranslateStatus = 0;

  check('out of credit: the command fails', broke.code !== 0, `code=${broke.code}`);
  const fresh = received.flatMap((r) => r.body.events).slice(before);
  check(
    'out of credit: Lara answered past its auth check, so auth_success is reported',
    fresh.some((e) => e.eventType === 'auth_success'),
    fresh.map((e) => e.eventType).join(',')
  );
  check(
    'out of credit: the failure lands as call_error / payment_402',
    fresh.some((e) => e.eventType === 'call_error' && e.errorType === 'payment_402'),
    fresh.map((e) => `${e.eventType}/${e.errorType ?? ''}`).join(',')
  );
  check(
    'out of credit: call_error carries the status and type Lara answered with',
    fresh.find((e) => e.eventType === 'call_error')?.metadata?.httpStatus === 402 &&
      fresh.find((e) => e.eventType === 'call_error')?.metadata?.laraErrorType ===
        'PaymentRequired',
    JSON.stringify(fresh.find((e) => e.eventType === 'call_error')?.metadata)
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

// --- another process queues events while a flush is on the network -----------
{
  let releaseUpload;
  let uploadStarted;
  const blocked = new Promise((resolve) => {
    releaseUpload = resolve;
  });
  const started = new Promise((resolve) => {
    uploadStarted = resolve;
  });
  ingestResponder = async () => {
    uploadStarted();
    await blocked;
    return 202;
  };
  const first = run(['memory', 'list']);
  await started;
  const second = await run(['memory', 'list'], { METRICS_URL: 'http://127.0.0.1:1' });
  const pending = queueContent()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  releaseUpload();
  const firstResult = await first;
  ingestResponder = null;
  const remaining = queueContent()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  check('concurrent commands both succeed', firstResult.code === 0 && second.code === 0);
  check(
    'first flush leaves the second process events queued',
    remaining.length === 2 &&
      remaining.every((event) => pending.some((item) => item.eventId === event.eventId)),
    JSON.stringify(remaining)
  );
  const before = received.flatMap((r) => r.body.events).length;
  await run(['memory', 'list']);
  const delivered = received.flatMap((r) => r.body.events).slice(before);
  check(
    'next command delivers the events preserved across the concurrent flush',
    remaining.every((event) => delivered.some((item) => item.eventId === event.eventId)) &&
      queueContent() === ''
  );
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
  const laraDeadBefore = received.flatMap((r) => r.body.events).length;
  const laraDead = await run(OK, { LARA_SERVER_URL: 'http://127.0.0.1:1' });
  check('unreachable Lara: CLI exits non-zero', laraDead.code !== 0, `code=${laraDead.code}`);
  const fresh = received.flatMap((r) => r.body.events).slice(laraDeadBefore);
  // Its own terminal event is the last one; the rest are leftovers the previous
  // scenario left queued when the metrics backend was unreachable.
  check(
    'unreachable Lara: classified as network_error, not unknown',
    fresh.at(-1)?.eventType === 'call_error' && fresh.at(-1)?.errorType === 'network_error',
    fresh.map((e) => `${e.eventType}/${e.errorType ?? ''}`).join(',')
  );
}

// --- opt-out -----------------------------------------------------------------
const optOutRoot = mkdtempSync(join(tmpdir(), 'lara-e2e-optout-'));
const optOutDir = join(optOutRoot, 'should-not-exist');
const off = await run(OK, { DO_NOT_TRACK: '1', LARA_STATE_DIR: optOutDir });
check('opt-out: CLI still exits 0', off.code === 0, `code=${off.code}`);
check('opt-out: no state directory created', !existsSync(optOutDir));
check(
  'opt-out: LARA_TELEMETRY_DISABLED is gone, no-trace is the switch',
  !readFileSync(join(REPO, 'README.md'), 'utf8').includes('LARA_TELEMETRY_DISABLED')
);

// --- no-trace: the flag --------------------------------------------------------
{
  const noTraceRoot = mkdtempSync(join(tmpdir(), 'lara-e2e-notrace-flag-'));
  const noTraceDir = join(noTraceRoot, 'should-not-exist');
  const before = received.length;
  const quiet = await run([...OK, '--no-trace'], { LARA_STATE_DIR: noTraceDir });

  check('no-trace flag: the translation still runs', quiet.code === 0, `code=${quiet.code}`);
  check('no-trace flag: no state directory created', !existsSync(noTraceDir));
  check('no-trace flag: nothing reached the backend', received.length === before);
  rmSync(noTraceRoot, { recursive: true, force: true });
}

// --- no-trace: the project config, on a command that has no such flag ---------
{
  const noTraceProject = mkdtempSync(join(tmpdir(), 'lara-e2e-notrace-config-'));
  const noTraceRoot = mkdtempSync(join(tmpdir(), 'lara-e2e-notrace-state-'));
  const noTraceDir = join(noTraceRoot, 'should-not-exist');
  writeFileSync(
    join(noTraceProject, 'lara.yaml'),
    [
      "version: '1.0.0'",
      'locales:',
      '  source: en',
      '  target:',
      '    - it',
      'noTrace: true',
      'files:',
      '  json:',
      '    include:',
      '      - src/i18n/[locale].json',
      '',
    ].join('\n')
  );

  const before = received.length;
  const quiet = await run(['memory', 'list'], { LARA_STATE_DIR: noTraceDir }, noTraceProject);

  check('no-trace config: the command still runs', quiet.code === 0, `code=${quiet.code}`);
  check('no-trace config: no state directory created', !existsSync(noTraceDir));
  check('no-trace config: nothing reached the backend', received.length === before);
  rmSync(noTraceProject, { recursive: true, force: true });
  rmSync(noTraceRoot, { recursive: true, force: true });
}

// --- no-trace deletes what a traced run had left queued ----------------------
{
  const purgeRoot = mkdtempSync(join(tmpdir(), 'lara-e2e-purge-'));
  const purgeQueueFile = join(purgeRoot, QUEUE_FILE);
  writeFileSync(
    purgeQueueFile,
    `${JSON.stringify({
      eventType: 'call_success',
      channel: 'cli',
      accountId: ACCOUNT_ID,
      timestamp: new Date().toISOString(),
    })}\n`
  );

  const before = received.length;
  const quiet = await run([...OK, '--no-trace'], { LARA_STATE_DIR: purgeRoot });

  check('no-trace purge: the translation still runs', quiet.code === 0, `code=${quiet.code}`);
  check('no-trace purge: the queued event is deleted, not sent', !existsSync(purgeQueueFile));
  check('no-trace purge: nothing reached the backend', received.length === before);
  rmSync(purgeRoot, { recursive: true, force: true });
}

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
