import { exec, spawn } from 'child_process';
import pc from 'picocolors';
import { registerCommand } from '../cli/router';
import { parseGlobalFlags, printCommandHelp } from '../cli/help';
import { printSuccess, printError, printInfo, startSpinner, succeedSpinner, failSpinner } from '../ui/spinner';
import { exitCodes } from '../errors';
import type { CLIOptions, AgentOptions } from '../types';

async function execHandler(args: string[], options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('agent exec', 'Spawn a droid agent');
    console.log(`
${pc.bold('Options:')}
  --cwd <dir>           Working directory
  --auto <level>        Autonomy level: low, medium, high
  -m, --model <name>    Model to use
      --json            JSON output

${pc.bold('Examples:')}
  hermes agent exec "Fix the login bug" --auto low
  hermes agent exec "Review my code" --cwd /path/to/project --auto medium
  hermes agent exec "Build the project" --auto high
`);
    return;
  }

  const prompt = args.filter(a => !a.startsWith('-')).join(' ');
  if (!prompt) {
    printError('Prompt required');
    process.exit(exitCodes.CLI_ERROR);
  }

  // Parse agent options
  let cwd = process.cwd();
  let autoLevel = 'medium';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--cwd') {
      cwd = args[++i];
    } else if (arg === '--auto') {
      autoLevel = args[++i] || 'medium';
    }
  }

  startSpinner(`Spawning droid agent in ${cwd}...`);

  // Build droid command
  const droidArgs = [
    'exec',
    '--auto', autoLevel,
    '--cwd', cwd,
  ];

  if (options.model) {
    droidArgs.push('--model', options.model);
  }

  if (options.json) {
    droidArgs.push('-o', 'json');
  }

  droidArgs.push('--', prompt);

  return new Promise((resolve, reject) => {
    const droid = spawn('droid', droidArgs, {
      stdio: 'inherit',
      shell: true,
    });

    droid.on('close', (code) => {
      if (code === 0) {
        succeedSpinner('Agent completed');
        process.exit(exitCodes.SUCCESS);
      } else {
        failSpinner(`Agent exited with code ${code}`);
        process.exit(code || exitCodes.CLI_ERROR);
      }
      resolve();
    });

    droid.on('error', (err) => {
      failSpinner(`Failed to spawn droid: ${err.message}`);
      printError('Make sure droid is installed: curl -fsSL https://factory.ai/droid/install.sh | sh');
      process.exit(exitCodes.CLI_ERROR);
      reject(err);
    });
  });
}

async function listHandler(_args: string[], _options: CLIOptions): Promise<void> {
  if (_args.includes('--help') || _args.includes('-h')) {
    printCommandHelp('agent list', 'List running agents');
    return;
  }

  printInfo('Checking for running droid agents...');

  return new Promise((resolve) => {
    exec('ps aux | grep "droid exec" | grep -v grep', (err, stdout) => {
      if (err || !stdout.trim()) {
        printInfo('No running agents found');
        process.exit(exitCodes.SUCCESS);
      }

      console.log(pc.bold('\nRunning Agents:\n'));
      console.log(stdout);
      resolve();
    });
  });
}

async function killHandler(args: string[], _options: CLIOptions): Promise<void> {
  const [pid] = args.filter(a => !a.startsWith('-'));
  if (!pid) {
    printError('Process ID required');
    process.exit(exitCodes.CLI_ERROR);
  }

  try {
    process.kill(parseInt(pid, 10), 'SIGTERM');
    printSuccess(`Killed agent process ${pid}`);
  } catch {
    printError(`Failed to kill process ${pid}`);
    process.exit(exitCodes.CLI_ERROR);
  }
}

export function registerAgentCommands(): void {
  const subcommands = new Map();
  subcommands.set('exec', { name: 'exec', description: 'Spawn a droid agent', handler: execHandler });
  subcommands.set('list', { name: 'list', description: 'List running agents', handler: listHandler });
  subcommands.set('kill', { name: 'kill', description: 'Kill a running agent', handler: killHandler });

  registerCommand('agent', 'Manage droid agents', async () => {}, subcommands);
}
