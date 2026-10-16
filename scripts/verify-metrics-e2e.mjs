#!/usr/bin/env node
// Real CLI + SDK against local servers. Keep protocol, command wiring and
// multi-process regressions here; status matrices and edge cases live in Vitest.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const repo = process.argv[2] ?? process.cwd();
const cli = join(repo, 'build/index.js');
const { QUEUE_FILE, SESSION_FILE, SESSION_IDLE_TIMEOUT_MS } = await import(
  pathToFileURL(join(repo, 'build/modules/metrics/metrics.const.js')).href
);
const version = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version;
const account = 'acc_e2eXbW2mNvRt7yZjD3sLh';
const channelKey = 'e2e-metrics-key';
const ingestToken = 'e2e-ingest-token';
const exec = promisify(execFile);
const root = mkdtempSync(join(tmpdir(), 'lara-metrics-e2e-'));
const received = [];
const tokens = [];
let rejectLara = false;
let hangLaraPath = null;
let hangMetrics = false;
let ingest = async () => 202;

async function body(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(value));
}
async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
const lara = createServer(async (req, res) => {
  const input = await body(req);
  if (req.url === hangLaraPath) return;
  if (rejectLara)
    return json(res, 401, { error: { type: 'AuthenticationError', message: 'invalid key' } });
  if (req.url === '/v2/auth') {
    const payload = Buffer.from(JSON.stringify({ id: account })).toString('base64url');
    return json(res, 200, { token: `header.${payload}.signature` });
  }
  if (req.url === '/v2/languages') return json(res, 200, ['en', 'it']);
  if (req.url === '/v2/memories') return json(res, 200, []);
  if (req.url === '/translate') {
    // The SDK consumes NDJSON envelopes, including for a one-line translation.
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    return res.end(
      `${JSON.stringify({
        status: 200,
        data: {
          translation: input.q.map((block) => ({ ...block, text: `[it] ${block.text}` })),
        },
      })}\n`
    );
  }
  json(res, 404, { error: { type: 'NotFound', message: 'missing resource' } });
});
const backend = createServer(async (req, res) => {
  const input = await body(req);
  if (hangMetrics) return;
  if (req.url === '/auth/issue-token') {
    tokens.push({ auth: req.headers.authorization, ...input });
    return json(res, 200, { token: ingestToken, expiresIn: 3600 });
  }
  received.push({ path: req.url, auth: req.headers.authorization, events: input.events });
  json(res, await ingest(), { accepted: input.events.length });
});
const laraUrl = await listen(lara);
const metricsUrl = await listen(backend);

function fixture(name) {
  const box = { project: join(root, name), state: join(root, `${name}-state`) };
  mkdirSync(box.project);
  writeFileSync(join(box.project, 'src.json'), JSON.stringify({ greeting: 'hello' }));
  return box;
}
async function run(box, args, extra = {}) {
  const env = {
    ...process.env,
    DO_NOT_TRACK: '',
    LARA_ACCESS_KEY_ID: 'e2e-access-key-id',
    LARA_ACCESS_KEY_SECRET: 'e2e-access-key-secret',
    LARA_SERVER_URL: laraUrl,
    LARA_STATE_DIR: box.state,
    METRICS_URL: metricsUrl,
    METRICS_API_KEY: channelKey,
    ...extra,
  };
  try {
    const result = await exec('node', [cli, ...args], { cwd: box.project, env, timeout: 10_000 });
    return { code: 0, ...result };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}
const translate = ['translate', '--file', 'src.json', '-s', 'en', '-t', 'it', '-o', 'out.json'];
const init = ['-y', 'init', '--force', '-s', 'en', '-t', 'it'];
const eventsSince = (index) => received.slice(index).flatMap((batch) => batch.events);
function queued(box) {
  if (!existsSync(box.state)) return [];
  return readdirSync(box.state)
    .filter(
      (name) =>
        name === QUEUE_FILE || (name.startsWith(`${QUEUE_FILE}.`) && name.endsWith('.jsonl'))
    )
    .flatMap((name) =>
      readFileSync(join(box.state, name), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    );
}
let passed = 0;
let failed = 0;
async function check(name, test) {
  try {
    await test();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL  ${name}\n${error.stack}`);
  } finally {
    rejectLara = false;
    hangLaraPath = null;
    hangMetrics = false;
    ingest = async () => 202;
  }
}

try {
  await check(
    'translation sends the account identity and exchanges the channel key for a token',
    async () => {
      const box = fixture('translation');
      const before = received.length;
      const result = await run(box, translate);
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(JSON.parse(readFileSync(join(box.project, 'out.json'), 'utf8')), {
        greeting: '[it] hello',
      });
      const batch = received[before];
      assert.equal(batch.path, '/metrics/ingest-events');
      assert.equal(batch.auth, `Bearer ${ingestToken}`);
      assert.equal(tokens.at(-1).auth, `Bearer ${channelKey}`);
      assert.match(tokens.at(-1).installationId, /^[0-9a-f-]{36}$/);
      assert.deepEqual(
        batch.events.map((e) => e.eventType),
        ['auth_success', 'call_success']
      );
      assert.ok(
        batch.events.every(
          (e) => e.accountId === account && e.channel === 'cli' && e.channelVersion === version
        )
      );
      assert.deepEqual(batch.events.at(-1).metadata, {
        ...batch.events.at(-1).metadata,
        command: 'translate',
        feature: 'document',
        sourceLang: 'en',
        targetLang: 'it',
        fileTypes: 'json',
      });
      assert.ok(batch.events.at(-1).charsTranslated > 0);
      assert.ok(!JSON.stringify(batch).includes('e2e-access-key'));
      assert.ok(!JSON.stringify(batch).includes(channelKey));
      assert.equal(queued(box).length, 0);

      // A parser failure happens before Lara is called, but remains attributable.
      writeFileSync(join(box.project, 'src.json'), '{bad JSON');
      const broken = await run(box, translate);
      assert.equal(broken.code, 1);
      const failure = received.at(-1).events;
      assert.equal(failure.length, 1);
      assert.equal(failure[0].eventType, 'call_error');
      assert.equal(failure[0].errorType, 'parse_error');
      assert.equal(failure[0].accountId, account);
      assert.equal(failure[0].sessionId, batch.events[0].sessionId);
    }
  );

  await check(
    'init activates once; subsequent commands share a session until 30 minutes of inactivity',
    async () => {
      const box = fixture('activation');
      const before = received.length;
      for (const args of [init, init, translate]) {
        const result = await run(box, args);
        assert.equal(result.code, 0, result.stderr);
      }
      const events = eventsSince(before);
      assert.deepEqual(
        events.map((e) => e.eventType),
        ['auth_success', 'call_success', 'call_success', 'call_success']
      );
      assert.equal(new Set(events.map((e) => e.sessionId)).size, 1);
      assert.ok(existsSync(join(box.project, 'lara.yaml')));
      const sessionFile = join(box.state, SESSION_FILE);
      const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
      writeFileSync(
        sessionFile,
        JSON.stringify({ ...session, lastActivity: Date.now() - SESSION_IDLE_TIMEOUT_MS - 1 })
      );
      assert.equal((await run(box, translate)).code, 0);
      const resumed = received.at(-1).events;
      assert.deepEqual(
        resumed.map((e) => e.eventType),
        ['call_success']
      );
      assert.notEqual(resumed[0].sessionId, session.sessionId);
    }
  );

  for (const resource of ['memory', 'glossary']) {
    await check(`${resource} API failures exit 1 and emit call_error exactly once`, async () => {
      const box = fixture(resource);
      const result = await run(box, [resource, 'update', 'missing', 'Renamed']);
      assert.equal(result.code, 1);
      assert.equal(result.stderr.split('Translation failed').length, 2);
      const events = received.at(-1).events;
      assert.deepEqual(
        events.map((e) => e.eventType),
        ['auth_success', 'call_error']
      );
      assert.equal(events.at(-1).metadata.httpStatus, 404);
      assert.equal(events.at(-1).metadata.command, `${resource} update`);
    });
  }

  for (const known of [false, true]) {
    await check(
      `rejected Lara credentials report auth_fail (${known ? 'cached account' : 'first use'})`,
      async () => {
        const box = fixture(`rejected-${known}`);
        if (known) assert.equal((await run(box, translate)).code, 0);
        const before = received.length;
        rejectLara = true;
        assert.equal((await run(box, translate)).code, 1);
        const events = eventsSince(before);
        assert.deepEqual(
          events.map((e) => e.eventType),
          known ? ['auth_fail', 'call_error'] : ['auth_fail']
        );
        assert.ok(events.every((e) => e.errorType === 'auth_401'));
        assert.equal(events[0].accountId, known ? account : undefined);
      }
    );
  }

  for (const path of ['/v2/auth', '/v2/languages']) {
    await check(`init cancels a stalled ${path} probe and saves its configuration`, async () => {
      const box = fixture(`stalled-${path.split('/').at(-1)}`);
      hangLaraPath = path;
      const started = Date.now();
      const result = await run(box, init, { DO_NOT_TRACK: '1' });
      assert.equal(result.code, 0, result.stderr);
      assert.ok(Date.now() - started < 4_000);
      assert.ok(result.stderr.includes('Could not verify your API credentials'));
      assert.ok(existsSync(join(box.project, 'lara.yaml')));
    });
  }

  await check(
    'overlapping flushes preserve later events without sending a batch twice',
    async () => {
      const box = fixture('overlapping');
      const before = received.length;
      let release;
      let signalStarted;
      const blocked = new Promise((resolve) => {
        release = resolve;
      });
      const started = new Promise((resolve) => {
        signalStarted = resolve;
      });
      ingest = async () => {
        signalStarted();
        await blocked;
        return 202;
      };
      const first = run(box, ['memory', 'list']);
      try {
        await Promise.race([
          started,
          first.then((result) =>
            assert.fail(`first command exited before uploading: ${result.stderr}`)
          ),
        ]);
        assert.equal((await run(box, ['memory', 'list'])).code, 0);
        assert.equal(received.length, before + 1);
        assert.equal(queued(box).length, 3);
      } finally {
        release();
        await first;
        ingest = async () => 202;
      }
      assert.equal(queued(box).length, 1);
      assert.equal((await run(box, ['memory', 'list'])).code, 0);
      const events = eventsSince(before);
      assert.deepEqual(
        events.map((e) => e.eventType),
        ['auth_success', 'call_success', 'call_success', 'call_success']
      );
      assert.equal(new Set(events.map((e) => e.eventId)).size, 4);
      assert.equal(new Set(events.map((e) => e.sessionId)).size, 1);
      assert.equal(queued(box).length, 0);
    }
  );

  await check(
    'parallel first commands agree on a session and retain every command result',
    async () => {
      const box = fixture('parallel');
      const before = received.length;
      const results = await Promise.all(
        Array.from({ length: 4 }, () => run(box, ['memory', 'list']))
      );
      results.push(await run(box, ['memory', 'list']));
      assert.ok(results.every((r) => r.code === 0));
      const events = eventsSince(before);
      assert.equal(events.filter((e) => e.eventType === 'auth_success').length, 1);
      assert.equal(events.filter((e) => e.eventType === 'call_success').length, 5);
      assert.equal(new Set(events.map((e) => e.sessionId)).size, 1);
      assert.equal(new Set(events.map((e) => e.eventId)).size, events.length);
      assert.equal(queued(box).length, 0);
    }
  );

  for (const mode of ['DO_NOT_TRACK', 'flag', 'config', 'unconfigured']) {
    await check(`${mode} disables metrics without preventing translation`, async () => {
      const box = fixture(`quiet-${mode}`);
      const before = received.length;
      if (mode === 'config')
        writeFileSync(
          join(box.project, 'lara.yaml'),
          "version: '1.0.0'\nlocales:\n  source: en\n  target: [it]\nfiles:\n  json:\n    include: ['src.json']\nnoTrace: true\n"
        );
      const env =
        mode === 'DO_NOT_TRACK'
          ? { DO_NOT_TRACK: '1' }
          : mode === 'unconfigured'
            ? { METRICS_API_KEY: '' }
            : {};
      const args = mode === 'flag' ? [...translate, '--no-trace'] : translate;
      const result = await run(box, args, env);
      assert.equal(result.code, 0, result.stderr);
      assert.ok(existsSync(join(box.project, 'out.json')));
      assert.equal(received.length, before);
      assert.equal(existsSync(box.state), false);
    });
  }

  for (const stalled of [false, true]) {
    await check(
      `metrics ${stalled ? 'timeout' : 'connection failure'} stays silent and retries queued events`,
      async () => {
        const box = fixture(`offline-${stalled}`);
        await run(box, translate);
        const healthy = await run(box, translate);
        const before = received.length;
        hangMetrics = stalled;
        const started = Date.now();
        const result = await run(
          box,
          translate,
          stalled ? {} : { METRICS_URL: 'http://127.0.0.1:1' }
        );
        assert.equal(result.code, 0);
        assert.equal(result.stdout, healthy.stdout);
        assert.equal(result.stderr, healthy.stderr);
        assert.ok(Date.now() - started < 4_000);
        assert.equal(received.length, before);
        const pending = queued(box);
        assert.equal(pending.length, 1);
        hangMetrics = false;
        assert.equal((await run(box, translate)).code, 0);
        assert.ok(eventsSince(before).some((e) => e.eventId === pending[0].eventId));
        assert.equal(queued(box).length, 0);
      }
    );
  }
} finally {
  for (const server of [lara, backend]) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  rmSync(root, { recursive: true, force: true });
}
console.log(`\n${passed}/${passed + failed} scenarios passed`);
process.exitCode = failed ? 1 : 0;
