import pc from 'picocolors';
import { resolveConfig } from '../api/client';
import { streamChat } from './stream';
import {
  startSpinner,
  succeedSpinner,
  failSpinner,
  streamStart,
  printError,
} from '../ui/spinner';
import { HermesError, exitCodes } from '../errors';
import { printCommandHelp } from '../cli/help';
import { registerCommand } from '../cli/router';
import type { CLIOptions } from '../types';

async function askHandler(args: string[], options: CLIOptions): Promise<void> {
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('ask', 'Chat with Hermes agent');
    console.log([
      '',
      pc.bold('Options:'),
      '  -e, --endpoint <url>   Hermes endpoint',
      '  -m, --model <name>     Model to use',
      '      --json             Output raw JSON',
      '      --no-stream        Disable streaming',
      '  -t, --timeout <ms>    Timeout (default: 120000)',
      '',
      pc.bold('Examples:'),
      '  hermes ask "Hello, Hermes!"',
      '  hermes ask "What\'s 2+2?" --no-stream',
      '  hermes ask "Explain AI" -m glm-4',
      ''
    ].join('\n'));
    return;
  }

  const message = args.filter(a => !a.startsWith('-')).join(' ');
  if (!message) {
    printError('No message provided');
    process.exit(exitCodes.CLI_ERROR);
  }

  const stream = options.stream;
  const jsonOutput = options.json;
  const timeout = options.timeout;

  startSpinner('Discovering Hermes endpoint...');

  try {
    let endpoint = options.endpoint;
    let auth: string | undefined;

    if (!endpoint) {
      const resolved = await resolveConfig();
      endpoint = resolved.endpoint;
      auth = resolved.auth;
    }

    succeedSpinner(`Connected to ${endpoint}`);
    startSpinner('Waiting for response...');

    streamStart();

    await streamChat(message, {
      endpoint,
      stream,
      jsonOutput,
      timeout,
      auth,
      model: options.model,
    });

    succeedSpinner('Response complete');
    process.exit(exitCodes.SUCCESS);
  } catch (error) {
    if (error instanceof HermesError) {
      failSpinner(error.message);
      process.exit(error.code);
    }

    failSpinner('Unknown error');
    printError(error instanceof Error ? error.message : String(error));
    process.exit(exitCodes.CLI_ERROR);
  }
}

export function registerAskCommand(): void {
  registerCommand('ask', 'Chat with Hermes agent', askHandler);
}
