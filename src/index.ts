import { resolveConfig } from './config';
import { streamChat } from './stream';
import {
  startSpinner,
  succeedSpinner,
  failSpinner,
  streamStart,
  printError,
} from './ui';
import { HermesError, exitCodes } from './errors';
import { setupCLI } from './cli';
import type { CLIOptions } from './cli';

async function main() {
  const cli = setupCLI();
  cli.parse(process.argv);

  const parsed = cli.parse(process.argv);

  if (!parsed.command) {
    cli.outputHelp();
    process.exit(exitCodes.CLI_ERROR);
  }

  const { message, options } = parsed.command as unknown as {
    message: string;
    options: CLIOptions;
  };

  const stream = options.stream ?? true;
  const jsonOutput = options.json ?? false;
  const timeout = options.timeout ?? 120000;

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
    });

    succeedSpinner('Response complete');
    process.exit(exitCodes.SUCCESS);
  } catch (error: unknown) {
    if (error instanceof HermesError) {
      failSpinner(error.message);
      process.exit(error.code);
    }

    failSpinner('Unknown error');
    printError(error instanceof Error ? error.message : String(error));
    process.exit(exitCodes.CLI_ERROR);
  }
}

// Bootstrap
main();
