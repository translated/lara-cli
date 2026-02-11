import { vi } from 'vitest';
import { Command, Option } from 'commander';

// Mock translation service
vi.mock('#modules/translation/translation.service.js', () => {
  return {
    TranslationService: {
      getInstance: vi.fn(() => ({
        translate: vi.fn(async (textBlocks, _sourceLocale, targetLocale) => {
          // Return mock translations based on target locale
          return textBlocks.map((block: { text: string; translatable: boolean }) => ({
            text: block.translatable
              ? `[${targetLocale}] ${block.text}`
              : block.text,
            translatable: block.translatable,
          }));
        }),
      })),
    },
  };
});

// Helper function to execute a command
export async function executeCommand(command: Command, args: string[]): Promise<void> {
  if (!command) {
    throw new Error('Command is undefined');
  }

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number): never => {
    if (code !== undefined && code !== 0) {
      throw new Error(`Process exited with code ${code}`);
    }
    throw new Error('Process exited');
  });

  try {
    // Get command name - try both method and property access
    const commandName = typeof command.name === 'function' ? command.name() : (command as any)._name || 'unknown';
    
    // Create a parent command to match the CLI structure
    // The non-interactive flag defaults to false, so we need to explicitly set it
    const parentCommand = new Command()
      .name('lara-cli')
      .addOption(new Option('-y --non-interactive', 'Run in non-interactive mode').default(false));
    
    // Remove command from its current parent if it has one (to avoid conflicts)
    if ((command as any).parent) {
      try {
        (command as any).parent.removeCommand(commandName);
      } catch {
        // Ignore if removal fails
      }
    }
    
    // Add the command to the new parent
    parentCommand.addCommand(command);
    
    // Parse with non-interactive flag set to true (via -y)
    // Commander.js parseAsync expects just the arguments (command name + options)
    await parentCommand.parseAsync(['-y', commandName, ...args], { from: 'user' });
  } finally {
    exitSpy.mockRestore();
  }
}
