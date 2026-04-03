// CLI Types
export interface CLIOptions {
  json: boolean;
  stream: boolean;
  timeout: number;
  endpoint?: string;
  model?: string;
}

export interface ChatOptions {
  endpoint: string;
  stream: boolean;
  jsonOutput?: boolean;
  timeout: number;
  auth?: string;
  model?: string;
}

// Config Types
export interface CLIConfig {
  defaultEndpoint: string;
  defaultModel?: string;
  deliveryChannel?: string;
  autoStream: boolean;
  timeout: number;
}

export interface ConfigStore {
  get<K extends keyof CLIConfig>(key: K): CLIConfig[K] | undefined;
  set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void;
  list(): CLIConfig;
  unset(key: keyof CLIConfig): void;
  save(): void;
  load(): void;
}

// Cron Types
export interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind: 'cron' | 'interval';
    expr?: string;
    display: string;
  };
  prompt: string;
  skill?: string | null;
  skills: string[];
  enabled: boolean;
  state: string;
  deliver: string;
  next_run_at?: string;
  last_run_at?: string;
  last_status?: string;
  last_error?: string | null;
  created_at: string;
}

export interface CronJobInput {
  name: string;
  schedule: string;
  prompt: string;
  skill?: string;
  deliver: string;
}

// Agent Types
export interface AgentOptions {
  prompt: string;
  cwd?: string;
  auto: 'low' | 'medium' | 'high';
  model?: string;
  json?: boolean;
}

export interface AgentInfo {
  pid: number;
  prompt: string;
  cwd: string;
  started_at: string;
}

// Docker Types
export interface DockerContainer {
  name: string;
  ports: string;
  status: string;
}

// API Types
export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface APIError {
  code: number;
  message: string;
}
