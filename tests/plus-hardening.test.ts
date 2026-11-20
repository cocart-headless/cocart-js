import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoCart } from '../src/cocart.js';
import { AuthenticationError, CoCartError, ValidationError } from '../src/index.js';

function reply(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  return {
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('client hardening for CoCart Plus 2.0', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('waits as long as RateLimit-Retry-After says before retrying a 429', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(reply(429, { code: 'cocart_rate_limited', message: 'Slow down' }, { 'RateLimit-Retry-After': '7' }))
      .mockResolvedValueOnce(reply(200, { items: [] }));
    const client = new CoCart('https://store.com', { maxRetries: 1 });
    const delays: number[] = [];
    (client as unknown as { retrySleep: (ms: number) => Promise<void> }).retrySleep = async (ms) => { delays.push(ms); };

    await client.cart().get();

    expect(delays).toEqual([7000]);
  });

  it('still reads Retry-After when that is all a proxy sends', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(reply(429, {}, { 'Retry-After': '3' }))
      .mockResolvedValueOnce(reply(200, {}));
    const client = new CoCart('https://store.com', { maxRetries: 1 });
    const delays: number[] = [];
    (client as unknown as { retrySleep: (ms: number) => Promise<void> }).retrySleep = async (ms) => { delays.push(ms); };

    await client.cart().get();

    expect(delays).toEqual([3000]);
  });

  it('debug output hides every query value: cart keys, order keys and emails stay out of logs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(200, {}));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const client = new CoCart('https://store.com', { debug: true });

    await client.get('cart', { order_key: 'wc_order_secret', email: 'jane@example.com' });
    await client.requestRaw('GET', 'cocart/v2/order-received/12', { order_key: 'wc_order_secret', email: 'jane@example.com' });

    const output = log.mock.calls.flat().join('\n');
    expect(output).toContain('order_key=***');
    expect(output).toContain('email=***');
    expect(output).not.toContain('wc_order_secret');
    expect(output).not.toContain('jane@example.com');
  });

  it('does not keep a no-store response in the ETag cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { object: 'order' }, {
      ETag: '"abc"',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
    }));
    globalThis.fetch = fetchMock;
    const client = new CoCart('https://store.com');

    await client.get('cart');
    await client.get('cart');

    const secondHeaders = fetchMock.mock.calls[1]![1].headers as Record<string, string>;
    expect(secondHeaders['If-None-Match']).toBeUndefined();
  });

  it('still uses the ETag cache for a response that may be stored', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { items: [] }, { ETag: '"abc"' }));
    globalThis.fetch = fetchMock;
    const client = new CoCart('https://store.com');

    await client.get('products');
    await client.get('products');

    const secondHeaders = fetchMock.mock.calls[1]![1].headers as Record<string, string>;
    expect(secondHeaders['If-None-Match']).toBe('"abc"');
  });

  it('a CoCart Plus request (requestRaw) emits request and response events, with the response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(200, { object: 'order', result: { code: 'order_placed' } }));
    const client = new CoCart('https://store.com');
    const seen: string[] = [];
    let code: unknown;
    client.on('request', ({ method }) => seen.push(`request ${method}`));
    client.on('response', ({ status, response }) => {
      seen.push(`response ${status}`);
      code = (response?.toObject() as { result?: { code?: string } }).result?.code;
    });

    await client.requestRaw('POST', 'cocart/v2/checkout', undefined, { payment_method: 'cod' });

    expect(seen).toEqual(['request POST', 'response 200']);
    expect(code).toBe('order_placed');
  });

  it('a CoCart Plus error names its route and emits an error event', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(404, { code: 'cocart_order_not_found', message: 'Not found.', data: { status: 404 } }));
    const client = new CoCart('https://store.com');
    const errors: string[] = [];
    client.on('error', ({ error }) => errors.push(error.message));

    await expect(client.requestRaw('GET', 'cocart/v2/order-received/12', { order_key: 'wc_order_secret' })).rejects.toThrow(
      'GET /cocart/v2/order-received/12: Not found. [cocart_order_not_found]',
    );
    expect(errors).toEqual(['GET /cocart/v2/order-received/12: Not found. [cocart_order_not_found]']);
  });

  it('a 409 is never a validation error, even when its code says "invalid"', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(409, { code: 'cocart_order_invalid_status', message: 'Paid already.', data: { status: 409 } }));
    const client = new CoCart('https://store.com');

    const error = await client.requestRaw('POST', 'cocart/v2/order-received/12/pay').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CoCartError);
    expect(error).not.toBeInstanceOf(ValidationError);
    expect((error as CoCartError).httpCode).toBe(409);
  });

  it('400 is still a validation error and 401 an authentication error', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(reply(400, { code: 'cocart_field_required', message: 'Missing.', data: { status: 400 } }))
      .mockResolvedValueOnce(reply(401, { code: 'cocart_rest_authentication_required', message: 'Log in.', data: { status: 401 } }));
    const client = new CoCart('https://store.com');

    await expect(client.requestRaw('POST', 'cocart/v2/checkout')).rejects.toBeInstanceOf(ValidationError);
    await expect(client.requestRaw('GET', 'cocart/v2/my-account')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('reads every field at fault, the first one and the reason from an error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(400, {
      code: 'cocart_invalid_address_fields',
      message: 'Check the address.',
      data: { status: 400, field: 'billing.postcode', fields: { 'billing.postcode': 'Enter a valid postcode.', 'billing.phone': 'Enter a phone number.' }, reason: 'postcode_format' },
    }));
    const client = new CoCart('https://store.com');

    const error = (await client.requestRaw('PUT', 'cocart/v2/checkout').catch((e: unknown) => e)) as CoCartError;

    expect(error.getFields()).toEqual({ 'billing.postcode': 'Enter a valid postcode.', 'billing.phone': 'Enter a phone number.' });
    expect(error.getField()).toBe('billing.postcode');
    expect(error.getReason()).toBe('postcode_format');
  });

  it('an error without field details gives an empty map and nulls', () => {
    const error = new CoCartError('Nope', 404, 'cocart_order_not_found', { code: 'cocart_order_not_found', data: { status: 404 } });

    expect(error.getFields()).toEqual({});
    expect(error.getField()).toBeNull();
    expect(error.getReason()).toBeNull();
  });
});
