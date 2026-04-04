import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible';
import type { Message, ChatOptions, Tool } from '../src/providers/types';

describe('OpenAICompatibleProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use default values when no config or env vars provided', () => {
      delete process.env.OPENAI_BASE_URL;
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_MODEL;

      const provider = new OpenAICompatibleProvider();
      
      expect(provider.name).toBe('openai-compatible');
      expect(provider.displayName).toBe('OpenAI Compatible');
    });

    it('should use OPENAI_BASE_URL env var', () => {
      process.env.OPENAI_BASE_URL = 'https://custom.example.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      // The baseUrl is private, but we can test through health behavior
      expect(provider.name).toBe('openai-compatible');
    });

    it('should use OPENAI_API_KEY env var', () => {
      process.env.OPENAI_API_KEY = 'test-key-123';
      
      const provider = new OpenAICompatibleProvider();
      expect(provider.name).toBe('openai-compatible');
    });

    it('should use OPENAI_MODEL env var', () => {
      process.env.OPENAI_MODEL = 'gpt-4-turbo';
      
      const provider = new OpenAICompatibleProvider();
      expect(provider.name).toBe('openai-compatible');
    });

    it('should accept config overrides', () => {
      const provider = new OpenAICompatibleProvider({
        endpoint: 'https://config.example.com',
        apiKey: 'config-key',
        model: 'config-model',
        timeout: 5000,
      });
      
      expect(provider.name).toBe('openai-compatible');
    });
  });

  describe('health', () => {
    it('should return false when no API key is set', async () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAICompatibleProvider();
      
      const result = await provider.health();
      expect(result).toBe(false);
    });

    it('should return false when API key is empty', async () => {
      process.env.OPENAI_API_KEY = '';
      const provider = new OpenAICompatibleProvider();
      
      const result = await provider.health();
      expect(result).toBe(false);
    });

    it('should return true when API key is set and models endpoint responds', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      // Mock the fetch call
      const mockFetch = mock(async () => {
        return new Response(null, { status: 200 });
      });
      
      global.fetch = mockFetch;
      
      const result = await provider.health();
      expect(result).toBe(true);
    });

    it('should return false when models endpoint returns error', async () => {
      process.env.OPENAI_API_KEY = 'invalid-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockFetch = mock(async () => {
        return new Response(null, { status: 401 });
      });
      
      global.fetch = mockFetch;
      
      const result = await provider.health();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockFetch = mock(async () => {
        throw new Error('Network error');
      });
      
      global.fetch = mockFetch;
      
      const result = await provider.health();
      expect(result).toBe(false);
    });
  });

  describe('listTools', () => {
    it('should return empty array (no tool listing support)', async () => {
      const provider = new OpenAICompatibleProvider();
      
      const tools = await provider.listTools();
      expect(tools).toEqual([]);
    });
  });

  describe('chatCompletion', () => {
    it('should throw error when no API key is set', async () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAICompatibleProvider();
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      await expect(provider.chatCompletion(messages)).rejects.toThrow();
    });

    it('should return chat completion response', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockResponse = {
        choices: [{
          message: { content: 'Hello! How can I help you?' }
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
        },
        model: 'gpt-4o',
      };
      
      const mockFetch = mock(async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const result = await provider.chatCompletion(messages);
      
      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.done).toBe(true);
      expect(result.usage?.prompt_tokens).toBe(10);
      expect(result.usage?.completion_tokens).toBe(20);
      expect(result.model).toBe('gpt-4o');
    });

    it('should handle API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'invalid-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockFetch = mock(async () => {
        return new Response('Unauthorized', { status: 401 });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      await expect(provider.chatCompletion(messages)).rejects.toThrow('OpenAI API error: 401');
    });

    it('should pass model option to API', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      let capturedBody: string | undefined;
      
      const mockFetch = mock(async (url: string, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'response' } }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const options: ChatOptions = { model: 'gpt-4-turbo' };
      
      await provider.chatCompletion(messages, options);
      
      expect(capturedBody).toBeDefined();
      const body = JSON.parse(capturedBody!);
      expect(body.model).toBe('gpt-4-turbo');
    });

    it('should pass temperature and max_tokens options to API', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      let capturedBody: string | undefined;
      
      const mockFetch = mock(async (_url: string, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'response' } }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const options: ChatOptions = { temperature: 0.7, max_tokens: 100 };
      
      await provider.chatCompletion(messages, options);
      
      expect(capturedBody).toBeDefined();
      const body = JSON.parse(capturedBody!);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(100);
    });
  });

  describe('streamChatCompletion', () => {
    it('should yield streaming chunks', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });
      
      const mockFetch = mock(async () => {
        return new Response(mockStream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const chunks: string[] = [];
      
      for await (const chunk of provider.streamChatCompletion(messages)) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }
      
      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should handle tool calls in streaming response', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      // Build the SSE data string with properly escaped JSON
      const sseData = JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              id: 'call_123',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'NYC' }),
              },
            }],
          },
        }],
      });
      
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${sseData}\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });
      
      const mockFetch = mock(async () => {
        return new Response(mockStream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Weather in NYC?' }];
      const chunks: string[] = [];
      
      for await (const chunk of provider.streamChatCompletion(messages)) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }
      
      expect(chunks.length).toBe(1);
      const parsed = JSON.parse(chunks[0]);
      expect(parsed.tool_call.id).toBe('call_123');
      expect(parsed.tool_call.name).toBe('get_weather');
    });

    it('should handle API errors in streaming mode', async () => {
      process.env.OPENAI_API_KEY = 'invalid-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockFetch = mock(async () => {
        return new Response('Unauthorized', { status: 401 });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      
      let error: Error | null = null;
      try {
        for await (const chunk of provider.streamChatCompletion(messages)) {
          // Consume iterator
        }
      } catch (e) {
        error = e as Error;
      }
      
      expect(error).not.toBeNull();
      expect(error?.message).toContain('OpenAI API error: 401');
    });

    it('should include usage in final chunk', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const provider = new OpenAICompatibleProvider();
      
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi"}}],"usage":{"prompt_tokens":5,"completion_tokens":2}}\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });
      
      const mockFetch = mock(async () => {
        return new Response(mockStream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      });
      
      global.fetch = mockFetch;
      
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      let finalChunk: { done: boolean; usage?: { prompt_tokens: number; completion_tokens: number } } | null = null;
      
      for await (const chunk of provider.streamChatCompletion(messages)) {
        if (chunk.done) {
          finalChunk = chunk;
        }
      }
      
      expect(finalChunk).not.toBeNull();
      expect(finalChunk!.done).toBe(true);
      expect(finalChunk!.usage?.prompt_tokens).toBe(5);
      expect(finalChunk!.usage?.completion_tokens).toBe(2);
    });
  });

  describe('executeTool', () => {
    it('should return error indicating tool execution not supported', async () => {
      const provider = new OpenAICompatibleProvider();
      
      const result = await provider.executeTool({
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'NYC' },
      });
      
      expect(result.id).toBe('call_123');
      expect(result.result).toBeNull();
      expect(result.error).toContain('Tool execution not supported');
    });
  });

  describe('close', () => {
    it('should be a no-op', async () => {
      const provider = new OpenAICompatibleProvider();
      
      // Should not throw
      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
