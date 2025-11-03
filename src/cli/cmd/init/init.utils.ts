import { input } from '@inquirer/prompts';
import Ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { ConfigProvider } from '#modules/config/config.provider.js';

/**
 * Resolves the project instruction based on CLI option or existing config.
 * Priority: CLI instruction > Existing instruction > undefined
 *
 * @param cliInstruction - Instruction provided via CLI option
 * @returns Resolved instruction or undefined
 */
export function resolveProjectInstruction(cliInstruction?: string): string | undefined {
  // If instruction provided via CLI, use it
  if (cliInstruction) {
    return cliInstruction;
  }

  // Otherwise, try to preserve existing instruction from config
  const configProvider = ConfigProvider.getInstance();
  if (configProvider.doesConfigExists()) {
    const config = configProvider.getConfig();
    return config.project?.instruction;
  }

  return undefined;
}

/**
 * Validates and sanitizes API credentials.
 * Only allows non-empty strings with alphanumeric characters, dashes, and underscores.
 * Trims whitespace and removes newlines.
 *
 * @param credential - The credential string to validate
 * @param name - The name of the credential (for error messages)
 * @returns Sanitized credential string
 * @throws Error if credential is invalid
 */
function validateCredential(credential: string, name: string): string {
  const sanitized = credential.trim().replace(/[\r\n]+/g, '');
  // Accept alphanumeric, dash, underscore, min 8 chars, max 128 chars
  if (sanitized.length < 8 || sanitized.length > 128) {
    throw new Error(`${name} must be 8-128 characters.`);
  }
  return sanitized;
}

/**
 * Sets API credentials by prompting for new values and updating .env file.
 * Preserves other environment variables in the file.
 *
 * @returns Promise that resolves when credentials are updated
 */
export async function setCredentials(): Promise<void> {
  const apiKeyRaw = await input({ message: 'Insert your API Key:' });
  const apiSecretRaw = await input({ message: 'Insert your API Secret:' });
  let apiKey: string, apiSecret: string;
  try {
    apiKey = validateCredential(apiKeyRaw, 'API Key');
    apiSecret = validateCredential(apiSecretRaw, 'API Secret');
  } catch (err: unknown) {
    if (err instanceof Error) {
      Ora({ text: err.message, color: 'red' }).fail();
    } else {
      Ora({ text: 'An unknown error occurred', color: 'red' }).fail();
    }
    throw err;
  }

  const envPath = '.env';

  if (!existsSync(envPath)) {
    Ora({ text: 'No .env file found. Creating one...', color: 'yellow' }).warn();
    writeFileSync(envPath, '');
  }

  let envContent = '';
  try {
    envContent = readFileSync(envPath, 'utf-8');
  } catch (err: unknown) {
    if (err instanceof Error) {
      Ora({
        text: `Failed to read .env file: ${err.message}. Please check file permissions.`,
        color: 'red',
      }).fail();
    } else {
      Ora({ text: 'An unknown error occurred', color: 'red' }).fail();
    }
    throw err;
  }

  // Replace or add the key/value pairs
  if (/^LARA_ACCESS_KEY_ID=/m.test(envContent)) {
    envContent = envContent.replace(/^LARA_ACCESS_KEY_ID=.*$/m, `LARA_ACCESS_KEY_ID=${apiKey}`);
  } else {
    envContent += `\n# Lara API credentials\nLARA_ACCESS_KEY_ID=${apiKey}`;
  }

  if (/^LARA_ACCESS_KEY_SECRET=/m.test(envContent)) {
    envContent = envContent.replace(
      /^LARA_ACCESS_KEY_SECRET=.*$/m,
      `LARA_ACCESS_KEY_SECRET=${apiSecret}`
    );
  } else {
    envContent += `\nLARA_ACCESS_KEY_SECRET=${apiSecret}`;
  }

  writeFileSync(envPath, envContent);

  Ora({ text: 'API credentials set successfully', color: 'green' }).succeed();
}

/**
 * Retrieves existing memories from config if available.
 * Returns an empty array if config doesn't exist, force flag is set, or error occurs.
 *
 * @param force - If true, ignores existing memories
 * @returns Existing memories or an empty array
 */
export function getExistingMemories(force: boolean): string[] {
  const configProvider = ConfigProvider.getInstance();

  if (!configProvider.doesConfigExists() || force) {
    return [];
  }

  try {
    const config = configProvider.getConfig();
    return config.memories || [];
  } catch {
    return [];
  }
}

/**
 * Retrieves existing glossaries from config if available.
 * Returns an empty array if config doesn't exist, force flag is set, or error occurs.
 *
 * @param force - If true, ignores existing glossaries
 * @returns Existing glossaries or an empty array
 */
export function getExistingGlossaries(force: boolean): string[] {
  const configProvider = ConfigProvider.getInstance();

  if (!configProvider.doesConfigExists() || force) {
    return [];
  }

  try {
    const config = configProvider.getConfig();
    return config.glossaries || [];
  } catch {
    return [];
  }
}
