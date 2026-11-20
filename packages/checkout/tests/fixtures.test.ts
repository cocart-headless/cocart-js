import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutResult, CoCart, CoCartError, Response } from '@cocartheadless/sdk';
import { createCheckout } from '../src/index.js';

/**
 * Runs the shared checkout fixtures (tests/fixtures/*.json): the same request/response data every
 * CoCart SDK replays against its own client. See tests/fixtures/README.md for the format.
 */

interface Exchange {
  request: { method: string; path: string; query: Record<string, string>; body: unknown };
  response: { status: number; body: unknown };
}

interface Fixture {
  name: string;
  call: { target: 'checkout' | 'account'; method: string; args: unknown[] };
  exchanges: Exchange[];
  expect: {
    result?: Record<string, unknown>;
    value?: unknown;
    responseBody?: unknown;
    error?: { code: string; checkoutId?: string };
  };
}

declare global {
  interface ImportMeta {
    glob<T>(pattern: string, options: { eager: true; import: 'default' }): Record<string, T>;
  }
}

const STORE = 'https://store.com/wp-json/';
const fixtures: Array<[string, Fixture]> = Object.entries(
  import.meta.glob<Fixture>('./fixtures/*.json', { eager: true, import: 'default' }),
).map(([path, fixture]) => [path.replace(/^.*\/|\.json$/g, ''), fixture]);

function mockTransport(exchanges: Exchange[]) {
  const seen: Exchange['request'][] = [];
  const fetchMock = vi.fn(async (url: string, init: { method: string; body?: string }) => {
    const parsed = new URL(url);
    seen.push({
      method: init.method,
      path: parsed.href.slice(STORE.length).split('?')[0],
      query: Object.fromEntries(parsed.searchParams),
      body: init.body ? JSON.parse(init.body) : null,
    });
    const reply = exchanges[seen.length - 1]?.response ?? { status: 500, body: { code: 'unexpected_request' } };
    return {
      status: reply.status,
      headers: new Headers(),
      text: () => Promise.resolve(JSON.stringify(reply.body)),
    };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return seen;
}

function bodyOf(value: unknown): unknown {
  if (value instanceof CheckoutResult) return value.response?.toObject();
  if (value instanceof Response) return value.toObject();
  return value;
}

describe('shared checkout fixtures', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('runs every fixture', () => {
    expect(fixtures).toHaveLength(53);
  });

  it.each(fixtures)('%s', async (_slug, fixture) => {
    const seen = mockTransport(fixture.exchanges);
    const client = new CoCart('https://store.com').use(createCheckout());
    const target = (fixture.call.target === 'account' ? client.account() : client.checkout) as unknown as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >;

    let outcome: unknown;
    let error: unknown;
    try {
      outcome = await target[fixture.call.method](...fixture.call.args);
    } catch (e) {
      error = e;
    }

    expect(seen).toEqual(fixture.exchanges.map((exchange) => exchange.request));

    if (fixture.expect.error) {
      expect(error).toBeInstanceOf(CoCartError);
      expect((error as CoCartError).errorCode).toBe(fixture.expect.error.code);
      // The checkout-outcome-unknown error carries the checkout_id to ask getCheckoutStatus() about.
      if (fixture.expect.error.checkoutId !== undefined) {
        expect((error as { checkoutId?: string }).checkoutId).toBe(fixture.expect.error.checkoutId);
      }
      return;
    }
    if (error) throw error;

    if (fixture.expect.result) {
      expect(outcome).toBeInstanceOf(CheckoutResult);
      const result = outcome as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(fixture.expect.result)) {
        // `null` in a fixture is a field the result leaves out.
        expect(result[key] ?? null, key).toEqual(value);
      }
    }
    if ('value' in fixture.expect) expect(outcome).toEqual(fixture.expect.value);
    if ('responseBody' in fixture.expect) expect(bodyOf(outcome)).toEqual(fixture.expect.responseBody);
  });
});
