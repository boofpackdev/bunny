import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { CLIConfig } from '../types';

const CONFIG_PATH = `${process.env.HOME}/.hermes/cli-config.json`;

interface ConfigStore {
  get(key: keyof CLIConfig): unknown;
  set(key: keyof CLIConfig, value: unknown): void;
  list(): CLIConfig;
  unset(key: keyof CLIConfig): void;
  save(): void;
  load(): void;
}

const DEFAULT_CONFIG: CLIConfig = {
  defaultEndpoint: 'http://localhost:8642',
  defaultModel: undefined,
  deliveryChannel: undefined,
  autoStream: true,
  timeout: 120000,
};

export class ConfigStoreImpl implements ConfigStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private config: any = {};
  private dirty = false;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.load();
  }

  load(): void {
    try {
      if (existsSync(CONFIG_PATH)) {
        const content = readFileSync(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(content);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      // Use defaults on error
    }
  }

  save(): void {
    try {
      const dir = dirname(CONFIG_PATH);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
      this.dirty = false;
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  get(key: keyof CLIConfig): unknown {
    return this.config[key];
  }

  set(key: keyof CLIConfig, value: unknown): void {
    this.config[key] = value;
    this.dirty = true;
    this.save();
  }

  list(): CLIConfig {
    return { ...this.config };
  }

  unset(key: keyof CLIConfig): void {
    if (key in DEFAULT_CONFIG) {
      this.config[key] = DEFAULT_CONFIG[key];
      this.dirty = true;
      this.save();
    }
  }
}

let storeInstance: ConfigStoreImpl | null = null;

export function getConfigStore(): ConfigStore {
  if (!storeInstance) {
    storeInstance = new ConfigStoreImpl();
  }
  return storeInstance;
}
