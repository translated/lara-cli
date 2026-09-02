import { LaraApiError } from '@translated/lara';
import { type Ora as OraSpinner } from 'ora';
import { Messages } from '#messages/messages.js';

/**
 * Thrown where the CLI used to call process.exit(1) directly. The message is
 * already on screen by the time it is raised, so whoever catches it exits with
 * a non-zero code without printing anything again. Unwinding instead of exiting
 * on the spot is what lets the command flush its usage metrics on the way out.
 */
export class HandledExitError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'HandledExitError';
  }
}

/** Narrows an unknown caught value to a readable message string. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * True when an error is the Lara "plan out of characters / quota exceeded" error.
 * Matched on the message/type because the API does not use a dedicated status
 * code for it (it arrives as a normal API error whose message mentions "quota").
 */
export function isQuotaError(error: unknown): boolean {
  const type = error instanceof LaraApiError ? error.type : '';
  return /\bquota\b/i.test(`${getErrorMessage(error)} ${type}`);
}

/**
 * Handles Lara API errors by displaying appropriate error messages.
 * Uses early returns (guard clauses) for optimal performance and readability.
 *
 * Fatal errors (401, 402/403, quota, 5xx) are reported and then raised as a
 * HandledExitError; everything else is reported and returns, letting the caller
 * carry on with the remaining files.
 *
 * @param error - The LaraApiError to handle
 * @param context - Context information (e.g., file path being translated)
 * @throws HandledExitError when the error is fatal
 */
export function handleLaraApiError(
  error: LaraApiError,
  context: string,
  spinner: OraSpinner
): void {
  // Authentication error - early return
  if (error.statusCode === 401) {
    displayErrorAndExit(Messages.errors.apiAuthFailed(context), spinner, error);
  }

  // Plan exhausted (no characters left) / forbidden - early return
  if (error.statusCode === 402 || error.statusCode === 403 || isQuotaError(error)) {
    displayErrorAndExit(
      Messages.errors.apiQuotaExceeded(context, error.message || ''),
      spinner,
      error
    );
  }

  // Server error - early return
  if (error.statusCode >= 500) {
    displayErrorAndExit(
      Messages.errors.serviceUnavailable(context, error.statusCode),
      spinner,
      error
    );
  }

  // Default error handling - all other cases
  displayError(Messages.errors.translationFailed(context, error.message || ''), spinner);
}

/**
 * Displays an error message using Ora and unwinds. The caller turns this into a
 * non-zero exit once it has finished its own cleanup.
 *
 * @param message - The error message to display
 * @returns Never returns - always throws
 */
function displayErrorAndExit(message: string, spinner: OraSpinner, cause?: unknown): never {
  spinner.fail(message);
  // The cause travels with it: the message is for the user, the original error
  // is what the metrics module needs to classify the failure.
  throw new HandledExitError(message, cause);
}

function displayError(message: string, spinner: OraSpinner): void {
  spinner.fail(message);
}

