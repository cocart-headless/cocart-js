# Framer

Use the CoCart SDK in [Framer](https://www.framer.com/) to build headless WooCommerce storefronts with a visual design tool. Since Framer doesn't support npm packages, you load the SDK from a CDN via a `<script>` tag.

## Setup

### 1. Add the SDK Script

In your Framer project, go to **Site Settings > General > Custom Code** and paste the following into the **End of `<head>` tag** section:

```html
<script src="https://cdn.jsdelivr.net/npm/@cocartheadless/sdk/dist/index.global.js"></script>
```

This loads the SDK globally as `window.CoCart`, making it available to all Code Overrides and Code Components.

> **Tip:** Pin a specific version to avoid unexpected changes:
>
> ```html
> <script src="https://cdn.jsdelivr.net/npm/@cocartheadless/sdk@1.0.0/dist/index.global.js"></script>
> ```

### 2. Create a Code Override

Framer uses [Code Overrides](https://www.framer.com/developers/guides/overrides) to add custom logic to components. Create a new Code Override file and initialize the SDK:

```tsx
import type { ComponentType } from "react"
import { useState, useEffect } from "react"

const client = new window.CoCart("https://your-store.com")

// Override that displays the cart item count on any text element
export function withCartCount(Component: ComponentType): ComponentType {
  return (props) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
      client.cart().get().then((cart) => {
        setCount(cart.get("item_count") ?? 0)
      })
    }, [])

    return <Component {...props} text={`Cart (${count})`} />
  }
}
```

Apply the `withCartCount` override to a text element in the Framer canvas to display the live cart count.

### 3. Display Products

```tsx
import type { ComponentType } from "react"
import { useState, useEffect } from "react"

const client = new window.CoCart("https://your-store.com")

export function withProducts(Component: ComponentType): ComponentType {
  return (props) => {
    const [products, setProducts] = useState([])

    useEffect(() => {
      client.products().all({ per_page: "6" }).then((response) => {
        setProducts(response.toArray())
      })
    }, [])

    return <Component {...props} products={products} />
  }
}
```

### 4. Add to Cart

```tsx
import type { ComponentType } from "react"

const client = new window.CoCart("https://your-store.com")

export function withAddToCart(Component: ComponentType): ComponentType {
  return (props) => {
    const handleClick = async () => {
      await client.cart().addItem(props.productId, 1)
    }

    return <Component {...props} onClick={handleClick} />
  }
}
```

## TypeScript Types

Framer's Code Override editor supports TypeScript. To tell TypeScript about the `CoCart` global on `window`, add this type declaration at the top of your override file:

```tsx
declare global {
  interface Window {
    CoCart: typeof import("@cocartheadless/sdk")
  }
}
```

## Notes

* **Code Overrides run per-component.** Each override is applied to a specific element on the canvas. Keep SDK initialization (the `new CoCart(...)` call) outside the override function so it's shared across renders.
* **No server-side rendering.** Framer sites are client-side only, so all API calls happen in the browser. Avoid exposing sensitive credentials (consumer keys/secrets) — use guest sessions or JWT authentication instead.
* **CORS.** Your WooCommerce store must allow requests from your Framer domain. CoCart provides built-in CORS support. Add this to your theme's `functions.php` or a custom plugin:

  ```php
  add_filter( 'cocart_allow_origin', function() {
      return 'https://your-framer-site.framer.app';
  });
  ```

  Alternatively, install the [CoCart CORS Support](https://docs.cocartapi.com/documentation/cors) plugin. See the [CORS documentation](https://docs.cocartapi.com/documentation/cors) for more details.
