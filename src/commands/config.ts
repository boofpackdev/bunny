import pc from 'picocolors';
import { registerCommand } from '../cli/router';
import { parseGlobalFlags, printCommandHelp } from '../cli/help';
import { printSuccess, printError, printInfo } from '../ui/spinner';
import { getConfigStore } from '../config/store';
import { exitCodes } from '../errors';
import type { CLIOptions } from '../types';

async function getHandler(args: string[], _options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('config get', 'Get a config value');
    console.log(`\n${pc.bold('Usage:')} hermes config get <key>`);
    return;
  }

  const [key] = args.filter(a => !a.startsWith('-'));
  if (!key) {
    printError('Config key required');
    process.exit(exitCodes.CLI_ERROR);
  }

  const store = getConfigStore();
  const value = store.get(key as any);

  if (value === undefined) {
    printInfo(`"${key}" is not set`);
  } else {
    console.log(value);
  }
}

async function setHandler(args: string[], _options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('config set', 'Set a config value');
    console.log(`
${pc.bold('Options:')}
  --endpoint <url>    Default Hermes endpoint
  --model <name>      Default model
  --channel <target>   Default delivery channel
  --timeout <ms>      Default timeout

${pc.bold('Examples:')}
  hermes config set --endpoint http://localhost:8642
  hermes config set --model glm-4
  hermes config set --timeout 60000
`);
    return;
  }

  const store = getConfigStore();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--endpoint') {
      store.set('defaultEndpoint', args[++i]);
    } else if (arg === '--model') {
      store.set('defaultModel', args[++i]);
    } else if (arg === '--channel') {
      store.set('deliveryChannel', args[++i]);
    } else if (arg === '--timeout') {
      store.set('timeout', parseInt(args[++i], 10));
    } else if (arg === '--stream') {
      store.set('autoStream', args[i + 1] !== 'false');
      i++;
    }
  }

  printSuccess('Config updated');
}

async function listHandler(_args: string[], _options: CLIOptions): Promise<void> {
  const store = getConfigStore();
  const config = store.list();

  console.log(pc.bold('\nHermes CLI Config:\n'));
  for (const [key, value] of Object.entries(config)) {
    const displayValue = value === undefined ? pc.dim('<not set>') : String(value);
    console.log(`  ${pc.blue(key.padEnd(20))} ${displayValue}`);
  }
  console.log();
}

async function unsetHandler(args: string[], _options: CLIOptions): Promise<void> {
  const [key] = args.filter(a => !a.startsWith('-'));
  if (!key) {
    printError('Config key required');
    process.exit(exitCodes.CLI_ERROR);
  }

  const store = getConfigStore();
  store.unset(key as any);
  printSuccess(`"${key}" reset to default`);
}

export function registerConfigCommands(): void {
  const subcommands = new Map();
  subcommands.set('get', { name: 'get', description: 'Get a config value', handler: getHandler });
  subcommands.set('set', { name: 'set', description: 'Set a config value', handler: setHandler });
  subcommands.set('list', { name: 'list', description: 'List all config', handler: listHandler });
  subcommands.set('unset', { name: 'unset', description: 'Unset a config value', handler: unsetHandler });

  registerCommand('config', 'Manage CLI configuration', async () => {}, subcommands);
}
