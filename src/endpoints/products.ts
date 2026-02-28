import { Endpoint } from './endpoint.js';
import type { Response } from '../response.js';
import { Paginator } from '../paginator.js';
import type {
  ProductListParams, ProductParams, SortOrder, StockStatus, ProductOrderBy,
} from '../cocart.types.js';

/**
 * Products Endpoint
 *
 * Handles all product-related API operations.
 * Products API is publicly accessible without authentication.
 */
export class Products extends Endpoint {
  protected endpoint = 'products';

  /** Get all products. */
  async all(params?: ProductListParams): Promise<Response> {
    return this.get('', params ? this.stringifyParams(params) : undefined);
  }

  /** Get a single product by ID. */
  async find(productId: number, params?: ProductParams): Promise<Response> {
    return this.get(String(productId), params ? this.stringifyParams(params) : undefined);
  }

  /** Get a single product by slug. */
  async findBySlug(slug: string, params?: ProductParams): Promise<Response> {
    this.client.requiresBasic('products()->findBySlug');
    return this.get(slug, params ? this.stringifyParams(params) : undefined);
  }

  /** Search products. */
  async search(term: string, params: ProductListParams = {}): Promise<Response> {
    return this.all({ ...params, search: term });
  }

  /** Get products by category. */
  async byCategory(categorySlug: string, params: ProductListParams = {}): Promise<Response> {
    return this.all({ ...params, category: categorySlug });
  }

  /** Get products by tag. */
  async byTag(tagSlug: string, params: ProductListParams = {}): Promise<Response> {
    return this.all({ ...params, tag: tagSlug });
  }

  /** Get featured products. */
  async featured(params: ProductListParams = {}): Promise<Response> {
    return this.all({ ...params, featured: true });
  }

  /** Get products on sale. */
  async onSale(params: ProductListParams = {}): Promise<Response> {
    return this.all({ ...params, on_sale: true });
  }

  /** Get products within a price range. */
  async byPriceRange(
    minPrice?: number | null,
    maxPrice?: number | null,
    params: ProductListParams = {},
  ): Promise<Response> {
    const resolved: ProductListParams = { ...params };
    if (minPrice !== null && minPrice !== undefined) {
      resolved.min_price = minPrice;
    }
    if (maxPrice !== null && maxPrice !== undefined) {
      resolved.max_price = maxPrice;
    }
    return this.all(resolved);
  }

  /** Get products sorted by a field. */
  async sortBy(
    field: ProductOrderBy,
    order: SortOrder = 'asc',
    params: ProductListParams = {},
  ): Promise<Response> {
    return this.all({ ...params, orderby: field, order });
  }

  /** Get products by stock status. */
  async byStockStatus(status: StockStatus, params: ProductListParams = {}): Promise<Response> {
    return this.all({ ...params, stock_status: status });
  }

  /** Get a specific page of products. */
  async paginate(
    page: number = 1,
    perPage: number = 10,
    params: ProductListParams = {},
  ): Promise<Response> {
    return this.all({ ...params, page, per_page: perPage });
  }

  /**
   * Iterate through all pages of products automatically.
   *
   * @example
   * for await (const page of client.products().allPaginated({ per_page: 20 })) {
   *   console.log(page.toObject());
   * }
   *
   * // Or collect all pages
   * const pages = await client.products().allPaginated().toArray();
   */
  allPaginated(params: ProductListParams = {}): Paginator {
    return new Paginator((page) => this.all({ ...params, page }));
  }

  // --- Variations ---

  /** Get product variations. */
  async variations(productId: number, params?: Record<string, string>): Promise<Response> {
    return this.get(`${productId}/variations`, params);
  }

  /** Get a specific variation. */
  async variation(productId: number, variationId: number, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->variation');
    return this.get(`${productId}/variations/${variationId}`, params);
  }

  // --- Categories ---

  /** Get product categories. */
  async categories(params?: Record<string, string>): Promise<Response> {
    return this.get('categories', params);
  }

  /** Get a single category. */
  async category(categoryId: number, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->category');
    return this.get(`categories/${categoryId}`, params);
  }

  // --- Tags ---

  /** Get product tags. */
  async tags(params?: Record<string, string>): Promise<Response> {
    return this.get('tags', params);
  }

  /** Get a single tag. */
  async tag(tagId: number, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->tag');
    return this.get(`tags/${tagId}`, params);
  }

  // --- Attributes ---

  /** Get product attributes. */
  async attributes(params?: Record<string, string>): Promise<Response> {
    return this.get('attributes', params);
  }

  /** Get a single attribute. */
  async attribute(attributeId: number, params?: Record<string, string>): Promise<Response> {
    return this.get(`attributes/${attributeId}`, params);
  }

  /** Get attribute terms. */
  async attributeTerms(attributeId: number, params?: Record<string, string>): Promise<Response> {
    return this.get(`attributes/${attributeId}/terms`, params);
  }

  /** Get a specific term for an attribute (by IDs). */
  async attributeTerm(attributeId: number, termId: number, params?: Record<string, string>): Promise<Response> {
    return this.get(`attributes/${attributeId}/terms/${termId}`, params);
  }

  /** Get an attribute by its slug. */
  async attributeBySlug(slug: string, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->attributeBySlug');
    return this.get(`attributes/${slug}`, params);
  }

  /** Get terms for an attribute by the attribute's slug. */
  async attributeTermsBySlug(slug: string, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->attributeTermsBySlug');
    return this.get(`attributes/${slug}/terms`, params);
  }

  /** Get a specific term by slug for an attribute by slug. */
  async attributeTermBySlug(attrSlug: string, termSlug: string, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->attributeTermBySlug');
    return this.get(`attributes/${attrSlug}/terms/${termSlug}`, params);
  }

  // --- Brands ---

  /** Get product brands. */
  async brands(params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->brands');
    return this.get('brands', params);
  }

  /** Get a single brand. */
  async brand(brandId: number, params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->brand');
    return this.get(`brands/${brandId}`, params);
  }

  /** Get products by brand. */
  async byBrand(brandSlug: string, params: ProductListParams = {}): Promise<Response> {
    this.client.requiresBasic('products()->byBrand');
    return this.all({ ...params, brand: brandSlug });
  }

  // --- Reviews ---

  /** Get product reviews. */
  async reviews(params?: Record<string, string>): Promise<Response> {
    return this.get('reviews', params);
  }

  /** Get reviews for a specific product. */
  async productReviews(productId: number, params: Record<string, string> = {}): Promise<Response> {
    return this.reviews({ ...params, product: String(productId) });
  }

  /** Get the current authenticated user's product reviews. */
  async myReviews(params?: Record<string, string>): Promise<Response> {
    this.client.requiresBasic('products()->myReviews');
    return this.get('reviews/mine', params);
  }

  // --- SEO (requires CoCart SEO Pack plugin) ---

  /** Get SEO data for a product by ID. */
  async seo(productId: number): Promise<Response> {
    return this.get(`${productId}/seo`);
  }

  /** Get SEO data for a product by slug. */
  async seoBySlug(slug: string): Promise<Response> {
    return this.get(`${slug}/seo`);
  }

  // --- Internal ---

  /** Convert typed params to Record<string, string> for the HTTP layer. */
  private stringifyParams(params: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    return result;
  }
}
