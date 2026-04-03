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
import { parseArgs } from './cli';
import type { CLIOptions } from './cli';

async function main() {
  const { message, options } = parseArgs();

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

main();
