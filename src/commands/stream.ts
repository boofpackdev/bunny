import { NetworkError, StreamError, TimeoutError } from '../errors';
import type { ChatOptions, StreamChunk } from '../types';

const SSE_LINE_PREFIX = 'data: ';

export async function streamChat(
  message: string,
  options: ChatOptions
): Promise<void> {
  const { endpoint, stream, timeout, auth, model } = options;
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const requestBody: any = {
      messages: [{ role: 'user', content: message }],
      stream: stream,
    };

    if (model) {
      requestBody.model = model;
    }

    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth && { Authorization: auth }),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new StreamError('Empty response body');
    }

    if (!stream) {
      // Non-streaming mode
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      console.log(data.choices?.[0]?.message?.content || '');
      return;
    }

    // Streaming mode
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line === 'data: [DONE]') {
          console.log(); // Final newline
          return;
        }

        if (line.startsWith(SSE_LINE_PREFIX)) {
          const jsonStr = line.slice(SSE_LINE_PREFIX.length);
          try {
            const data = JSON.parse(jsonStr);
            const token = data.choices?.[0]?.delta?.content;
            if (token) {
              process.stdout.write(token);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    console.log(); // Final newline
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeout}ms`);
    }

    if (error instanceof NetworkError || error instanceof StreamError || error instanceof TimeoutError) {
      throw error;
    }

    throw new StreamError(`Stream error: ${error.message}`);
  }
}
