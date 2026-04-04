/**
 * OpenAI-compatible provider implementation
 * 
 * Provides a fallback provider for cases where Hermes backend is unavailable
 * or for development without the full Hermes stack.
 * 
 * Supports any OpenAI-compatible API endpoint.
 */

import type {
  Provider,
  ProviderConfig,
  Message,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  Tool,
  ToolCall,
  ToolResult,
} from './types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';

/**
 * OpenAI-compatible provider
 * 
 * Connects to any OpenAI-compatible API endpoint and provides
 * a consistent interface for chat completions and tool execution.
 */
export class OpenAICompatibleProvider implements Provider {
  readonly name = 'openai-compatible';
  readonly displayName = 'OpenAI Compatible';

  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(config?: ProviderConfig) {
    // Support config overrides, but env vars take precedence
    this.baseUrl = process.env.OPENAI_BASE_URL || config?.endpoint || DEFAULT_BASE_URL;
    this.apiKey = process.env.OPENAI_API_KEY || config?.apiKey || '';
    this.model = process.env.OPENAI_MODEL || config?.model || DEFAULT_MODEL;
    this.timeout = config?.timeout || 120_000;
  }

  /**
   * Check if the provider is available by hitting the models endpoint
   */
  async health(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available tools from the provider
   * Note: OpenAI-compatible APIs may not support tool listing
   * Returns empty array as a fallback
   */
  async listTools(): Promise<Tool[]> {
    // OpenAI-compatible APIs typically don't have a tool listing endpoint
    // Subclasses or configured tools can override this
    return [];
  }

  /**
   * Send a chat completion request (non-streaming)
   */
  async chatCompletion(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model || this.model;
    const temperature = options?.temperature;
    const maxTokens = options?.max_tokens;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature,
        max_tokens: maxTokens,
        tools: options?.tools ? this.formatTools(options.tools) : undefined,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message?: { content?: string };
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>;
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
      };
      model?: string;
    };

    const choice = data.choices[0];
    
    // Handle tool calls if present
    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      return {
        content: JSON.stringify({
          tool_call: {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
          },
        }),
        usage: data.usage,
        model: data.model,
        done: true,
      };
    }

    return {
      content: choice?.message?.content || '',
      usage: data.usage,
      model: data.model,
      done: true,
    };
  }

  /**
   * Send a streaming chat completion request
   */
  async *streamChatCompletion(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk> {
    const model = options?.model || this.model;
    const temperature = options?.temperature;
    const maxTokens = options?.max_tokens;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        temperature,
        max_tokens: maxTokens,
        stream: true,
        tools: options?.tools ? this.formatTools(options.tools) : undefined,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Empty response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage: StreamChunk['usage'];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') {
          if (trimmed === 'data: [DONE]') {
            yield { content: '', done: true, usage };
            return;
          }
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr) as {
              choices?: Array<{
                delta?: { content?: string; tool_calls?: Array<{
                  index: number;
                  id?: string;
                  type?: string;
                  function?: { name?: string; arguments?: string };
                }> };
                finish_reason?: string;
              }>;
              usage?: {
                prompt_tokens: number;
                completion_tokens: number;
              };
            };

            // Capture usage from final chunk
            if (data.usage) {
              usage = data.usage;
            }

            const choice = data.choices?.[0];
            const delta = choice?.delta;

            if (delta?.content) {
              yield {
                content: delta.content,
                done: false,
              };
            }

            // Handle tool calls in stream
            if (delta?.tool_calls && delta.tool_calls.length > 0) {
              const toolCall = delta.tool_calls[0];
              if (toolCall.function) {
                yield {
                  content: JSON.stringify({
                    tool_call: {
                      id: toolCall.id,
                      name: toolCall.function.name,
                      arguments: toolCall.function.arguments || '',
                    },
                  }),
                  done: false,
                };
              }
            }

            if (choice?.finish_reason === 'stop' || choice?.finish_reason === 'tool_calls') {
              yield { content: '', done: true, usage };
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Final yield if we haven't already
    yield { content: '', done: true, usage };
  }

  /**
   * Execute a tool call
   * Note: OpenAI-compatible providers don't natively execute tools
   * This is a stub that returns an error indicating tool execution
   * should be handled by the caller
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    return {
      id: toolCall.id,
      result: null,
      error: 'Tool execution not supported by OpenAI-compatible provider. ' +
        'Tools should be executed by the caller and results passed back as messages.',
    };
  }

  /**
   * Close the provider and release resources
   * No-op for this provider as it doesn't hold persistent connections
   */
  async close(): Promise<void> {
    // No persistent connections to close
  }

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(messages: Message[]): Array<{
    role: string;
    content: string;
    name?: string;
  }> {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
    }));
  }

  /**
   * Format tools for OpenAI API
   */
  private formatTools(tools: Tool[]): Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }
}
