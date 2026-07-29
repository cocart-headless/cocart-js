/**
 * Compile-time regression test for `Products.find()` accepting a SKU.
 *
 * The original bug was a TypeScript signature restriction
 * (`find(productId: number, ...)`), not a runtime logic bug — the server
 * has always resolved a SKU passed to `GET /products/{id}`. Because JS
 * doesn't enforce parameter types, a runtime unit test calling
 * `find('SKU')` passes identically whether this signature is fixed or not,
 * so it can't catch a regression here (see tests/products-endpoints.test.ts
 * for the corresponding note). This file is what actually catches it: it's
 * inside `src`, which `npm run typecheck` (`tsc --noEmit`) compiles — unlike
 * `tests/`, which tsconfig.json excludes from type-checking. It is not
 * imported by anything and is not part of the published build (tsup only
 * bundles from the `src/index.ts` entry chain).
 *
 * If `Products.find()`'s first parameter ever regresses back to
 * `productId: number`, the `find(sku)` call below fails to compile and
 * `npm run typecheck` (and CI's "Type check" step) fails.
 */

import type { Products } from '../endpoints/products.js';

declare const products: Products;

// Numeric ID — always valid.
void products.find(123);

// SKU string — this is the actual regression check.
void products.find('PCT-2024');
