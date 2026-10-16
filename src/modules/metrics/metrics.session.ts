import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lockSync } from 'proper-lockfile';

import { SESSION_FILE, SESSION_IDLE_TIMEOUT_MS } from './metrics.const.js';

type Session = { scope: string; sessionId: string; lastActivity: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let current: { dir: string; session: Session } | null = null;

function readSession(file: string): Session | null {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8')) as Partial<Session> | null;
    return value &&
      typeof value.scope === 'string' &&
      typeof value.sessionId === 'string' &&
      UUID.test(value.sessionId) &&
      typeof value.lastActivity === 'number' &&
      Number.isFinite(value.lastActivity) &&
      value.lastActivity >= 0
      ? (value as Session)
      : null;
  } catch {
    return null;
  }
}

function active(session: Session | null, scope: string, now: number): session is Session {
  return (
    session !== null &&
    session.scope === scope &&
    session.lastActivity <= now &&
    now - session.lastActivity < SESSION_IDLE_TIMEOUT_MS
  );
}

/** Shared usage session. Callers guard opt-out and swallow any filesystem failure. */
export function touchSession(dir: string, scope: string): string | null {
  const file = join(dir, SESSION_FILE);
  let release: (() => void) | undefined;
  try {
    // This lock covers only a small synchronous read/write, never the network.
    // Brief contention gets a bounded retry so concurrent first commands agree.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        release = lockSync(file, {
          realpath: false,
          retries: 0,
          stale: 10_000,
          onCompromised: () => {},
        });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ELOCKED') throw error;
        if (attempt < 4) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
      }
    }
    const now = Date.now();
    const stored = readSession(file);
    if (!release) {
      // The writer already published a valid session: join it without racing
      // its activity update. Otherwise leave telemetry to a later event.
      if (!active(stored, scope, now)) return null;
      current = { dir, session: stored };
      return stored.sessionId;
    }
    const own = current?.dir === dir && current.session.scope === scope ? current.session : null;
    const sessionId =
      own?.sessionId ?? (active(stored, scope, now) ? stored.sessionId : randomUUID());
    const session = { scope, sessionId, lastActivity: now };
    // A long-running command keeps its session, but must not replace a newer
    // session opened by another command while it was running.
    if (!own || !stored || stored.sessionId === own.sessionId) {
      const pending = `${file}.${randomUUID()}.tmp`;
      try {
        writeFileSync(pending, JSON.stringify(session));
        renameSync(pending, file);
      } finally {
        rmSync(pending, { force: true });
      }
    }
    current = { dir, session };
    return sessionId;
  } finally {
    try {
      release?.();
    } catch {
      /* Telemetry cleanup never fails the command. */
    }
  }
}
