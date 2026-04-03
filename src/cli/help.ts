import pc from 'picocolors';
import { getCommands } from './router';
import type { CLIOptions } from '../types';

export function parseGlobalFlags(args: string[]): CLIOptions {
  const options: CLIOptions = {
    json: false,
    stream: true,
    timeout: 120000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--no-stream') {
      options.stream = false;
    } else if (arg === '--endpoint' || arg === '-e') {
      options.endpoint = args[++i];
    } else if (arg === '--timeout' || arg === '-t') {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--model' || arg === '-m') {
      options.model = args[++i];
    }
  }

  return options;
}

export function printHelp(): void {
  const lines: string[] = [
    '',
    pc.bold(pc.cyan('Hermes CLI')) + ' - Universal client for Dockerized Hermes Agent',
    '',
    pc.bold('Usage:'),
    '  hermes <command> [subcommand] [options]',
    '',
    pc.bold('Commands:'),
  ];

  const commands = getCommands();
  for (const [name, cmd] of commands) {
    if (cmd.subcommands) {
      lines.push('  ' + pc.green(name) + '           ' + cmd.description);
      for (const [subName, subCmd] of cmd.subcommands) {
        lines.push('    ' + pc.green(name) + ' ' + pc.blue(subName) + '   ' + subCmd.description);
      }
    } else {
      lines.push('  ' + pc.green(name) + '           ' + cmd.description);
    }
  }

  lines.push(
    '',
    pc.bold('Global Options:'),
    '  -e, --endpoint <url>   Hermes endpoint (overrides auto-discovery)',
    '  -m, --model <name>     Model to use',
    '      --json             Output raw JSON response',
    '      --no-stream        Disable streaming',
    '  -t, --timeout <ms>     Request timeout (default: 120000)',
    '  -h, --help             Show this help',
    '',
    pc.bold('Examples:'),
    '  hermes ask "Hello, Hermes!"',
    '  hermes ask "What\'s 2+2?" --no-stream',
    '  hermes cron list',
    '  hermes cron add --name "my-job" --schedule "0 8 * * *" --prompt "Daily report"',
    '  hermes config get defaultEndpoint',
    '  hermes agent exec "Fix the bug" --auto low',
    '',
    pc.bold('For more information:'),
    '  hermes <command> --help',
    ''
  );

  console.log(lines.join('\n'));
}

export function printCommandHelp(name: string, description: string): void {
  console.log([
    '',
    pc.bold(pc.cyan('hermes ' + name)) + ' - ' + description,
    '',
    pc.bold('Usage:'),
    '  hermes ' + name + ' [options]',
    ''
  ].join('\n'));
}
