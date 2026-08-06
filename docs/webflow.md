# Webflow

Use the CoCart SDK in [Webflow](https://webflow.com/) to add headless WooCommerce cart functionality to your Webflow site. Since Webflow doesn't support npm packages, you load the SDK from a CDN via a `<script>` tag.

## Setup

### 1. Add the SDK Script

In your Webflow project, go to **Project Settings > Custom Code** and paste the following into the **Footer Code** section (before `</body>` tag):

```html
<script src="https://cdn.jsdelivr.net/npm/@cocartheadless/sdk/dist/index.global.js"></script>
```

Or use unpkg:

```html
<script src="https://unpkg.com/@cocartheadless/sdk/dist/index.global.js"></script>
```

This loads the SDK globally as `window.CoCart`, making it available to all custom code on every page.

> **Tip:** Pin a specific version to avoid unexpected changes:
>
> ```html
> <!-- jsDelivr -->
> <script src="https://cdn.jsdelivr.net/npm/@cocartheadless/sdk@1.2.1/dist/index.global.js"></script>
>
> <!-- unpkg -->
> <script src="https://unpkg.com/@cocartheadless/sdk@1.2.1/dist/index.global.js"></script>
> ```

### 2. Initialize the SDK

Add a second `<script>` block below the SDK script (or in a page-level custom code section) to initialize the client:

```html
<script>
  var client = new CoCart("https://your-store.com");
</script>
```

### 3. Display a Cart Counter

Give an element (e.g., a text block) a custom attribute or ID like `id="cart-count"`, then update it dynamically:

```html
<script>
  var client = new CoCart("https://your-store.com");

  document.addEventListener("DOMContentLoaded", function () {
    client.cart().get().then(function (cart) {
      var el = document.getElementById("cart-count");
      if (el) {
        el.textContent = cart.get("item_count") || "0";
      }
    });
  });
</script>
```

### 4. Display Products

Create a container element with `id="product-list"` in the Webflow Designer, then populate it with product data:

```html
<script>
  var client = new CoCart("https://your-store.com");

  document.addEventListener("DOMContentLoaded", function () {
    client.products().all({ per_page: "6" }).then(function (response) {
      var container = document.getElementById("product-list");
      var products = response.toArray();

      products.forEach(function (product) {
        var card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML =
          '<img src="' + product.images[0].src + '" alt="' + product.name + '">' +
          "<h3>" + product.name + "</h3>" +
          "<p>" + product.price + "</p>" +
          '<button data-product-id="' + product.id + '">Add to Cart</button>';
        container.appendChild(card);
      });
    });
  });
</script>
```

### 5. Add to Cart

Handle click events on your "Add to Cart" buttons:

```html
<script>
  var client = new CoCart("https://your-store.com");

  document.addEventListener("click", function (e) {
    var button = e.target.closest("[data-product-id]");
    if (!button) return;

    var productId = parseInt(button.getAttribute("data-product-id"), 10);
    button.textContent = "Adding...";

    client.cart().addItem(productId, 1).then(function () {
      button.textContent = "Added!";
      setTimeout(function () {
        button.textContent = "Add to Cart";
      }, 2000);
    });
  });
</script>
```

## Page-Level vs Site-Level Code

* **Site-level** (Project Settings > Custom Code): Runs on every page. Best for loading the SDK script and initializing the client.
* **Page-level** (Page Settings > Custom Code): Runs on a single page. Best for page-specific logic like a product listing or checkout.

## Notes

* **DOM timing.** Always wrap your code in a `DOMContentLoaded` listener to ensure Webflow's elements are rendered before your script tries to access them.
* **No server-side rendering.** Webflow sites are client-side only, so all API calls happen in the browser. Avoid exposing sensitive credentials (consumer keys/secrets) — use guest sessions or JWT authentication instead.
* **CORS.** Your WooCommerce store must allow requests from your Webflow domain. CoCart provides built-in CORS support. Add this to your theme's `functions.php` or a custom plugin:

  ```php
  add_filter( 'cocart_allow_origin', function() {
      return 'https://your-site.webflow.io';
  });
  ```

  Alternatively, install the [CoCart CORS Support](https://docs.cocartapi.com/documentation/cors) plugin. See the [CORS documentation](https://docs.cocartapi.com/documentation/cors) for more details.
* **Webflow Interactions.** You can trigger Webflow's built-in interactions from custom code by dispatching events or toggling CSS classes after SDK calls complete. For example, add a `.cart-open` class to a cart drawer element after adding an item.
