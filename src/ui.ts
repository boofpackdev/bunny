import pc from 'picocolors';
import ora, { type Ora } from 'ora';

export type UIState = 'idle' | 'connecting' | 'streaming' | 'success' | 'error';

let spinner: Ora | null = null;

export function startSpinner(text: string): void {
  spinner = ora({
    text: pc.dim(text),
    color: 'cyan',
  }).start();
}

export function succeedSpinner(text: string): void {
  if (spinner) {
    spinner.succeed(pc.green(text));
    spinner = null;
  }
}

export function failSpinner(text: string): void {
  if (spinner) {
    spinner.fail(pc.red(text));
    spinner = null;
  }
}

export function warnSpinner(text: string): void {
  if (spinner) {
    spinner.warn(pc.yellow(text));
    spinner = null;
  }
}

export function streamStart(): void {
  process.stdout.write(pc.dim('\n'));
}

export function streamEnd(): void {
  // Called when stream completes
}

export function printError(error: string): void {
  console.error(pc.red(`Error: ${error}`));
}

export function printInfo(text: string): void {
  console.log(pc.dim(text));
}
