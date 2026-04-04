/**
 * Hermes Backend Provider
 * 
 * Provider implementation that connects to a Hermes agent backend
 * via OpenAI-compatible API.
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
import { NetworkError, AuthError, StreamError } from '../errors';

const DEFAULT_ENDPOINT = 'http://localhost:8642';
const SSE_LINE_PREFIX = 'data: ';

/**
 * Hermes provider implementation
 * Connects to Hermes backend via OpenAI-compatible API
 */
export class HermesProvider implements Provider {
  readonly name = 'hermes';
  
  private endpoint: string;
  private apiKey: string;
  private timeout: number;

  constructor(config?: ProviderConfig) {
    this.endpoint = config?.endpoint || process.env.HERMES_ENDPOINT || DEFAULT_ENDPOINT;
    this.apiKey = config?.apiKey || process.env.HERMES_API_KEY || '';
    this.timeout = config?.timeout || 30000;
  }

  /**
   * Get authorization header value
   */
  private getAuthHeader(): string | undefined {
    if (!this.apiKey) {
      return undefined;
    }
    return `Bearer ${this.apiKey}`;
  }

  /**
   * Make a fetch request with error handling
   */
  private async fetchWithAuth(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.endpoint}${path}`;
    const auth = this.getAuthHeader();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && { Authorization: auth }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AuthError(`Authentication failed: ${response.statusText}`);
      }
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Check provider health by hitting /health endpoint
   */
  async health(): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth('/health');
      return response.ok;
    } catch (error) {
      if (error instanceof AuthError) {
        // Auth errors still mean the server is responding
        return true;
      }
      return false;
    }
  }

  /**
   * List available tools from the Hermes backend
   */
  async listTools(): Promise<Tool[]> {
    try {
      const response = await this.fetchWithAuth('/tools');
      const data = await response.json() as { tools?: Tool[] };
      return data.tools || [];
    } catch (error) {
      console.error('Failed to list tools:', error);
      return [];
    }
  }

  /**
   * Execute a tool call via the Hermes backend
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    try {
      const response = await this.fetchWithAuth('/tools/execute', {
        method: 'POST',
        body: JSON.stringify({
          name: toolCall.name,
          arguments: toolCall.arguments,
        }),
      });

      const data = await response.json() as { result?: unknown; error?: string };
      return {
        id: toolCall.id,
        result: data.result,
        error: data.error,
      };
    } catch (error) {
      return {
        id: toolCall.id,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a chat completion request
   */
  async chatCompletion(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      messages,
      stream: false,
    };

    if (options?.model) {
      body.model = options.model;
    }
    if (options?.tools) {
      body.tools = options.tools;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.max_tokens !== undefined) {
      body.max_tokens = options.max_tokens;
    }

    try {
      const response = await this.fetchWithAuth('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await response.json() as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
        };
        model?: string;
      };

      const message = data.choices?.[0]?.message;
      const finishReason = data.choices?.[0]?.finish_reason;
      return {
        content: message?.content || '',
        usage: data.usage,
        model: data.model,
        done: finishReason === 'stop' || finishReason === 'length',
      };
    } catch (error) {
      if (error instanceof AuthError || error instanceof NetworkError) {
        throw error;
      }
      throw new StreamError(`Chat completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send a streaming chat completion request
   * Yields chunks as they arrive via SSE
   */
  async *streamChatCompletion(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk> {
    const body: Record<string, unknown> = {
      messages,
      stream: true,
    };

    if (options?.model) {
      body.model = options.model;
    }
    if (options?.tools) {
      body.tools = options.tools;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.max_tokens !== undefined) {
      body.max_tokens = options.max_tokens;
    }

    const url = `${this.endpoint}/v1/chat/completions`;
    const auth = this.getAuthHeader();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth && { Authorization: auth }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthError(`Authentication failed: ${response.statusText}`);
        }
        throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new StreamError('Empty response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine === 'data: [DONE]') {
            yield { content: '', done: true };
            return;
          }

          if (trimmedLine.startsWith(SSE_LINE_PREFIX)) {
            const jsonStr = trimmedLine.slice(SSE_LINE_PREFIX.length);
            try {
              const data = JSON.parse(jsonStr) as {
                choices?: Array<{
                  delta?: { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> };
                  finish_reason?: string;
                }>;
                usage?: {
                  prompt_tokens: number;
                  completion_tokens: number;
                };
              };

              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                yield {
                  content: delta.content,
                  done: false,
                };
              }

              // Handle tool calls in stream
              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function?.name) {
                    yield {
                      content: `[TOOL_CALL:${toolCall.function.name}]`,
                      done: false,
                    };
                  }
                }
              }

              // Check for completion
              const finishReason = data.choices?.[0]?.finish_reason;
              if (finishReason && finishReason !== 'stop' && finishReason !== 'length') {
                yield {
                  content: '',
                  done: true,
                  usage: data.usage,
                };
                return;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AuthError || error instanceof NetworkError || error instanceof StreamError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new StreamError(`Request timed out after ${this.timeout}ms`);
      }

      throw new StreamError(`Stream error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close the provider and release resources
   */
  async close(): Promise<void> {
    // No persistent connections to close in this implementation
    // Reserved for future cleanup logic
  }
}

export default HermesProvider;
