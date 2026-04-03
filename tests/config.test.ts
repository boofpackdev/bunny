import { describe, it, expect, mock } from 'bun:test';
import { existsSync, readFileSync } from 'fs';

describe('config', () => {
  describe('discoverEndpoint', () => {
    it('should return HERMES_ENDPOINT env var if set', async () => {
      // Set env var
      const original = process.env.HERMES_ENDPOINT;
      process.env.HERMES_ENDPOINT = 'http://custom:9000';

      // Re-import to pick up env change
      const { discoverEndpoint } = await import('../src/config');

      const endpoint = await discoverEndpoint();
      expect(endpoint).toBe('http://custom:9000');

      // Cleanup
      if (original) {
        process.env.HERMES_ENDPOINT = original;
      } else {
        delete process.env.HERMES_ENDPOINT;
      }
    });
  });

  describe('getAuthHeader', () => {
    it('should return Bearer token from HERMES_API_KEY env var', async () => {
      const original = process.env.HERMES_API_KEY;
      process.env.HERMES_API_KEY = 'test-key-123';

      const { getAuthHeader } = await import('../src/config');

      const header = await getAuthHeader();
      expect(header).toBe('Bearer test-key-123');

      if (original) {
        process.env.HERMES_API_KEY = original;
      } else {
        delete process.env.HERMES_API_KEY;
      }
    });
  });
});
