import { exitCodes } from './errors';
import { runCommand } from './cli/router';
import { registerAskCommand } from './commands/ask';
import { registerCronCommands } from './commands/cron';
import { registerConfigCommands } from './commands/config';
import { registerAgentCommands } from './commands/agent';
import { registerInitCommand } from './commands/init';

// Register all commands
registerAskCommand();
registerCronCommands();
registerConfigCommands();
registerAgentCommands();
registerInitCommand();

// Main entry point
async function main() {
  try {
    await runCommand(process.argv.slice(2));
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(exitCodes.CLI_ERROR);
  }
}

main();
