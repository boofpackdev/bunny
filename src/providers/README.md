# Provider Abstraction Layer

This directory contains the provider abstraction layer for the hermes-frontend integration project. It provides a unified interface for interacting with different AI providers (e.g., OpenAI, Claude, Gemini, local models).

## Architecture Overview

The provider layer follows a clean abstraction pattern with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Consumer Code                            │
│              (commands, agents, workers, etc.)              │
└─────────────────────────┬───────────────────────────────────┘
                          │ uses Provider interface
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Registry                               │
│              (provider selection & management)              │
└─────────────────────────┬───────────────────────────────────┘
                          │ creates provider instances
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Implementations                  │
│        (OpenAI, Claude, Gemini, Local, etc.)                │
└─────────────────────────────────────────────────────────────┘
```

## Files

- [`types.ts`](./types.ts) - Provider interface and TypeScript types
- [`registry.ts`](./registry.ts) - Provider registration and selection

## Provider Interface

Each provider must implement the `Provider` interface:

```typescript
interface Provider {
  readonly name: string;
  readonly displayName: string;

  health(): Promise<ProviderHealthResult>;
  tools(): Promise<Tool[]>;
  chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResponse>;
  executeTool(toolCall: ToolCall): Promise<ToolResult>;
}
```

### Methods

- **`name`**: Unique identifier for the provider
- **`displayName`**: Human-readable name for display purposes
- **`health()`**: Check provider availability and latency
- **`tools()`**: Get available tools/functions from the provider
- **`chatCompletion()`**: Send a chat completion request
- **`executeTool()`**: Execute a tool call returned by the model

## Registry Pattern

The registry provides centralized provider management:

```typescript
import { registry, registerProvider, getProvider } from './registry';

// Register a new provider
registerProvider('openai', OpenAIProvider, {
  description: 'OpenAI GPT models',
  aliases: ['gpt', 'openai-gpt'],
  default: true,
});

// Get a specific provider
const provider = getProvider('openai', { endpoint: '...', apiKey: '...' });

// Get the default provider
const defaultProvider = registry.getDefault();

// List all providers
const providers = registry.listProviders();

// Find an available provider
const available = await registry.findAvailable();
```

## Usage Example

```typescript
import { getProvider, getDefaultProvider } from './registry';
import type { ChatMessage } from './types';

async function chatWithProvider() {
  // Use default provider
  const provider = getDefaultProvider({ apiKey: '...' });

  if (!provider) {
    throw new Error('No provider available');
  }

  // Check health
  const health = await provider.health();
  console.log('Provider health:', health);

  // Get available tools
  const tools = await provider.tools();

  // Send chat completion
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello!' }
  ];

  const response = await provider.chatCompletion(messages, {
    tools,
    stream: false,
  });

  console.log('Response:', response.content);
}
```

## Adding a New Provider

1. Create a new file in `src/providers/` (e.g., `openai.ts`)
2. Implement the `Provider` interface
3. Register the provider in the registry

Example:

```typescript
// src/providers/openai.ts
import type { Provider, ProviderConfig } from './types';

export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI';

  constructor(private config: ProviderConfig) {}

  async health() {
    // Implementation
  }

  async tools() {
    // Implementation
  }

  async chatCompletion(messages, options) {
    // Implementation
  }

  async executeTool(toolCall) {
    // Implementation
  }
}
```

Then register it:

```typescript
// In your setup code
import { registerProvider } from './registry';
import { OpenAIProvider } from './openai';

registerProvider('openai', OpenAIProvider, {
  description: 'OpenAI GPT models',
  default: true,
});
```

## Type Safety

The abstraction layer uses TypeScript strict mode to ensure type safety across all provider implementations. All implementations must conform to the `Provider` interface contract.

## Design Decisions

1. **Registry Pattern**: Centralizes provider management and allows dynamic provider selection at runtime
2. **Interface-based**: All providers implement a common interface for interchangeability
3. **Async-first**: All provider methods return Promises for consistent async handling
4. **Configurable**: Providers accept config objects for endpoint, API key, model selection
5. **Health Checking**: Built-in health checks for provider availability and fallback logic
