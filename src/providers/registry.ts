/**
 * Provider registry
 * Implements the registry pattern for provider selection and management
 * 
 * Provider selection priority:
 * 1. HERMES_ENDPOINT env var -> use hermes provider
 * 2. CLAUDE_CODE_USE_OPENAI=1 -> use OpenAI-compatible
 * 3. Config file provider preference
 * 4. Default: hermes provider
 */

import type {
  Provider,
  ProviderConstructor,
  ProviderConfig,
} from './types';

export interface RegistryEntry {
  provider: ProviderConstructor;
  description?: string;
  aliases?: string[];
}

export interface ProviderInfo {
  name: string;
  description?: string;
  aliases?: string[];
  isDefault?: boolean;
}

export interface ProviderHealthResult {
  ok: boolean;
  latency?: number;
  error?: string;
  version?: string;
}

export type ProviderSelectionStrategy = 
  | 'hermes'      // Use hermes provider (default)
  | 'openai'      // Use OpenAI-compatible provider
  | 'config'      // Use config file preference
  | 'detect';    // Auto-detect based on environment

class ProviderRegistry {
  private providers: Map<string, RegistryEntry> = new Map();
  private defaultProvider: string | null = null;
  private configProviderPreference: string | null = null;

  /**
   * Register a new provider
   */
  register(name: string, provider: ProviderConstructor, options?: { description?: string; aliases?: string[]; default?: boolean }): void {
    if (this.providers.has(name)) {
      console.warn(`Provider "${name}" is already registered. Overwriting.`);
    }

    this.providers.set(name, {
      provider,
      description: options?.description,
      aliases: options?.aliases,
    });

    // Register aliases
    if (options?.aliases) {
      for (const alias of options.aliases) {
        this.providers.set(alias, { provider });
      }
    }

    // Set as default if specified or if this is the first provider
    if (options?.default || this.providers.size === 1) {
      this.defaultProvider = name;
    }
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    // Don't unregister aliases
    const entry = this.providers.get(name);
    if (entry && entry.aliases && entry.aliases.includes(name)) {
      return false;
    }

    const aliases = entry?.aliases || [];
    this.providers.delete(name);
    for (const alias of aliases) {
      this.providers.delete(alias);
    }

    if (this.defaultProvider === name) {
      const keys = Array.from(this.providers.keys());
      this.defaultProvider = keys.length > 0 ? keys[0] : null;
    }

    return true;
  }

  /**
   * Get a provider instance by name
   * If name is not provided, uses auto-detection logic
   */
  get(name?: string, config?: ProviderConfig): Provider | null {
    // If no name provided, use auto-detection
    if (!name) {
      return this.detect(config);
    }

    const entry = this.providers.get(name);
    if (!entry) {
      return null;
    }

    try {
      return new entry.provider(config);
    } catch (error) {
      console.error(`Failed to instantiate provider "${name}":`, error);
      return null;
    }
  }

  /**
   * Get the default provider instance
   */
  getDefault(config?: ProviderConfig): Provider | null {
    if (!this.defaultProvider) {
      return null;
    }
    return this.get(this.defaultProvider, config);
  }

  /**
   * Set the config file provider preference
   */
  setConfigPreference(provider: string): void {
    this.configProviderPreference = provider;
  }

  /**
   * Get the config file provider preference
   */
  getConfigPreference(): string | null {
    return this.configProviderPreference;
  }

  /**
   * Auto-detect the best provider based on environment
   * 
   * Priority:
   * 1. HERMES_ENDPOINT env var -> use hermes provider
   * 2. CLAUDE_CODE_USE_OPENAI=1 -> use openai provider
   * 3. Config file provider preference
   * 4. Default: hermes provider
   */
  detect(config?: ProviderConfig): Provider {
    // 1. Check HERMES_ENDPOINT env var
    if (process.env.HERMES_ENDPOINT) {
      const hermesProvider = this.get('hermes', config);
      if (hermesProvider) {
        return hermesProvider;
      }
    }

    // 2. Check CLAUDE_CODE_USE_OPENAI env var
    if (process.env.CLAUDE_CODE_USE_OPENAI === '1') {
      const openaiProvider = this.get('openai', config);
      if (openaiProvider) {
        return openaiProvider;
      }
    }

    // 3. Check config file preference
    if (this.configProviderPreference) {
      const configProvider = this.get(this.configProviderPreference, config);
      if (configProvider) {
        return configProvider;
      }
    }

    // 4. Default to hermes provider
    const defaultProvider = this.getDefault(config);
    if (defaultProvider) {
      return defaultProvider;
    }

    // Fallback: return first available provider
    const providers = this.listProviders();
    if (providers.length > 0) {
      const fallback = this.get(providers[0], config);
      if (fallback) {
        return fallback;
      }
    }

    throw new Error('No providers registered');
  }

  /**
   * Get all registered provider names (excluding aliases)
   */
  listProviders(): string[] {
    const names: string[] = [];
    const allAliases = new Set<string>();

    // First pass: collect all aliases
    for (const entry of this.providers.values()) {
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          allAliases.add(alias);
        }
      }
    }

    // Second pass: collect primary provider names (not aliases)
    for (const name of this.providers.keys()) {
      if (!allAliases.has(name)) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * List all providers with their info
   */
  list(): ProviderInfo[] {
    const providers = this.listProviders();
    const infos: ProviderInfo[] = [];

    for (const name of providers) {
      const entry = this.providers.get(name);
      if (entry) {
        infos.push({
          name,
          description: entry.description,
          aliases: entry.aliases?.filter(a => a !== name),
          isDefault: name === this.defaultProvider,
        });
      }
    }

    return infos;
  }

  /**
   * Get provider info including description
   */
  getInfo(name: string): { name: string; description?: string } | null {
    const entry = this.providers.get(name);
    if (!entry) {
      return null;
    }
    return {
      name,
      description: entry.description,
    };
  }

  /**
   * Set the default provider
   */
  setDefault(name: string): boolean {
    const entry = this.providers.get(name);
    if (!entry) {
      return false;
    }
    this.defaultProvider = name;
    return true;
  }

  /**
   * Get the default provider name
   */
  getDefaultName(): string | null {
    return this.defaultProvider;
  }

  /**
   * Find the best available provider by checking health
   */
  async findAvailable(config?: ProviderConfig): Promise<Provider | null> {
    const providers = this.listProviders();

    for (const name of providers) {
      const provider = this.get(name, config);
      if (!provider) continue;

      try {
        const ok = await provider.health();
        if (ok) {
          return provider;
        }
      } catch {
        // Continue to next provider
      }
    }

    return null;
  }

  /**
   * Check health of all registered providers
   */
  async checkAllHealth(config?: ProviderConfig): Promise<Map<string, ProviderHealthResult>> {
    const results = new Map<string, ProviderHealthResult>();
    const providers = this.listProviders();

    await Promise.all(
      providers.map(async (name) => {
        const provider = this.get(name, config);
        if (provider) {
          const start = Date.now();
          try {
            const ok = await provider.health();
            results.set(name, {
              ok,
              latency: Date.now() - start,
            });
          } catch (error) {
            results.set(name, {
              ok: false,
              latency: Date.now() - start,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      })
    );

    return results;
  }

  /**
   * Clear all providers (useful for testing)
   */
  clear(): void {
    this.providers.clear();
    this.defaultProvider = null;
    this.configProviderPreference = null;
  }
}

// Export singleton instance
export const registry = new ProviderRegistry();

// Export convenience functions
export function registerProvider(
  name: string,
  provider: ProviderConstructor,
  options?: { description?: string; aliases?: string[]; default?: boolean }
): void {
  registry.register(name, provider, options);
}

export function getProvider(name?: string, config?: ProviderConfig): Provider | null {
  return registry.get(name, config);
}

export function getDefaultProvider(config?: ProviderConfig): Provider | null {
  return registry.getDefault(config);
}

export function listProviders(): string[] {
  return registry.listProviders();
}

export function list(): ProviderInfo[] {
  return registry.list();
}

export function setDefaultProvider(name: string): boolean {
  return registry.setDefault(name);
}

export function findAvailableProvider(config?: ProviderConfig): Promise<Provider | null> {
  return registry.findAvailable(config);
}

export function detectProvider(config?: ProviderConfig): Provider {
  return registry.detect(config);
}

export function setConfigProviderPreference(provider: string): void {
  registry.setConfigPreference(provider);
}
