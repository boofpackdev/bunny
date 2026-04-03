import { exitCodes } from './errors';

export interface CLIOptions {
  endpoint?: string;
  json: boolean;
  stream: boolean;
  timeout: number;
}

function parseArgs(): { message?: string; options: CLIOptions } {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    json: false,
    stream: true,
    timeout: 120000,
  };

  if (args.length === 0) {
    printHelp();
    process.exit(exitCodes.CLI_ERROR);
  }

  // Parse flags
  const remaining: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--no-stream') {
      options.stream = false;
    } else if (arg === '--endpoint' || arg === '-e') {
      options.endpoint = args[++i];
    } else if (arg === '--timeout' || arg === '-t') {
      options.timeout = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      remaining.push(arg);
    }
  }

  const message = remaining.join(' ');

  if (!message) {
    console.error('Error: No message provided');
    printHelp();
    process.exit(exitCodes.CLI_ERROR);
  }

  return { message, options };
}

function printHelp() {
  console.log(`
Hermes CLI - Universal client for Dockerized Hermes Agent

Usage:
  hermes <message> [options]

Options:
  -e, --endpoint <url>   Hermes endpoint (overrides auto-discovery)
      --json             Output raw JSON response
      --no-stream        Disable streaming
  -t, --timeout <ms>     Request timeout (default: 120000)
  -h, --help            Show this help

Examples:
  hermes "Hello, Hermes!"
  hermes "What's 2+2?" --no-stream
  hermes "Explain AI" -e http://localhost:9000
`);
}

export { parseArgs };
