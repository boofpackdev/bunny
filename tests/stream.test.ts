import { describe, it, expect } from 'bun:test';
import { streamChat } from '../src/stream';
import { StreamError, TimeoutError } from '../src/errors';

describe('stream', () => {
  it('should throw StreamError for invalid endpoint', async () => {
    await expect(
      streamChat('hello', {
        endpoint: 'http://localhost:9999',
        stream: true,
        jsonOutput: false,
        timeout: 1000,
      })
    ).rejects.toThrow(StreamError);
  });

  it('should throw TimeoutError for quick timeout', async () => {
    await expect(
      streamChat('hello', {
        endpoint: 'http://localhost:8000',
        stream: true,
        jsonOutput: false,
        timeout: 1, // 1ms timeout
      })
    ).rejects.toThrow(TimeoutError);
  });
});
