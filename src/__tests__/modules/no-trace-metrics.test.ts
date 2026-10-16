import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { QUEUE_FILE } from '#modules/metrics/metrics.const.js';

/**
 * No-trace mode is resolved in runSafely, the one function every command goes
 * through, so that is where it has to be proven: the flag, the config file, and
 * a lara.yaml nobody can read must all end the same way.
 */

const ACCOUNT_ID = 'acc_4kQpXbW2mNvRt7yZjD3sLh';
const ENV_KEYS = [
  'DO_NOT_TRACK',
  'METRICS_URL',
  'METRICS_API_KEY',
  'LARA_ACCESS_KEY_ID',
  'LARA_STATE_DIR',
] as const;

const VALID_CONFIG = `version: '1.0.0'
locales:
  source: en
  target:
    - it
files:
  json:
    include:
      - src/i18n/[locale].json
`;

let projectDir: string;
let stateDir: string;
let savedEnv: Record<string, string | undefined>;
let savedCwd: string;

function laraJwt(accountId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: accountId })).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
}

function queuePath(): string {
  return join(stateDir, QUEUE_FILE);
}

/**
 * One CLI invocation: fresh modules, fresh config singleton, stubbed network.
 * `noTrace` is what the commands with a --no-trace flag pass down; the flag
 * itself is wired to it in translate.ts and init.ts, and exercised end to end by
 * scripts/verify-metrics-e2e.mjs.
 */
async function runCommand(noTrace = false): Promise<{ sent: boolean }> {
  vi.resetModules();
  const fetchSpy = vi.fn(() => new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchSpy);

  const metrics = await import('#modules/metrics/metrics.js');
  const { runSafely } = await import('#cli/cmd/common/command.js');
  metrics.trackLaraClient({ token: laraJwt(ACCOUNT_ID) });

  await runSafely(async () => {}, 'memory list', noTrace);

  return { sent: fetchSpy.mock.calls.length > 0 };
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  savedCwd = process.cwd();
  projectDir = mkdtempSync(join(tmpdir(), 'lara-no-trace-project-'));
  stateDir = join(mkdtempSync(join(tmpdir(), 'lara-no-trace-state-')), 'state');

  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  process.env.LARA_STATE_DIR = stateDir;
  process.env.METRICS_URL = 'https://metrics.example';
  process.env.METRICS_API_KEY = 'metrics-key';
  process.env.LARA_ACCESS_KEY_ID = 'test-access-key-id';
  process.chdir(projectDir);
});

afterEach(() => {
  process.chdir(savedCwd);
  vi.unstubAllGlobals();
  rmSync(projectDir, { recursive: true, force: true });
  rmSync(stateDir, { recursive: true, force: true });
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

describe('no-trace mode governs usage metrics', () => {
  it('records a plain run, with no config and no flag', async () => {
    const { sent } = await runCommand();

    expect(sent).toBe(true);
  });

  it('records nothing when the command was asked not to trace', async () => {
    const { sent } = await runCommand(true);

    expect(sent).toBe(false);
    // Not so much as a directory: opting out must leave no trace of its own.
    expect(existsSync(stateDir)).toBe(false);
  });

  it('records nothing for any command when the project config says noTrace', async () => {
    writeFileSync(join(projectDir, 'lara.yaml'), `${VALID_CONFIG}noTrace: true\n`);

    const { sent } = await runCommand();

    expect(sent).toBe(false);
    expect(existsSync(stateDir)).toBe(false);
  });

  it('keeps recording when the project config says noTrace: false', async () => {
    writeFileSync(join(projectDir, 'lara.yaml'), `${VALID_CONFIG}noTrace: false\n`);

    const { sent } = await runCommand();

    expect(sent).toBe(true);
  });

  it('treats a lara.yaml it cannot read as a no', async () => {
    writeFileSync(join(projectDir, 'lara.yaml'), 'version: [unclosed\n');

    const { sent } = await runCommand();

    expect(sent).toBe(false);
    expect(existsSync(stateDir)).toBe(false);
  });

  it('deletes what an earlier, traced run had queued', async () => {
    await runCommand();
    writeFileSync(queuePath(), `${JSON.stringify({ eventType: 'call_success' })}\n`);

    const { sent } = await runCommand(true);

    expect(sent).toBe(false);
    expect(existsSync(queuePath())).toBe(false);
  });
});
