import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import type { DockerContainer } from './types';

export const config = {
  defaultEndpoint: 'http://localhost:8642',
  requestTimeout: 120_000,
  healthEndpoint: '/health',
  containerFilter: 'name=hermes',
  hermesPort: 8642,
} as const;

export async function discoverEndpoint(): Promise<string> {
  // 1. Check HERMES_ENDPOINT env var
  if (process.env.HERMES_ENDPOINT) {
    return process.env.HERMES_ENDPOINT;
  }

  // 2. Query Docker API for running hermes containers
  try {
    const output = execSync(
      `docker ps --filter "${config.containerFilter}" --format "{{.Names}}|{{.Ports}}"`,
      { encoding: 'utf8' }
    );

    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const [name, ports] = line.split('|') as [string, string];
      const portMatch = ports.match(/(\d+)->\d+\/tcp/);
      if (portMatch) {
        const mappedPort = portMatch[1];
        return `http://localhost:${mappedPort}`;
      }
    }

    // Container found but no exposed port, try default
    if (lines.length > 0) {
      return `http://localhost:${config.hermesPort}`;
    }
  } catch {
    // Docker not available or no containers
  }

  // 4. Fallback
  return config.defaultEndpoint;
}

export async function getAuthHeader(): Promise<string | undefined> {
  // 1. Check HERMES_API_KEY env var first
  if (process.env.HERMES_API_KEY) {
    return `Bearer ${process.env.HERMES_API_KEY}`;
  }

  // 2. Read from ~/.hermes/auth.json
  const authPath = `${process.env.HOME}/.hermes/auth.json`;
  if (existsSync(authPath)) {
    try {
      const content = readFileSync(authPath, 'utf8');
      const { api_key } = JSON.parse(content);
      if (api_key) {
        return `Bearer ${api_key}`;
      }
    } catch {
      // Malformed auth.json, ignore
    }
  }

  return undefined;
}

export async function resolveConfig(): Promise<{
  endpoint: string;
  auth?: string;
}> {
  const [endpoint, auth] = await Promise.all([
    discoverEndpoint(),
    getAuthHeader(),
  ]);

  return { endpoint, auth };
}
