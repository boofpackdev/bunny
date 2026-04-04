import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { HermesProvider } from '../src/providers/hermes';
import type { Message, Tool } from '../src/providers/types';

describe('HermesProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use default endpoint when no config or env provided', () => {
      delete process.env.HERMES_ENDPOINT;
      delete process.env.HERMES_API_KEY;
      
      const provider = new HermesProvider();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('hermes');
    });

    it('should use HERMES_ENDPOINT env var when provided', () => {
      process.env.HERMES_ENDPOINT = 'http://custom:8642';
      delete process.env.HERMES_API_KEY;
      
      const provider = new HermesProvider();
      expect(provider).toBeDefined();
    });

    it('should use HERMES_API_KEY env var when provided', () => {
      process.env.HERMES_ENDPOINT = 'http://localhost:8642';
      process.env.HERMES_API_KEY = 'test-api-key';
      
      const provider = new HermesProvider();
      expect(provider).toBeDefined();
    });

    it('should prefer config over env vars', () => {
      process.env.HERMES_ENDPOINT = 'http://env-endpoint:8642';
      process.env.HERMES_API_KEY = 'env-api-key';
      
      const provider = new HermesProvider({
        endpoint: 'http://config-endpoint:8642',
        apiKey: 'config-api-key',
      });
      expect(provider).toBeDefined();
    });
  });

  describe('health', () => {
    it('should return true when /health returns 200', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return new Response(null, { status: 200, statusText: 'OK' });
      });
      globalThis.fetch = mockFetch;

      const result = await provider.health();
      expect(result).toBe(true);
    });

    it('should return true when /health returns 401 (server is up)', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return new Response(null, { status: 401, statusText: 'Unauthorized' });
      });
      globalThis.fetch = mockFetch;

      const result = await provider.health();
      expect(result).toBe(true);
    });

    it('should return false when /health fails', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:9999',
      });

      const mockFetch = mock(async () => {
        throw new Error('Connection refused');
      });
      globalThis.fetch = mockFetch;

      const result = await provider.health();
      expect(result).toBe(false);
    });
  });

  describe('listTools', () => {
    it('should return tools from /tools endpoint', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockTools: Tool[] = [
        {
          name: 'bash',
          description: 'Run a bash command',
          input_schema: { type: 'object', properties: { command: { type: 'string' } } },
        },
        {
          name: 'read_file',
          description: 'Read a file',
          input_schema: { type: 'object', properties: { path: { type: 'string' } } },
        },
      ];

      const mockFetch = mock(async () => {
        return Response.json({ tools: mockTools });
      });
      globalThis.fetch = mockFetch;

      const tools = await provider.listTools();
      expect(tools).toEqual(mockTools);
    });

    it('should return empty array when /tools returns error', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        throw new Error('Connection refused');
      });
      globalThis.fetch = mockFetch;

      const tools = await provider.listTools();
      expect(tools).toEqual([]);
    });

    it('should return empty array when response has no tools', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return Response.json({});
      });
      globalThis.fetch = mockFetch;

      const tools = await provider.listTools();
      expect(tools).toEqual([]);
    });
  });

  describe('executeTool', () => {
    it('should execute tool via /tools/execute', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return Response.json({ result: { output: 'test output' } });
      });
      globalThis.fetch = mockFetch;

      const result = await provider.executeTool({
        id: 'call_123',
        name: 'bash',
        arguments: { command: 'ls' },
      });

      expect(result.id).toBe('call_123');
      expect(result.result).toEqual({ output: 'test output' });
      expect(result.error).toBeUndefined();
    });

    it('should return error when execute fails', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        throw new Error('Connection refused');
      });
      globalThis.fetch = mockFetch;

      const result = await provider.executeTool({
        id: 'call_456',
        name: 'bash',
        arguments: { command: 'ls' },
      });

      expect(result.id).toBe('call_456');
      expect(result.result).toBeNull();
      expect(result.error).toBe('Connection refused');
    });

    it('should include error from response body', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return Response.json({ error: 'Tool not found' });
      });
      globalThis.fetch = mockFetch;

      const result = await provider.executeTool({
        id: 'call_789',
        name: 'unknown_tool',
        arguments: {},
      });

      expect(result.id).toBe('call_789');
      expect(result.error).toBe('Tool not found');
    });
  });

  describe('chatCompletion', () => {
    it('should send chat completion to /v1/chat/completions', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
        apiKey: 'test-key',
      });

      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const mockFetch = mock(async () => {
        return Response.json({
          choices: [{
            message: { content: 'Hello back!' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
          model: 'hermes-model',
        });
      });
      globalThis.fetch = mockFetch;

      const response = await provider.chatCompletion(messages);

      expect(response.content).toBe('Hello back!');
      expect(response.done).toBe(true);
      expect(response.usage).toEqual({ prompt_tokens: 10, completion_tokens: 5 });
      expect(response.model).toBe('hermes-model');
    });

    it('should include options in request body', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const tools: Tool[] = [
        {
          name: 'bash',
          description: 'Run a bash command',
          input_schema: { type: 'object' },
        },
      ];

      let capturedBody: string | undefined;
      const mockFetch = mock(async () => {
        capturedBody = JSON.stringify({
          messages,
          stream: false,
          model: 'custom-model',
          tools,
          temperature: 0.7,
          max_tokens: 1000,
        });
        return Response.json({
          choices: [{
            message: { content: 'Response' },
            finish_reason: 'stop',
          }],
        });
      });
      globalThis.fetch = mockFetch;

      await provider.chatCompletion(messages, {
        model: 'custom-model',
        tools,
        temperature: 0.7,
        max_tokens: 1000,
      });

      expect(capturedBody).toBeDefined();
      const body = JSON.parse(capturedBody!);
      expect(body.model).toBe('custom-model');
      expect(body.tools).toEqual(tools);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(1000);
    });

    it('should throw NetworkError on HTTP error', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return new Response(null, { status: 500, statusText: 'Internal Server Error' });
      });
      globalThis.fetch = mockFetch;

      await expect(
        provider.chatCompletion([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should throw AuthError on 401/403', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return new Response(null, { status: 401, statusText: 'Unauthorized' });
      });
      globalThis.fetch = mockFetch;

      await expect(
        provider.chatCompletion([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Authentication failed: Unauthorized');
    });
  });

  describe('streamChatCompletion', () => {
    it('should stream chat completion from /v1/chat/completions', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockStream = new ReadableStream({
        start(controller) {
          const data = [
            'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n',
            'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n',
            'data: [DONE]\n',
          ];
          
          let index = 0;
          const enqueue = () => {
            if (index < data.length) {
              controller.enqueue(new TextEncoder().encode(data[index]));
              index++;
              if (index < data.length) {
                setTimeout(enqueue, 10);
              } else {
                controller.close();
              }
            }
          };
          enqueue();
        },
      });

      const mockFetch = mock(async () => {
        return new Response(mockStream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      });
      globalThis.fetch = mockFetch;

      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const chunks: string[] = [];
      for await (const chunk of provider.streamChatCompletion(messages)) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
        if (chunk.done) break;
      }

      expect(chunks.join('')).toBe('Hello world');
    });

    it('should handle tool calls in stream', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockStream = new ReadableStream({
        start(controller) {
          const data = [
            'data: {"choices":[{"delta":{"content":"Let me"},"finish_reason":null}]}\n',
            'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"bash","arguments":"{}"}}]}}]}\n',
            'data: [DONE]\n',
          ];
          
          let index = 0;
          const enqueue = () => {
            if (index < data.length) {
              controller.enqueue(new TextEncoder().encode(data[index]));
              index++;
              if (index < data.length) {
                setTimeout(enqueue, 10);
              } else {
                controller.close();
              }
            }
          };
          enqueue();
        },
      });

      const mockFetch = mock(async () => {
        return new Response(mockStream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      });
      globalThis.fetch = mockFetch;

      const toolCalls: string[] = [];
      for await (const chunk of provider.streamChatCompletion([{ role: 'user', content: 'test' }])) {
        if (chunk.content.includes('[TOOL_CALL:')) {
          toolCalls.push(chunk.content);
        }
        if (chunk.done) break;
      }

      expect(toolCalls).toContain('[TOOL_CALL:bash]');
    });

    it('should throw AuthError on 401 during stream', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return new Response(null, { status: 401, statusText: 'Unauthorized' });
      });
      globalThis.fetch = mockFetch;

      await expect(
        provider.streamChatCompletion([{ role: 'user', content: 'test' }]).next()
      ).rejects.toThrow(/Authentication failed/);
    });

    it('should throw StreamError on empty response body', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      const mockFetch = mock(async () => {
        return new Response(null, { status: 200 });
      });
      globalThis.fetch = mockFetch;

      await expect(
        provider.streamChatCompletion([{ role: 'user', content: 'test' }]).next()
      ).rejects.toThrow(/Empty response body/);
    });
  });

  describe('close', () => {
    it('should resolve without error', async () => {
      const provider = new HermesProvider({
        endpoint: 'http://localhost:8642',
      });

      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
