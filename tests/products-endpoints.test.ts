import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoCart } from '../src/cocart.js';

function mockFetch(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('Products endpoint methods', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('find() sends GET to products/{id} for a numeric ID', async () => {
    const fetchMock = mockFetch(200, { id: 278 });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().find(278);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/278');
    expect(opts.method).toBe('GET');
  });

  // find() accepting a SKU string was never actually broken at runtime —
  // JS doesn't enforce parameter types, so this passes identically whether
  // find()'s TypeScript signature is `productId: number` or
  // `productId: string | number`. This test only covers that the request
  // URL is built correctly for non-numeric input; it is NOT a regression
  // test for the SKU-support fix (that was a type-level bug). The actual
  // regression test lives in src/__type-tests__/products-find.types.ts,
  // which `npm run typecheck` compiles.
  it('find() sends GET to products/{value} using whatever string it is given', async () => {
    const fetchMock = mockFetch(200, { sku: 'PCT-2024' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().find('PCT-2024');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/PCT-2024');
  });

  it('findBySlug() sends GET to products/{slug}', async () => {
    const fetchMock = mockFetch(200, { slug: 'blue-hoodie' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().findBySlug('blue-hoodie');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/blue-hoodie');
    expect(opts.method).toBe('GET');
  });

  it('attributeTerm() sends GET to products/attributes/{id}/terms/{id}', async () => {
    const fetchMock = mockFetch(200, { id: 5 });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().attributeTerm(3, 5);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/attributes/3/terms/5');
  });

  it('attributeBySlug() sends GET to products/attributes/{slug}', async () => {
    const fetchMock = mockFetch(200, { slug: 'color' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().attributeBySlug('color');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/attributes/color');
  });

  it('attributeTermsBySlug() sends GET to products/attributes/{slug}/terms', async () => {
    const fetchMock = mockFetch(200, [{ name: 'Red' }]);
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().attributeTermsBySlug('color');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/attributes/color/terms');
    // Ensure it's not hitting a specific term
    expect(url).not.toMatch(/\/terms\/[^?]/);
  });

  it('attributeTermBySlug() sends GET to products/attributes/{slug}/terms/{slug}', async () => {
    const fetchMock = mockFetch(200, { name: 'Red' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().attributeTermBySlug('color', 'red');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/attributes/color/terms/red');
  });

  it('myReviews() sends GET to products/reviews/mine', async () => {
    const fetchMock = mockFetch(200, [{ rating: 5 }]);
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().myReviews();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/reviews/mine');
    expect(opts.method).toBe('GET');
  });

  it('seo() sends GET to products/{id}/seo', async () => {
    const fetchMock = mockFetch(200, { provider: 'yoast' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().seo(42);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/42/seo');
  });

  it('seoBySlug() sends GET to products/{slug}/seo', async () => {
    const fetchMock = mockFetch(200, { provider: 'yoast' });
    globalThis.fetch = fetchMock;

    const client = new CoCart('https://store.com');
    await client.products().seoBySlug('blue-hoodie');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/blue-hoodie/seo');
  });
});
