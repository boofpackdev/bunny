import { cac } from 'cac';
import { exitCodes } from './errors';

export interface CLIOptions {
  endpoint?: string;
  json: boolean;
  stream: boolean;
  timeout: number;
}

export function setupCLI() {
  const cli = cac('hermes');

  cli
    .command('chat <message>', 'Send a message to a Dockerized Hermes Agent')
    .option('-e, --endpoint <url>', 'Hermes endpoint URL (overrides auto-discovery)')
    .option('--json', 'Output raw JSON response')
    .option('--no-stream', 'Disable streaming, wait for full response')
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', {
      default: 120000,
    })
    .example('hermes chat "Hello, Hermes!"')
    .example('hermes chat "What is 2+2?" --no-stream')
    .example('hermes chat "Explain AI" -e http://localhost:9000')
    .action((message: string, options: CLIOptions) => {
      return { message, options };
    });

  cli.help();

  return cli;
}

export function parseCLI() {
  const cli = setupCLI();
  const rawArgs = process.argv.slice(2);

  // Handle empty args
  if (rawArgs.length === 0) {
    cli.outputHelp();
    process.exit(exitCodes.CLI_ERROR);
  }

  try {
    const parsed = cli.parse(rawArgs);
    return parsed;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(exitCodes.CLI_ERROR);
  }
}
