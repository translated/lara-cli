import { Command } from 'commander';

export class CommandUtils {
  public static isRunningInInteractiveMode(command: Command) {
    return command.parent?.opts().nonInteractive === false;
  }
}
