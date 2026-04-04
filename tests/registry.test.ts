import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { registry, registerProvider, getProvider, detectProvider, list, setConfigProviderPreference, setDefaultProvider } from '../src/providers/registry';
import type { Provider, ProviderConstructor, ProviderConfig, Message, ChatOptions, Tool } from '../src/providers/types';

// Mock provider implementations for testing
class MockHermesProvider implements Provider {
  readonly name = 'hermes';
  public config?: ProviderConfig;

  constructor(config?: ProviderConfig) {
    this.config = config;
  }

  async health() {
    return true;
  }

  async listTools(): Promise<Tool[]> {
    return [];
  }

  async chatCompletion(messages: Message[], options?: ChatOptions) {
    return { content: 'hermes response', done: true };
  }

  async *streamChatCompletion(messages: Message[], options?: ChatOptions) {
    yield { content: 'hermes ', done: false };
    yield { content: 'response', done: true };
  }

  async executeTool(toolCall: { id: string; name: string; arguments: Record<string, unknown> }) {
    return { id: toolCall.id, result: 'done' };
  }

  async close() {
    // No-op for mock
  }
}

class MockOpenAIProvider implements Provider {
  readonly name = 'openai';
  public config?: ProviderConfig;

  constructor(config?: ProviderConfig) {
    this.config = config;
  }

  async health() {
    return true;
  }

  async listTools(): Promise<Tool[]> {
    return [];
  }

  async chatCompletion(messages: Message[], options?: ChatOptions) {
    return { content: 'openai response', done: true };
  }

  async *streamChatCompletion(messages: Message[], options?: ChatOptions) {
    yield { content: 'openai ', done: false };
    yield { content: 'response', done: true };
  }

  async executeTool(toolCall: { id: string; name: string; arguments: Record<string, unknown> }) {
    return { id: toolCall.id, result: 'done' };
  }

  async close() {
    // No-op for mock
  }
}

class MockAnthropicProvider implements Provider {
  readonly name = 'anthropic';
  public config?: ProviderConfig;

  constructor(config?: ProviderConfig) {
    this.config = config;
  }

  async health() {
    return true;
  }

  async listTools(): Promise<Tool[]> {
    return [];
  }

  async chatCompletion(messages: Message[], options?: ChatOptions) {
    return { content: 'anthropic response', done: true };
  }

  async *streamChatCompletion(messages: Message[], options?: ChatOptions) {
    yield { content: 'anthropic ', done: false };
    yield { content: 'response', done: true };
  }

  async executeTool(toolCall: { id: string; name: string; arguments: Record<string, unknown> }) {
    return { id: toolCall.id, result: 'done' };
  }

  async close() {
    // No-op for mock
  }
}

describe('ProviderRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    registry.clear();
  });

  describe('register', () => {
    it('should register a provider', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      const provider = getProvider('hermes');
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('hermes');
    });

    it('should set first registered provider as default', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor);
      
      const defaultName = registry.getDefaultName();
      expect(defaultName).toBe('hermes');
    });

    it('should respect default option', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor, { default: true });
      
      const defaultName = registry.getDefaultName();
      expect(defaultName).toBe('openai');
    });

    it('should register provider with description and aliases', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor, {
        description: 'Hermes Docker Provider',
        aliases: ['hermes-local', 'h'],
      });

      const info = registry.getInfo('hermes');
      expect(info?.description).toBe('Hermes Docker Provider');

      const aliasedProvider = getProvider('hermes-local');
      expect(aliasedProvider).not.toBeNull();
      expect(aliasedProvider?.name).toBe('hermes');
    });
  });

  describe('get', () => {
    it('should get provider by name', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      const provider = getProvider('hermes');
      expect(provider?.name).toBe('hermes');
    });

    it('should return null for unregistered provider', () => {
      const provider = getProvider('nonexistent');
      expect(provider).toBeNull();
    });

    it('should pass config to provider', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      const config: ProviderConfig = { endpoint: 'http://test:9000', apiKey: 'test-key' };
      const provider = getProvider('hermes', config) as MockHermesProvider;
      expect(provider.config?.endpoint).toBe('http://test:9000');
      expect(provider.config?.apiKey).toBe('test-key');
    });
  });

  describe('detect', () => {
    afterEach(() => {
      // Cleanup env vars after each test
      delete process.env.HERMES_ENDPOINT;
      delete process.env.CLAUDE_CODE_USE_OPENAI;
    });

    it('should use HERMES_ENDPOINT env var for hermes provider', () => {
      // HERMES_ENDPOINT takes priority over CLAUDE_CODE_USE_OPENAI
      process.env.HERMES_ENDPOINT = 'http://hermes:8642';
      process.env.CLAUDE_CODE_USE_OPENAI = '1'; // This should be ignored
      registry.clear();

      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor);

      // Detect should return hermes because HERMES_ENDPOINT has highest priority
      const detected = detectProvider();
      expect(detected.name).toBe('hermes');
    });

    it('should use CLAUDE_CODE_USE_OPENAI=1 for openai provider when HERMES_ENDPOINT not set', () => {
      // CLAUDE_CODE_USE_OPENAI should be used when HERMES_ENDPOINT is not set
      delete process.env.HERMES_ENDPOINT;
      process.env.CLAUDE_CODE_USE_OPENAI = '1';
      registry.clear();

      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor);

      // Detect should return openai
      const detected = detectProvider();
      expect(detected.name).toBe('openai');
    });

    it('should use config preference when no env vars set', () => {
      // Config preference should be used when no env vars are set
      delete process.env.HERMES_ENDPOINT;
      delete process.env.CLAUDE_CODE_USE_OPENAI;
      registry.clear();

      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('anthropic', MockAnthropicProvider as unknown as ProviderConstructor, { default: true });

      setConfigProviderPreference('anthropic');

      // Detect should return anthropic (config preference)
      const detected = detectProvider();
      expect(detected.name).toBe('anthropic');
    });

    it('should default to first registered provider when no env vars or config', () => {
      // No env vars, no config preference
      delete process.env.HERMES_ENDPOINT;
      delete process.env.CLAUDE_CODE_USE_OPENAI;
      registry.clear();

      // First registered provider becomes default
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor);

      // Detect should return default (hermes - first registered)
      const detected = detectProvider();
      expect(detected.name).toBe('hermes');
    });

    it('should throw error when no providers registered', () => {
      registry.clear();
      expect(() => detectProvider()).toThrow('No providers registered');
    });
  });

  describe('list', () => {
    it('should list all registered providers with info', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor, {
        description: 'Hermes Provider',
        aliases: ['h'],
      });
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor, {
        description: 'OpenAI Provider',
        default: true,
      });

      const providers = list();
      expect(providers.length).toBe(2);

      const hermesInfo = providers.find(p => p.name === 'hermes');
      expect(hermesInfo?.description).toBe('Hermes Provider');
      expect(hermesInfo?.aliases).toEqual(['h']);
      expect(hermesInfo?.isDefault).toBe(false);

      const openaiInfo = providers.find(p => p.name === 'openai');
      expect(openaiInfo?.description).toBe('OpenAI Provider');
      expect(openaiInfo?.isDefault).toBe(true);
    });

    it('should not include aliases in list', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor, {
        aliases: ['hermes-local', 'h'],
      });

      const providers = list();
      expect(providers.length).toBe(1);
      expect(providers[0].name).toBe('hermes');
      expect(providers[0].aliases).toEqual(['hermes-local', 'h']);
    });
  });

  describe('default provider selection', () => {
    it('should get default provider', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor, { default: true });
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor);

      const defaultProvider = registry.getDefault();
      expect(defaultProvider?.name).toBe('hermes');
    });

    it('should set default provider', () => {
      registerProvider('hermes', MockHermesProvider as unknown as ProviderConstructor);
      registerProvider('openai', MockOpenAIProvider as unknown as ProviderConstructor, { default: true });

      setDefaultProvider('hermes');
      expect(registry.getDefaultName()).toBe('hermes');
    });

    it('should return null for getDefault when no providers', () => {
      registry.clear();
      expect(registry.getDefault()).toBeNull();
    });
  });

  describe('singleton behavior', () => {
    it('should return same registry instance', () => {
      const registry1 = require('../src/providers/registry').registry;
      const registry2 = require('../src/providers/registry').registry;
      expect(registry1).toBe(registry2);
    });
  });
});
