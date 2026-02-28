import type { Response } from './response.js';

/**
 * An async iterable that automatically paginates through API results.
 *
 * @example
 * ```typescript
 * for await (const page of client.products().allPaginated({ per_page: 20 })) {
 *   console.log(page.toObject());
 * }
 *
 * // Or collect all pages into an array
 * const allPages = await client.products().allPaginated({ per_page: 50 }).toArray();
 * ```
 */
export class Paginator implements AsyncIterable<Response> {
  private fetchPage: (page: number) => Promise<Response>;
  private startPage: number;

  constructor(fetchPage: (page: number) => Promise<Response>, startPage: number = 1) {
    this.fetchPage = fetchPage;
    this.startPage = startPage;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Response> {
    let page = this.startPage;

    while (true) {
      const response = await this.fetchPage(page);
      yield response;

      const totalPages = response.getTotalPages();
      if (totalPages === null || page >= totalPages) {
        break;
      }

      page++;
    }
  }

  /** Collect all pages into an array. */
  async toArray(): Promise<Response[]> {
    const results: Response[] = [];
    for await (const page of this) {
      results.push(page);
    }
    return results;
  }
}
