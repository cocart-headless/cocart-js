import { describe, it, expect } from 'vitest';

import { CoCart } from '@cocartheadless/sdk';
import { applyAuthHeader } from './apply-auth-header.js';

describe('applyAuthHeader (shared)', () => {
  it('applies a Bearer token as the JWT', () => {
    const client = new CoCart('https://store.example.com');
    applyAuthHeader(client, 'Bearer jwt-123');

    expect(client.getJwtToken()).toBe('jwt-123');
    expect(client.isAuthenticated()).toBe(true);
  });

  it('applies a Basic Auth value as username/password', () => {
    const client = new CoCart('https://store.example.com');
    const encoded = btoa('customer@email.com:secret');
    applyAuthHeader(client, `Basic ${encoded}`);

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getJwtToken()).toBeNull();
  });

  it('is a no-op for a null header', () => {
    const client = new CoCart('https://store.example.com');
    applyAuthHeader(client, null);

    expect(client.isAuthenticated()).toBe(false);
  });

  it('is a no-op for an undefined header', () => {
    const client = new CoCart('https://store.example.com');
    applyAuthHeader(client, undefined);

    expect(client.isAuthenticated()).toBe(false);
  });

  it('is a no-op for an unrecognized scheme', () => {
    const client = new CoCart('https://store.example.com');
    applyAuthHeader(client, 'Digest something');

    expect(client.isAuthenticated()).toBe(false);
  });

  it('is a no-op for malformed Basic Auth base64', () => {
    const client = new CoCart('https://store.example.com');
    applyAuthHeader(client, 'Basic not-valid-base64!!!');

    expect(client.isAuthenticated()).toBe(false);
  });

  it('is a no-op for a Basic value missing the colon separator', () => {
    const client = new CoCart('https://store.example.com');
    const encoded = btoa('no-colon-here');
    applyAuthHeader(client, `Basic ${encoded}`);

    expect(client.isAuthenticated()).toBe(false);
  });
});
