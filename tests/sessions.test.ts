import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoCart } from '../src/cocart.js';

function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('Sessions endpoint routing', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('all() uses plural "sessions" route', async () => {
    const fetchMock = mockFetch(200, []);
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.sessions().all();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/sessions');
    expect(url).not.toMatch(/\/session\//);
  });

  it('find() uses singular "session/{key}" route', async () => {
    const fetchMock = mockFetch(200, { session_key: 'abc123' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.sessions().find('abc123');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/session/abc123');
    expect(url).not.toContain('/sessions/');
  });

  it('destroy() uses singular "session/{key}" route', async () => {
    const fetchMock = mockFetch(200, { deleted: true });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.sessions().destroy('abc123');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/session/abc123');
    expect(url).not.toContain('/sessions/');
    expect(opts.method).toBe('DELETE');
  });

  it('getItems() uses singular "session/{key}/items" route', async () => {
    const fetchMock = mockFetch(200, { items: [] });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.sessions().getItems('abc123');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/session/abc123/items');
    expect(url).not.toContain('/sessions/');
  });

  it('bySession() uses singular "session/{id}" route', async () => {
    const fetchMock = mockFetch(200, { session_key: '42' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.sessions().bySession(42);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/session/42');
    expect(url).not.toContain('/sessions/');
  });

  it('destroySession() uses singular "session/{id}" route', async () => {
    const fetchMock = mockFetch(200, { deleted: true });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.sessions().destroySession(42);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/session/42');
    expect(url).not.toContain('/sessions/');
    expect(opts.method).toBe('DELETE');
  });
});
