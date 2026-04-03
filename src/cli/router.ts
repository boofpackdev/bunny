import { exitCodes } from '../errors';
import { printHelp, parseGlobalFlags } from './help';
import type { CLIOptions } from '../types';

export type CommandHandler = (args: string[], options: CLIOptions) => Promise<void>;

interface CommandDef {
  name: string;
  description: string;
  handler: CommandHandler;
  subcommands?: Map<string, CommandDef>;
}

const commands = new Map<string, CommandDef>();

export function registerCommand(
  name: string,
  description: string,
  handler: CommandHandler,
  subcommands?: Map<string, CommandDef>
): void {
  commands.set(name, { name, description, handler, subcommands });
}

export async function runCommand(argv: string[]): Promise<void> {
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') {
    printHelp();
    process.exit(exitCodes.SUCCESS);
  }

  const [cmd, ...rest] = argv;
  const command = commands.get(cmd);

  if (!command) {
    console.error(`Unknown command: ${cmd}`);
    console.error(`Run 'hermes help' for usage information.`);
    process.exit(exitCodes.CLI_ERROR);
  }

  // Handle subcommands
  if (command.subcommands && rest.length > 0) {
    const subCmd = rest[0];
    
    // Check for help on the command group
    if (subCmd === 'help' || subCmd === '--help' || subCmd === '-h') {
      const { printCommandHelp } = await import('./help');
      // Print help for all subcommands
      console.log(`\n${command.name} subcommands:\n`);
      for (const [name, sub] of command.subcommands) {
        console.log(`  ${name}  - ${sub.description}`);
      }
      console.log(`\nRun 'hermes ${cmd} <subcommand> --help' for more info.`);
      process.exit(exitCodes.SUCCESS);
    }
    
    const subcommand = command.subcommands.get(subCmd);
    if (!subcommand) {
      console.error(`Unknown subcommand: ${cmd} ${subCmd}`);
      console.error(`Run 'hermes ${cmd} help' for usage information.`);
      process.exit(exitCodes.CLI_ERROR);
    }
    await subcommand.handler(rest.slice(1), parseGlobalFlags(rest.slice(1)));
    return;
  }

  // Check for help on command
  if (rest.includes('--help') || rest.includes('-h')) {
    const { printCommandHelp } = await import('./help');
    printCommandHelp(command.name, command.description);
    process.exit(exitCodes.SUCCESS);
  }

  await command.handler(rest, parseGlobalFlags(rest));
}

export function getCommands(): Map<string, CommandDef> {
  return commands;
}
