import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoCart } from '../src/cocart.js';

function reply(status: number, body: Record<string, unknown> = {}) {
  return {
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function timeout() {
  return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
}

function client(): CoCart {
  const cocart = new CoCart('https://store.com', { maxRetries: 2 });
  (cocart as unknown as { retrySleep: () => Promise<void> }).retrySleep = async () => {};
  return cocart;
}

describe('retries never send a change twice', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('a GET that times out is sent again', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(timeout).mockResolvedValueOnce(reply(200, { items: [] }));
    globalThis.fetch = fetchMock;

    await client().cart().get();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a POST that times out is not sent again: it may have run', async () => {
    const fetchMock = vi.fn().mockImplementation(timeout);
    globalThis.fetch = fetchMock;

    await expect(client().post('checkout', { payment_method: 'stripe' })).rejects.toMatchObject({ errorCode: 'request_timeout' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a POST answered 503 is not sent again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(503, { code: 'service_unavailable', message: 'Unavailable' }));
    globalThis.fetch = fetchMock;

    await expect(client().post('checkout', { payment_method: 'stripe' })).rejects.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a POST answered 429 is sent again: the rate limit refused it before it ran', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(429, { code: 'rate_limit_exceeded', message: 'Too many requests' }))
      .mockResolvedValueOnce(reply(200, { order_id: 217 }));
    globalThis.fetch = fetchMock;

    const response = await client().post('checkout', { payment_method: 'stripe' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.get('order_id')).toBe(217);
  });

  it('a GET answered 503 is sent again', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(503, { code: 'service_unavailable', message: 'Unavailable' }))
      .mockResolvedValueOnce(reply(200, { items: [] }));
    globalThis.fetch = fetchMock;

    await client().cart().get();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
