import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { registerCommand } from '../cli/router';
import { parseGlobalFlags, printCommandHelp } from '../cli/help';
import { printSuccess, printError, printInfo, startSpinner, succeedSpinner } from '../ui/spinner';
import { exitCodes } from '../errors';
import type { CLIOptions } from '../types';

const TEMPLATES: Record<string, { description: string; files: Record<string, string> }> = {
  minimal: {
    description: 'Minimal project structure',
    files: {
      'README.md': '# Project\n\nA new project.\n',
      '.gitignore': 'node_modules/\ndist/\n.env\n',
    },
  },
  node: {
    description: 'Node.js project with TypeScript',
    files: {
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'ts-node src/index.ts',
          build: 'tsc',
          test: 'vitest',
        },
        dependencies: {},
        devDependencies: {
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          vitest: '^1.0.0',
        },
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: 'dist',
        },
        include: ['src/**/*'],
      }, null, 2),
      'src/index.ts': 'console.log("Hello, world!");\n',
      '.gitignore': 'node_modules/\ndist/\n.env\n*.log\n',
      'README.md': '# Project\n\nA Node.js project.\n',
    },
  },
  python: {
    description: 'Python project with Poetry',
    files: {
      'pyproject.toml': `[tool.poetry]
name = "project"
version = "1.0.0"
description = ""
authors = [""]

[tool.poetry.dependencies]
python = "^3.11"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
`,
      'src/__init__.py': '',
      'src/main.py': 'def main():\n    print("Hello, world!")\n\nif __name__ == "__main__":\n    main()\n',
      '.gitignore': '__pycache__/\n.env\n.venv/\n*.pyc\ndist/\n',
      'README.md': '# Project\n\nA Python project.\n',
    },
  },
  go: {
    description: 'Go project',
    files: {
      'go.mod': 'module project\n\ngo 1.21\n',
      'cmd/main.go': `package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}
`,
      '.gitignore': '*.exe\n*.test\n*.out\n.env\nvendor/\n',
      'README.md': '# Project\n\nA Go project.\n',
    },
  },
};

async function initHandler(args: string[], _options: CLIOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printCommandHelp('init', 'Initialize a new project');
    console.log(`
${pc.bold('Options:')}
  --template <name>     Template: minimal, node, python, go
  --dir <path>          Target directory (default: current directory)
  --force              Overwrite existing files

${pc.bold('Examples:')}
  hermes init my-project --template node
  hermes init --template python --dir /path/to/project
  hermes init --template minimal --force
`);
    return;
  }

  let projectName = 'project';
  let templateName = 'minimal';
  let targetDir = process.cwd();
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--template' || arg === '-t') {
      templateName = args[++i] || 'minimal';
    } else if (arg === '--dir' || arg === '-d') {
      targetDir = join(process.cwd(), args[++i]);
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (!arg.startsWith('-')) {
      projectName = arg;
    }
  }

  const template = TEMPLATES[templateName];
  if (!template) {
    printError(`Unknown template: ${templateName}`);
    printInfo(`Available templates: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(exitCodes.CLI_ERROR);
  }

  // Create project directory if name provided and dir is not explicitly set
  if (args.includes(projectName) && !args.includes('--dir')) {
    targetDir = join(process.cwd(), projectName);
  }

  startSpinner(`Creating project in ${targetDir}...`);

  // Check if directory exists and has files
  if (existsSync(targetDir)) {
    const contents = require('fs').readdirSync(targetDir);
    if (contents.length > 0 && !force) {
      printError(`Directory ${targetDir} is not empty. Use --force to overwrite.`);
      process.exit(exitCodes.CLI_ERROR);
    }
  } else {
    mkdirSync(targetDir, { recursive: true });
  }

  // Create project directories
  const dirsToCreate = new Set<string>();
  for (const filePath of Object.keys(template.files)) {
    const dir = join(targetDir, filePath).split('/').slice(0, -1).join('/');
    if (dir) dirsToCreate.add(dir);
  }
  for (const dir of dirsToCreate) {
    mkdirSync(dir, { recursive: true });
  }

  // Write template files
  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = join(targetDir, filePath);
    if (existsSync(fullPath) && !force) {
      continue;
    }
    writeFileSync(fullPath, content);
  }

  succeedSpinner(`Created ${templateName} project at ${targetDir}`);
  printSuccess(`Template: ${template.description}`);
  printInfo(`\nNext steps:`);
  console.log(`  cd ${targetDir}`);
  if (templateName === 'node') {
    console.log(`  npm install`);
    console.log(`  npm run dev`);
  } else if (templateName === 'python') {
    console.log(`  poetry install`);
    console.log(`  poetry run python src/main.py`);
  } else if (templateName === 'go') {
    console.log(`  go mod tidy`);
    console.log(`  go run cmd/main.go`);
  }
}

export function registerInitCommand(): void {
  registerCommand('init', 'Initialize a new project', initHandler);
}
