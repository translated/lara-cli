import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { executeCommand } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  
//   it('should handle ts files with locales in different files', async () => {
//     // Set up TypeScript repository with existing locales
//     await mkdir(path.join(testDir, 'src', 'i18n', 'en'), { recursive: true });
//     await writeFile(
//       path.join(testDir, 'src', 'i18n', 'en', 'example.ts'),
//       `const messages = {
//   welcome: 'Welcome',
//   goodbye: 'Goodbye'
// };
// export default messages;`
//     );

//     await executeCommand(initCommand, [
//       '--non-interactive',
//       '--source',
//       'en',
//       '--target',
//       'it,fr',
//       '--paths',
//       'src/i18n/[locale]/example.ts',
//     ]);

//     (ConfigProvider as any).instance = null;

//     // Translate
//     await executeCommand(translateCommand, []);

//     // Verify translations
//     const itContent = await readFile(path.join(testDir, 'src', 'i18n', 'it', 'example.ts'), 'utf-8');
//     const frContent = await readFile(path.join(testDir, 'src', 'i18n', 'fr', 'example.ts'), 'utf-8');
//     expect(itContent).toContain('[it] Welcome');
//     expect(itContent).toContain('[it] Goodbye');
//     expect(frContent).toContain('[fr] Welcome');
//     expect(frContent).toContain('[fr] Goodbye');
//   });

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

  // TODO: Add multiple files feature
//   it('should add keys to existing locales when source is changed in multiple files', async () => {
//     // Set up TypeScript repository with existing locales
//     await mkdir(path.join(testDir, 'src', 'i18n', 'en'), { recursive: true });
//     await writeFile(
//       path.join(testDir, 'src', 'i18n', 'en', 'example.ts'),
//       `const messages = {
//     welcome: 'Welcome',
//   };
// export default messages;`
//     );

//     await executeCommand(initCommand, [
//       '--non-interactive',
//       '--source', 
//       'en',
//       '--target',
//       'it,fr',
//       '--paths',
//       'src/i18n/[locale]/example.ts', 
//     ]);

//     (ConfigProvider as any).instance = null;

//     // Translate
//     await executeCommand(translateCommand, []);

//     // Verify translations
//     const itContent = await readFile(path.join(testDir, 'src', 'i18n', 'it', 'example.ts'), 'utf-8');
//     const frContent = await readFile(path.join(testDir, 'src', 'i18n', 'fr', 'example.ts'), 'utf-8');
//     expect(itContent).not.toContain('[it] Goodbye');
//     expect(frContent).not.toContain('[fr] Goodbye');

//     await writeFile(
//       path.join(testDir, 'src', 'i18n', 'en', 'example.ts'),
//       `const messages = {
//     welcome: 'Welcome',
//     goodbye: 'Goodbye'
//   };
// export default messages;`
//     );

//     // Translate
//     await executeCommand(translateCommand, []);

//     // Verify translations
//     const newItContent = await readFile(path.join(testDir, 'src', 'i18n', 'it', 'example.ts'), 'utf-8');
//     const newFrContent = await readFile(path.join(testDir, 'src', 'i18n', 'fr', 'example.ts'), 'utf-8');
//     expect(newItContent).toContain('[it] Welcome');
//     expect(newItContent).toContain('[it] Goodbye');
//     expect(newFrContent).toContain('[fr] Welcome');
//     expect(newFrContent).toContain('[fr] Goodbye');
//   });

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

  // TODO: Add multiple files feature
//   it('should remove keys from existing locales when source is changed in multiple files', async () => {
//     // Set up TypeScript repository with existing locales
//     await mkdir(path.join(testDir, 'src', 'i18n', 'en'), { recursive: true });
//     await writeFile(
//       path.join(testDir, 'src', 'i18n', 'en', 'example.ts'),
//       `const messages = {
//     welcome: 'Welcome',
//     goodbye: 'Goodbye'
//   };
// export default messages;`
//     );

//     await executeCommand(initCommand, [
//       '--non-interactive',
//       '--source', 
//       'en',
//       '--target',
//       'it,fr',
//       '--paths',
//       'src/i18n/[locale]/example.ts', 
//     ]);

//     (ConfigProvider as any).instance = null;

//     // Translate
//     await executeCommand(translateCommand, []);

//     // Verify translations
//     const itContent = await readFile(path.join(testDir, 'src', 'i18n', 'it', 'example.ts'), 'utf-8');
//     const frContent = await readFile(path.join(testDir, 'src', 'i18n', 'fr', 'example.ts'), 'utf-8');
//     expect(itContent).toContain('[it] Goodbye');
//     expect(frContent).toContain('[fr] Goodbye');

//     await writeFile(
//       path.join(testDir, 'src', 'i18n', 'en', 'example.ts'),
//       `const messages = {
//     welcome: 'Welcome'
//   };
// export default messages;`
//     );

//     // Translate
//     await executeCommand(translateCommand, []);

//     // Verify translations
//     const newItContent = await readFile(path.join(testDir, 'src', 'i18n', 'it', 'example.ts'), 'utf-8');
//     const newFrContent = await readFile(path.join(testDir, 'src', 'i18n', 'fr', 'example.ts'), 'utf-8');
//     expect(newItContent).toContain('[it] Welcome');
//     expect(newItContent).not.toContain('[it] Goodbye');
//     expect(newFrContent).toContain('[fr] Welcome');
//     expect(newFrContent).not.toContain('[fr] Goodbye');
//   });

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

    const messagesMatch = content.match(/const messages = ({[\s\S]*?});/);
    expect(messagesMatch).toBeTruthy();

    // eslint-disable-next-line no-new-func
    const messages = (0, eval)(`(${messagesMatch![1]})`);

    // Check order for each locale
    const checkOrder = (obj: Record<string, string>, expectedOrder: string[]) => {
      const keys = Object.keys(obj);
      expect(keys).toEqual(expectedOrder);
    };

    // English is original
    checkOrder(messages.en, ['welcome', 'goodbye']);
    // Check that Italian and French (if added) maintain the key order
    if (messages.it) checkOrder(messages.it, ['welcome', 'goodbye']);
    if (messages.fr) checkOrder(messages.fr, ['welcome', 'goodbye']);

    // Still check translation strings
    expect(messages.it.welcome).toContain('[it]');
    expect(messages.it.goodbye).toContain('[it]');
    expect(messages.fr.welcome).toContain('[fr]');
    expect(messages.fr.goodbye).toContain('[fr]');
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

  // TODO: Fix empty file handling
  // it('should handle gracefully empty files', async () => {

  //   await mkdir(path.join(testDir, 'src'), { recursive: true });
  //   await writeFile(
  //     path.join(testDir, 'src', 'i18n.ts'),
  //     ''
  //   );

  //   await executeCommand(initCommand, [
  //     '--non-interactive',
  //     '--source',
  //     'en',
  //     '--target',
  //     'it,fr',
  //     '--paths',
  //     'src/i18n.ts',
  //   ]);

  //   (ConfigProvider as any).instance = null;

  //   // Translate
  //   await executeCommand(translateCommand, []);

  //   // Verify translations
  //   const content = await readFile(path.join(testDir, 'src', 'i18n.ts'), 'utf-8');
  //   expect(content).toEqual('const messages = {}');
  // });

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