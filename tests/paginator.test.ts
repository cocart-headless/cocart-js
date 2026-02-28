import { describe, it, expect, vi } from 'vitest';
import { Paginator } from '../src/paginator.js';
import { Response } from '../src/response.js';

function makePageResponse(page: number, totalPages: number, items: unknown[]): Response {
  const headers = new Headers({
    'X-WP-Total': String(totalPages * items.length),
    'X-WP-TotalPages': String(totalPages),
  });
  return new Response(200, headers, JSON.stringify(items));
}

describe('Paginator', () => {
  it('iterates through all pages', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePageResponse(1, 3, [{ id: 1 }]))
      .mockResolvedValueOnce(makePageResponse(2, 3, [{ id: 2 }]))
      .mockResolvedValueOnce(makePageResponse(3, 3, [{ id: 3 }]));

    const paginator = new Paginator(fetchPage);
    const pages: Response[] = [];

    for await (const page of paginator) {
      pages.push(page);
    }

    expect(pages).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 3);
  });

  it('stops when totalPages is null', async () => {
    const response = new Response(200, new Headers(), JSON.stringify([{ id: 1 }]));
    const fetchPage = vi.fn().mockResolvedValue(response);

    const paginator = new Paginator(fetchPage);
    const pages: Response[] = [];

    for await (const page of paginator) {
      pages.push(page);
    }

    expect(pages).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it('handles single page result', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePageResponse(1, 1, [{ id: 1 }]));

    const paginator = new Paginator(fetchPage);
    const pages: Response[] = [];

    for await (const page of paginator) {
      pages.push(page);
    }

    expect(pages).toHaveLength(1);
  });

  it('toArray() collects all pages', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePageResponse(1, 2, [{ id: 1 }]))
      .mockResolvedValueOnce(makePageResponse(2, 2, [{ id: 2 }]));

    const paginator = new Paginator(fetchPage);
    const pages = await paginator.toArray();

    expect(pages).toHaveLength(2);
  });

  it('respects custom start page', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePageResponse(3, 3, [{ id: 3 }]));

    const paginator = new Paginator(fetchPage, 3);
    const pages = await paginator.toArray();

    expect(pages).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledWith(3);
  });
});
