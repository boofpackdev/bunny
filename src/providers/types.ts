/**
 * Provider abstraction layer types
 * Defines the interface and types for AI provider integration
 */

/**
 * Represents a chat message with role and content
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call?: ToolCall;
  tool_call_id?: string;
}

/**
 * Options for chat completion requests
 */
export interface ChatOptions {
  model?: string;
  tools?: Tool[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Response from a chat completion request
 */
export interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  model?: string;
  done: boolean;
}

/**
 * A chunk of data from a streaming chat completion
 */
export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

/**
 * Represents a tool/function that can be called by the model
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Represents a tool call invocation
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of executing a tool call
 */
export interface ToolResult {
  id: string;
  result: unknown;
  error?: string;
}

/**
 * Provider interface that all backend providers must implement
 */
export interface Provider {
  /**
   * Unique identifier for the provider
   */
  readonly name: string;

  /**
   * Send a chat completion request
   * @param messages - Array of chat messages
   * @param options - Optional chat completion options
   * @returns Promise resolving to chat completion response
   */
  chatCompletion(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Send a streaming chat completion request
   * @param messages - Array of chat messages
   * @param options - Optional chat completion options
   * @returns AsyncGenerator yielding stream chunks
   */
  streamChatCompletion(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk>;

  /**
   * List available tools from the provider
   * @returns Promise resolving to array of available tools
   */
  listTools(): Promise<Tool[]>;

  /**
   * Execute a tool call
   * @param toolCall - The tool call to execute
   * @returns Promise resolving to tool result
   */
  executeTool(toolCall: ToolCall): Promise<ToolResult>;

  /**
   * Check provider health/availability
   * @returns Promise resolving to true if provider is healthy
   */
  health(): Promise<boolean>;

  /**
   * Close the provider and release resources
   * @returns Promise that resolves when closed
   */
  close(): Promise<void>;
}

/**
 * Provider class interface for factory creation
 */
export interface ProviderConstructor {
  new (config?: ProviderConfig): Provider;
}

/**
 * Configuration options for provider initialization
 */
export interface ProviderConfig {
  endpoint?: string;
  apiKey?: string;
  model?: string;
  timeout?: number;
}

// Re-export ChatMessage as Message for backwards compatibility
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ChatMessage = Message;
