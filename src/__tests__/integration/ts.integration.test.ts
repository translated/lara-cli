import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';

import { executeCommand } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const traverse = traverseModule.default || traverseModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Safely extracts the messages object from TypeScript content using Babel parser.
 * This is a secure alternative to eval() for parsing JavaScript object literals.
 */
function safelyExtractMessagesObject(content: string): Record<string, unknown> | null {
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'objectRestSpread'],
      allowReturnOutsideFunction: true,
    });

    let messagesObject: Record<string, unknown> | null = null;

    traverse(ast, {
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
        const { node } = path;
        if (t.isIdentifier(node.id) && node.id.name === 'messages' && node.init) {
          messagesObject = extractObjectFromAST(node.init);
          path.stop();
        }
      },
    });

    return messagesObject;
  } catch (error) {
    return null;
  }
}

/**
 * Safely extracts a JavaScript object from an AST node.
 * Only handles object literals, arrays, and primitive values.
 */
function extractObjectFromAST(node: t.Node): Record<string, unknown> | null {
  if (t.isObjectExpression(node)) {
    const result: Record<string, unknown> = {};

    for (const prop of node.properties) {
      if (t.isObjectProperty(prop)) {
        const key = getObjectKey(prop.key);
        if (key !== null) {
          result[key] = extractValueFromAST(prop.value);
        }
      } else if (t.isObjectMethod(prop) || t.isSpreadElement(prop)) {
        // Skip methods and spread elements for security
        continue;
      }
    }

    return result;
  }

  return null;
}

/**
 * Extracts a value from an AST node (object, array, or primitive).
 */
function extractValueFromAST(node: t.Node): unknown {
  if (t.isObjectExpression(node)) {
    return extractObjectFromAST(node);
  } else if (t.isArrayExpression(node)) {
    return node.elements
      .filter((el): el is t.Expression => el !== null && !t.isSpreadElement(el))
      .map((el) => extractValueFromAST(el));
  } else if (t.isStringLiteral(node)) {
    return node.value;
  } else if (t.isNumericLiteral(node)) {
    return node.value;
  } else if (t.isBooleanLiteral(node)) {
    return node.value;
  } else if (t.isNullLiteral(node)) {
    return null;
  } else if (t.isTemplateLiteral(node)) {
    // Convert template literals to strings (simple case only)
    if (node.expressions.length === 0) {
      return node.quasis[0]?.value.cooked || '';
    }
    // For template literals with expressions, return empty string for safety
    return '';
  } else {
    // For any other node type (identifiers, function calls, etc.), return null
    // This prevents code execution
    return null;
  }
}

/**
 * Extracts the key from an object property.
 */
function getObjectKey(key: t.Node): string | null {
  if (t.isIdentifier(key)) {
    return key.name;
  } else if (t.isStringLiteral(key)) {
    return key.value;
  } else if (t.isNumericLiteral(key)) {
    return String(key.value);
  }
  return null;
}

describe('TypeScript (i18n.ts) Repository Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;

  beforeEach(async () => {
    // Save original cwd and env
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExit = process.exit;

    // Mock process.exit to prevent tests from actually exiting
    process.exit = vi.fn() as any;

    // Create a temporary directory for each test
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-ts-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(testDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);

    // Set up mock API credentials
    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    // Reset ConfigProvider singleton
    (ConfigProvider as any).instance = null;
  });

  afterEach(async () => {
    // Restore original cwd, env, and exit
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exit = originalExit;

    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }

    // Clean up lara.lock file from project root if it was created during tests
    const lockFilePath = path.join(originalCwd, 'lara.lock');
    if (existsSync(lockFilePath)) {
      await unlink(lockFilePath).catch(() => {
        // Ignore errors if file doesn't exist or can't be deleted
      });
    }

    // Reset ConfigProvider singleton
    (ConfigProvider as any).instance = null;
  });

  it('should handle a TypeScript i18n.ts repository', async () => {
    // Set up TypeScript repository structure
    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
  en: {
    greeting: 'Hello',
    farewell: 'Goodbye',
    app: {
      name: 'My App',
      version: '1.0.0',
    },
  },
};

export default messages;`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(content).toContain('[it] Hello');
    expect(content).toContain('[it] Goodbye');
    expect(content).toContain('[it] My App');
    expect(content).toContain('"it"');
  });

  it('should handle TypeScript with multiple locales', async () => {
    // Set up TypeScript repository with existing locales
    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
  en: {
    welcome: 'Welcome',
    goodbye: 'Goodbye',
  },
  es: {
    welcome: 'Bienvenido',
    goodbye: 'Adiós',
  },
};

export default messages;`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(content).toContain('"it"');
    expect(content).toContain('"fr"');
    expect(content).toContain('[it] Welcome');
    expect(content).toContain('[fr] Welcome');
    // Existing Spanish locale should be preserved
    expect(content).toContain('"es"');
    expect(content).toContain('Bienvenido');
  });

  it('should add keys to existing locales when source is changed in single file', async () => {
    // Set up TypeScript repository with existing locales
    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
    en: {
      welcome: 'Welcome'
    },
  };

export default messages;`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(content).not.toContain('[it] Goodbye');
    expect(content).not.toContain('[fr] Goodbye');

    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
    en: {
      welcome: 'Welcome',
      goodbye: 'Goodbye'
    },
  };
export default messages;`
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newContent = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(newContent).toContain('[it] Welcome');
    expect(newContent).toContain('[it] Goodbye');
    expect(newContent).toContain('[fr] Welcome');
    expect(newContent).toContain('[fr] Goodbye');
  });

  it('should remove keys from existing locales when source is changed in single file', async () => {
    // Set up TypeScript repository with existing locales
    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
    en: {
      welcome: 'Welcome',
      goodbye: 'Goodbye'
    },
  };

  export default messages;`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(content).toContain('[it] Goodbye');
    expect(content).toContain('[fr] Goodbye');

    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
    en: {
      welcome: 'Welcome'
    },
  };

  export default messages;`
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const newContent = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(newContent).toContain('[it] Welcome');
    expect(newContent).not.toContain('[it] Goodbye');
    expect(newContent).toContain('[fr] Welcome');
    expect(newContent).not.toContain('[fr] Goodbye');
  });

  it('should maintain the same order of keys in existing locales', async () => {
    // Set up TypeScript repository with existing locales
    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
    en: {
      welcome: 'Welcome',
      goodbye: 'Goodbye'
    },
  };
  export default messages;`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations and order of keys
    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');

    // Safely extract messages object using Babel parser instead of eval()
    const messages = safelyExtractMessagesObject(content);
    expect(messages).toBeTruthy();
    expect(messages).not.toBeNull();

    // Check order for each locale
    const checkOrder = (obj: Record<string, unknown>, expectedOrder: string[]) => {
      const keys = Object.keys(obj);
      expect(keys).toEqual(expectedOrder);
    };

    // English is original
    checkOrder(messages!.en as Record<string, unknown>, ['welcome', 'goodbye']);
    // Check that Italian and French (if added) maintain the key order
    if (messages!.it) checkOrder(messages!.it as Record<string, unknown>, ['welcome', 'goodbye']);
    if (messages!.fr) checkOrder(messages!.fr as Record<string, unknown>, ['welcome', 'goodbye']);

    // Still check translation strings
    expect((messages!.it as Record<string, string>).welcome).toContain('[it]');
    expect((messages!.it as Record<string, string>).goodbye).toContain('[it]');
    expect((messages!.fr as Record<string, string>).welcome).toContain('[fr]');
    expect((messages!.fr as Record<string, string>).goodbye).toContain('[fr]');
  });

  it('should handle empty message object', async () => {

    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      'const messages = {}'
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translations
    const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
    expect(content).toEqual('const messages = {}');

  });

  it('should handle invalid json syntax', async () => {
    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await mkdir(path.join(testDir, 'src'), { recursive: true });
    await writeFile(
      path.join(testDir, 'src', 'i18n.ts'),
      `const messages = {
    en: {
      invalid element,
      goodbye: 'Goodbye'
    },
  };
  export default messages;`
    );

    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it,fr',
      '--paths',
      'src/i18n.ts',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify error and console output
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse messages object in TS file'),
      expect.any(String)
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

});