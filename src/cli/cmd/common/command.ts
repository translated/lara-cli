import Ora from 'ora';

import { Messages } from '#messages/messages.js';

/**
 * Checks whether the Lara API credentials are present in the environment.
 */
export function hasCredentials(): boolean {
  return Boolean(process.env.LARA_ACCESS_KEY_ID && process.env.LARA_ACCESS_KEY_SECRET);
}

/**
 * Exits with an error message when the Lara API credentials are missing.
 */
export function ensureCredentials(): void {
  if (!hasCredentials()) {
    Ora({ text: Messages.errors.noApiCredentials, color: 'red' }).fail();
    process.exit(1);
  }
}

/**
 * Runs a command action, turning any uncaught error into a failed spinner and a
 * non-zero exit code.
 */
export async function runSafely(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Ora({ text: message, color: 'red' }).fail();
    process.exit(1);
  }
}
