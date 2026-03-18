import { describe, it, expect } from 'vitest';

import { createServerClient } from './index.js';

function makeFastifyRequest(cartKey?: string | string[]) {
  return {
    headers: cartKey !== undefined ? { 'x-cart-key': cartKey } : {},
  };
}

describe('Fastify adapter', () => {
  describe('createServerClient', () => {
    it('reads x-cart-key from Fastify request headers', () => {
      const client = createServerClient('https://store.example.com', makeFastifyRequest('abc123'));
      expect(client.getCartKey()).toBe('abc123');
    });

    it('normalises array header values to the first string', () => {
      const client = createServerClient('https://store.example.com', makeFastifyRequest(['first', 'second']));
      expect(client.getCartKey()).toBe('first');
    });

    it('returns null cart key when header is absent', () => {
      const client = createServerClient('https://store.example.com', makeFastifyRequest());
      expect(client.getCartKey()).toBeNull();
    });

    it('returns a CoCart instance', () => {
      const client = createServerClient('https://store.example.com', makeFastifyRequest());
      expect(typeof client.getCartKey).toBe('function');
    });
  });
});
