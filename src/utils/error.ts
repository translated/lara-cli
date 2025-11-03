import { LaraApiError } from '@translated/lara';
import { Ora } from 'ora';

/**
 * Handles Lara API errors by displaying appropriate error messages and exiting the process.
 * Uses early returns (guard clauses) for optimal performance and readability.
 *
 * @param error - The LaraApiError to handle
 * @param context - Context information (e.g., file path being translated)
 * @returns Never returns - always exits the process
 */
export function handleLaraApiError(error: LaraApiError, context: string, spinner: Ora): void {
  const baseMessage = `${context}:`;

  // Authentication error - early return
  if (error.statusCode === 401) {
    displayErrorAndExit(
      `${baseMessage} Authentication failed: Your API key is invalid or expired. Update your API keys in the .env file or run 'lara-dev init --reset-credentials' to reset your API keys.`,
      spinner
    );
  }

  // Server error - early return
  if (error.statusCode >= 500) {
    displayErrorAndExit(`${baseMessage} Service unavailable (${error.statusCode})`, spinner);
  }

  // Default error handling - all other cases
  displayError(`${baseMessage} Translation failed: ${error.message || 'Unknown error'}`, spinner);
}

/**
 * Displays an error message using Ora and exits the process.
 *
 * @param message - The error message to display
 * @returns Never returns - always exits the process
 */
function displayErrorAndExit(message: string, spinner: Ora): never {
  spinner.fail(message);
  process.exit(1);
}

function displayError(message: string, spinner: Ora): void {
  spinner.fail(message);
}
