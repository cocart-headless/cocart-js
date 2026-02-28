# Products API

The Products API lets you browse your store's catalog — listing products, searching, filtering by category or price, and reading product details. It is publicly accessible and does not require authentication, just like a customer browsing your store's shelves.

```ts
const products = client.products();
```

## List Products

```ts
const response = await client.products().all();
const response = await client.products().all({ per_page: '20', page: '1' });
```

## Parameters Reference

**Query parameters** are options you send alongside a request to filter or control the results. They are appended to the URL as `?key=value` pairs. The SDK handles this for you — just pass an object with the parameters you want.

All list methods accept an optional `params` object with these query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 10, max: 100) |
| `search` | string | Search term |
| `category` | string | Filter by category slug |
| `tag` | string | Filter by tag slug |
| `status` | string | Product status |
| `featured` | bool | Show only featured products |
| `on_sale` | bool | Show only products on sale |
| `min_price` | string | Minimum price |
| `max_price` | string | Maximum price |
| `stock_status` | string | Stock status (`instock`, `outofstock`, `onbackorder`) |
| `orderby` | string | Sort field (`date`, `id`, `title`, `slug`, `price`, `popularity`, `rating`) |
| `order` | string | Sort direction (`asc`, `desc`) |

## Filtering

### By Category

```ts
const response = await client.products().byCategory('electronics');

// With additional params
const response = await client.products().byCategory('electronics', {
  per_page: '20',
  orderby: 'price',
  order: 'asc',
});
```

### By Tag

```ts
const response = await client.products().byTag('new-arrival');
```

### Featured Products

```ts
const response = await client.products().featured();
const response = await client.products().featured({ per_page: '4' });
```

### Products on Sale

```ts
const response = await client.products().onSale();
```

### By Price Range

```ts
// Products between $10 and $50
const response = await client.products().byPriceRange(10, 50);

// Products under $25
const response = await client.products().byPriceRange(null, 25);

// Products over $100
const response = await client.products().byPriceRange(100);
```

### Search

```ts
const response = await client.products().search('wireless headphones');

// Search within a category
const response = await client.products().search('headphones', {
  category: 'electronics',
});
```

### Combining Filters

```ts
const response = await client.products().all({
  category: 'clothing',
  on_sale: 'true',
  min_price: '20',
  max_price: '100',
  orderby: 'popularity',
  order: 'desc',
  per_page: '12',
});
```

### By Stock Status

```ts
const response = await client.products().byStockStatus('instock');
const response = await client.products().byStockStatus('outofstock');
const response = await client.products().byStockStatus('onbackorder');
```

## Pagination & Sorting

**Pagination** is how the API delivers large sets of results in smaller chunks called "pages." If your store has 500 products, you don't want to download all of them at once — instead, you request page 1 (products 1-20), then page 2 (products 21-40), and so on. **Sorting** controls the order results come back in (cheapest first, newest first, etc.).

### Paginate Helper

```ts
// Page 1, 12 products per page
const response = await client.products().paginate(1, 12);

// Page 2
const response = await client.products().paginate(2, 12);
```

### Sort Helper

```ts
// Cheapest first
const response = await client.products().sortBy('price');

// Most expensive first
const response = await client.products().sortBy('price', 'desc');

// Newest first
const response = await client.products().sortBy('date', 'desc');

// Most popular
const response = await client.products().sortBy('popularity', 'desc');

// Highest rated
const response = await client.products().sortBy('rating', 'desc');

// Combine with other filters
const response = await client.products().sortBy('price', 'asc', {
  category: 'electronics',
  on_sale: 'true',
});
```

### Paginated Loop (Manual)

```ts
let page = 1;
const perPage = 20;
let totalPages = 1;

do {
  const response = await client.products().paginate(page, perPage);
  const products = response.toObject() as any[];
  totalPages = response.getTotalPages() ?? 1;

  for (const product of products) {
    console.log(`${product.name} - $${product.price}`);
  }

  page++;
} while (page <= totalPages);
```

### Async Paginated Iterator

The manual loop above works, but the SDK provides a simpler way. `allPaginated()` returns an **async iterator** — a special object you can loop over with `for await`. It automatically fetches the next page when the current one is done, and stops when there are no more pages:

```ts
for await (const page of client.products().allPaginated({ per_page: 20 })) {
  const products = page.toObject() as any[];
  for (const product of products) {
    console.log(product.name);
  }
}

// Or collect all pages into an array
const allPages = await client.products().allPaginated({ per_page: 20 }).toArray();
```

## Single Product

### By ID

```ts
const response = await client.products().find(123);

const data = response.toObject() as any;
console.log(data.name);
console.log(data.price);
console.log(data.description);
```

### By Slug

```ts
const response = await client.products().findBySlug('blue-hoodie');
```

## Variations

**Variations** are the specific versions of a variable product. For example, a T-shirt product might have variations for "Red / Small", "Red / Large", "Blue / Small", etc. Each variation has its own price, stock level, and SKU.

### List All Variations

```ts
const response = await client.products().variations(123);

for (const variation of response.toObject() as any[]) {
  console.log(`${variation.id}: ${variation.price}`);
}
```

### Get a Specific Variation

```ts
const response = await client.products().variation(123, 456);
```

## Categories

### List All Categories

```ts
const response = await client.products().categories();
const response = await client.products().categories({ per_page: '50' });
```

### Get a Single Category

```ts
const response = await client.products().category(15);
```

## Tags

### List All Tags

```ts
const response = await client.products().tags();
```

### Get a Single Tag

```ts
const response = await client.products().tag(8);
```

## Attributes

**Attributes** are the properties that define product variations — things like "Color", "Size", or "Material". Each attribute has **terms** (the specific values), such as "Red", "Blue", "Green" for a "Color" attribute. Attributes are configured in WooCommerce under Products > Attributes.

### List All Attributes

```ts
const response = await client.products().attributes();
```

### Get a Single Attribute

```ts
const response = await client.products().attribute(1);
```

### Get Attribute Terms

```ts
// Get all terms for attribute ID 1 (e.g., all colors)
const response = await client.products().attributeTerms(1);
```

### Get a Single Attribute Term

```ts
// Get term ID 5 for attribute ID 1
const response = await client.products().attributeTerm(1, 5);
```

### Slug-Based Attribute Lookups

All attribute methods have slug-based alternatives:

```ts
// Get attribute by slug
const response = await client.products().attributeBySlug('color');

// Get terms for attribute by slug
const response = await client.products().attributeTermsBySlug('color');

// Get a specific term by slug for an attribute by slug
const response = await client.products().attributeTermBySlug('color', 'red');
```

## Brands

### List All Brands

```ts
const response = await client.products().brands();
const response = await client.products().brands({ per_page: '50' });
```

### Get a Single Brand

```ts
const response = await client.products().brand(5);
```

### Filter Products by Brand

```ts
const response = await client.products().byBrand('nike');

// With additional params
const response = await client.products().byBrand('nike', {
  per_page: '20',
  orderby: 'price',
  order: 'asc',
});
```

## Reviews

### List All Reviews

```ts
const response = await client.products().reviews();
```

### Reviews for a Specific Product

```ts
const response = await client.products().productReviews(123);
```

### My Reviews

Get reviews written by the authenticated user:

```ts
const response = await client.products().myReviews();
```

## SEO (CoCart SEO Pack)

> Requires the CoCart SEO Pack plugin.

Get SEO metadata, Open Graph tags, Twitter Card data, and Schema.org structured data for products.

### By Product ID

```ts
const response = await client.products().seo(123);

console.log(response.get('provider'));           // 'yoast', 'rankmath', etc.
console.log(response.get('meta_data.title'));    // SEO title
console.log(response.get('open_graph.og:title'));
console.log(response.get('schema'));             // JSON-LD structured data
```

### By Product Slug

```ts
const response = await client.products().seoBySlug('blue-hoodie');
```

## Working with Responses

All methods return a `Response` object:

```ts
const response = await client.products().all({ per_page: '5' });

// As object
const products = response.toObject();

// Check success
if (response.isSuccessful()) {
  for (const product of response.toObject() as any[]) {
    console.log(product.name);
  }
}

// Access nested data with dot notation
const response = await client.products().find(123);
console.log(response.get('name'));
console.log(response.get('price'));
console.log(response.get('categories.0.name'));
```

See [Error Handling](error-handling.md) for handling API errors.
