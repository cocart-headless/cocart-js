/**
 * Compile-time check that the response types match real CoCart responses.
 *
 * The JSON files in ./fixtures were recorded from a live store (CoCart Starter
 * 5.0.0-internal-test.08.10-2, CoCart Plus 2.0.0-internal-build.08.10-2) with
 * WooCommerce-Store-API-SDK/scripts/cocart-validate-live.mjs, which also checks them
 * against the OpenAPI spec the types are generated from (guest cart keys scrubbed).
 * TypeScript infers each file's exact shape, so `satisfies` fails `npm run typecheck`
 * if a type requires a field the API doesn't send, has the wrong type for one, or
 * can't take how CoCart sends data (`{}` for empty maps, minor-unit strings, prefixed
 * address fields). Not imported by anything and not part of the published build.
 *
 * Re-record the fixtures after a CoCart release that changes response shapes.
 */
import type {
  CartItem,
  CartResponse,
  CartTotalsBreakdown,
  Product,
  ProductCategoryDetail,
  ProductReview,
  ProductTag,
  ProductVariation,
  StoreInfo,
} from '../cocart.types.js';
import cart from './fixtures/cart.json';
import cartItems from './fixtures/cart-items.json';
import cartTotals from './fixtures/cart-totals.json';
import categories from './fixtures/categories.json';
import productSimple from './fixtures/product-simple.json';
import productVariable from './fixtures/product-variable.json';
import productVariation from './fixtures/product-variation.json';
import productVariations from './fixtures/product-variations.json';
import products from './fixtures/products.json';
import reviews from './fixtures/reviews.json';
import store from './fixtures/store.json';
import tags from './fixtures/tags.json';

/**
 * Adapts the types to how TypeScript infers JSON imports, without loosening what's checked:
 * - every string is inferred as `string`, so literal unions (`type: 'simple' | ...`,
 *   `stock_status`) are widened to `string`;
 * - objects in one array with different keys are unioned with `key?: undefined` for the keys
 *   the others have, so maps (index signatures, e.g. attribute `options`) also take `undefined`.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : T extends object
      ? string extends keyof T
        ? { [K in keyof T]?: Widen<T[K]> | undefined }
        : { [K in keyof T]: Widen<T[K]> }
      : T;

// Cart
cart satisfies Widen<CartResponse>;
cartItems satisfies Record<string, Widen<CartItem>>;
cartTotals satisfies Widen<CartTotalsBreakdown>;

// Catalogue
products.products satisfies Widen<Product>[];
productSimple satisfies Widen<Product>;
productVariable satisfies Widen<Product>;
productVariations satisfies Widen<ProductVariation>[];
productVariation satisfies Widen<ProductVariation>;
categories satisfies Widen<ProductCategoryDetail>[];
tags satisfies Widen<ProductTag>[];
reviews satisfies Widen<ProductReview>[];

// Store
store satisfies Widen<StoreInfo>;

// The quirks, spelled out: these must keep compiling. Empty maps are `{}` since CoCart Starter 5.
const notices: CartResponse['notices'] = {};
const priceRange: Product['prices']['price_range'] = {};
const attributes: Product['attributes'] = {};
const billingFirstName: CartResponse['customer']['billing_address']['billing_first_name'] = '';
void notices;
void priceRange;
void attributes;
void billingFirstName;
