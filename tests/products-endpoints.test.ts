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
