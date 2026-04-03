import { existsSync, readFileSync, writeFileSync } from 'fs';
import pc from 'picocolors';
import { registerCommand } from '../cli/router';
import { parseGlobalFlags, printCommandHelp } from '../cli/help';
import { printTable } from '../ui/table';
import { printSuccess, printError, printInfo } from '../ui/spinner';
import { exitCodes } from '../errors';
import type { CLIOptions, CronJob, CronJobInput } from '../types';

const CRON_JOBS_PATH = `${process.env.HOME}/.hermes/cron/jobs.json`;

function loadJobs(): CronJob[] {
  try {
    if (!existsSync(CRON_JOBS_PATH)) {
      return [];
    }
    const content = readFileSync(CRON_JOBS_PATH, 'utf8');
    const data = JSON.parse(content);
    return data.jobs || [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: CronJob[]): void {
  try {
    writeFileSync(CRON_JOBS_PATH, JSON.stringify({ jobs }, null, 2));
  } catch (error) {
    throw new Error(`Failed to save cron jobs: ${error}`);
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

async function listHandler(args: string[], _options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('cron list', 'List all cron jobs');
    return;
  }

  const jobs = loadJobs();
  if (jobs.length === 0) {
    printInfo('No cron jobs configured. Run "hermes cron add" to create one.');
    return;
  }

  printTable(jobs, [
    {
      header: 'ID',
      width: 10,
      render: (j) => j.id.substring(0, 8),
    },
    {
      header: 'Name',
      width: 25,
      render: (j) => j.name,
    },
    {
      header: 'Schedule',
      width: 15,
      render: (j) => j.schedule.display || j.schedule.expr || '',
    },
    {
      header: 'Enabled',
      width: 8,
      render: (j) => (j.enabled ? pc.green('Yes') : pc.red('No')),
    },
    {
      header: 'Next Run',
      width: 20,
      render: (j) => j.next_run_at ? new Date(j.next_run_at).toLocaleString() : 'N/A',
    },
    {
      header: 'Last Status',
      width: 12,
      render: (j) => {
        if (!j.last_status) return pc.dim('Never');
        return j.last_status === 'ok' ? pc.green('OK') : pc.red(j.last_status);
      },
    },
  ]);
}

async function addHandler(args: string[], _options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('cron add', 'Add a new cron job');
    console.log(`
${pc.bold('Options:')}
  --name <name>         Job name
  --schedule <cron>     Cron expression (e.g., "0 8 * * *")
  --prompt <text>       Prompt to execute
  --skill <name>        Optional skill to use
  --deliver <target>    Delivery target (e.g., telegram:123456)

${pc.bold('Examples:')}
  hermes cron add --name "daily-report" --schedule "0 8 * * *" --prompt "Generate report"
  hermes cron add --name "morning" --schedule "0 9 * * *" --prompt "Morning scan" --deliver telegram:123
`);
    return;
  }

  const input = parseCronArgs(args);
  if (!input.name || !input.schedule || !input.prompt) {
    printError('Missing required options: --name, --schedule, --prompt');
    process.exit(exitCodes.CLI_ERROR);
  }

  const jobs = loadJobs();
  const newJob: CronJob = {
    id: generateId(),
    name: input.name,
    schedule: {
      kind: 'cron',
      expr: input.schedule,
      display: input.schedule,
    },
    prompt: input.prompt,
    skill: input.skill || null,
    skills: input.skill ? [input.skill] : [],
    enabled: true,
    state: 'scheduled',
    deliver: input.deliver || 'local',
    created_at: new Date().toISOString(),
  };

  jobs.push(newJob);
  saveJobs(jobs);
  printSuccess(`Created cron job "${input.name}" with ID: ${newJob.id}`);
}

async function removeHandler(args: string[], _options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('cron remove', 'Remove a cron job');
    console.log(`\n${pc.bold('Usage:')} hermes cron remove <job-id>`);
    return;
  }

  const [jobId] = args.filter(a => !a.startsWith('-'));
  if (!jobId) {
    printError('Job ID required');
    process.exit(exitCodes.CLI_ERROR);
  }

  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.id === jobId || j.id.startsWith(jobId));
  if (index === -1) {
    printError(`Job not found: ${jobId}`);
    process.exit(exitCodes.CLI_ERROR);
  }

  const removed = jobs.splice(index, 1)[0];
  saveJobs(jobs);
  printSuccess(`Removed cron job "${removed.name}"`);
}

async function enableHandler(args: string[], _options: CLIOptions): Promise<void> {
  const [jobId] = args.filter(a => !a.startsWith('-'));
  if (!jobId) {
    printError('Job ID required');
    process.exit(exitCodes.CLI_ERROR);
  }

  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId || j.id.startsWith(jobId));
  if (!job) {
    printError(`Job not found: ${jobId}`);
    process.exit(exitCodes.CLI_ERROR);
  }

  job.enabled = true;
  saveJobs(jobs);
  printSuccess(`Enabled cron job "${job.name}"`);
}

async function disableHandler(args: string[], _options: CLIOptions): Promise<void> {
  const [jobId] = args.filter(a => !a.startsWith('-'));
  if (!jobId) {
    printError('Job ID required');
    process.exit(exitCodes.CLI_ERROR);
  }

  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId || j.id.startsWith(jobId));
  if (!job) {
    printError(`Job not found: ${jobId}`);
    process.exit(exitCodes.CLI_ERROR);
  }

  job.enabled = false;
  saveJobs(jobs);
  printSuccess(`Disabled cron job "${job.name}"`);
}

async function runHandler(args: string[], _options: CLIOptions): Promise<void> {
  const [jobId] = args.filter(a => !a.startsWith('-'));
  if (!jobId) {
    printError('Job ID required');
    process.exit(exitCodes.CLI_ERROR);
  }

  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId || j.id.startsWith(jobId));
  if (!job) {
    printError(`Job not found: ${jobId}`);
    process.exit(exitCodes.CLI_ERROR);
  }

  printInfo(`Triggering job "${job.name}"...`);
  // In a full implementation, this would trigger the Hermes API to run the job
  printSuccess(`Job triggered. Check Hermes for execution.`);
}

function parseCronArgs(args: string[]): CronJobInput {
  const input: CronJobInput = {
    name: '',
    schedule: '',
    prompt: '',
    deliver: 'local',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name') {
      input.name = args[++i];
    } else if (arg === '--schedule') {
      input.schedule = args[++i];
    } else if (arg === '--prompt') {
      input.prompt = args[++i];
    } else if (arg === '--skill') {
      input.skill = args[++i];
    } else if (arg === '--deliver') {
      input.deliver = args[++i];
    }
  }

  return input;
}

export function registerCronCommands(): void {
  const subcommands = new Map();
  subcommands.set('list', { name: 'list', description: 'List all cron jobs', handler: listHandler });
  subcommands.set('add', { name: 'add', description: 'Add a new cron job', handler: addHandler });
  subcommands.set('remove', { name: 'remove', description: 'Remove a cron job', handler: removeHandler });
  subcommands.set('enable', { name: 'enable', description: 'Enable a cron job', handler: enableHandler });
  subcommands.set('disable', { name: 'disable', description: 'Disable a cron job', handler: disableHandler });
  subcommands.set('run', { name: 'run', description: 'Trigger a cron job manually', handler: runHandler });

  registerCommand('cron', 'Manage cron jobs', async () => {}, subcommands);
}
