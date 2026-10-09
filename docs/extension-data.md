# Extension Data

Plugins add their own data to CoCart responses under `extensions`: on the cart, on each cart item, and on products. This page is about that data. For extending the SDK itself, see [Writing Extensions](extensions.md).

## Plugins CoCart Plus supports

CoCart Plus adds the data for the plugins it supports, and only where it applies: subscription details appear on a subscription product, bundle details on a bundle in the cart, and so on. The SDK types all of it, so there's nothing to declare.

| Plugin | Cart | Cart item | Product |
| --- | --- | --- | --- |
| WooCommerce Subscriptions, Storewide plans, Milo Subscriptions | `recurring_totals` | `subscription_data` | `subscription_data` |
| Subscription plans: WooCommerce Subscriptions 9+ or All Products for WooCommerce Subscriptions | `recurring_totals` | `subscription_schemes` | `subscription_schemes` |
| Gifting for WooCommerce Subscriptions | | `gift_recipient` | `gifting` |
| WooCommerce Bookings | | `booking_data` | `booking_data` |
| Accommodation Bookings | | `accommodation_booking_data` | `accommodation_booking_data` |
| Composite Products | | `composite_data` | `composite_data` |
| Product Bundles | | `bundle_data` | `bundle_data` |
| Product Add-Ons | | `addons` | `addons` |
| Discount Rules (Flycart) | | `discount` | `discount` |
| Advanced Dynamic Pricing (AlgolPlus) | | `adp` | |
| WooCommerce Warranty | | `warranty` | `warranty` |
| Points and Rewards | `points_and_rewards` | | `points_and_rewards` |
| MSRP Pricing | | | `msrp_data` |
| Min/Max Quantities | | | `quantity_rules` |
| Dokan | | | `vendor` |
| Product Condition | | | `condition` |

Amounts are minor-unit strings, like the rest of CoCart (`"1800"` for 18.00). The amounts in `recurring_totals` follow the cart's `formatted` option, like the cart's own totals.

```ts
const response = await client.cart().get();

for (const item of response.getItems()) {
  const subscription = item.extensions.subscription_data;
  if (subscription) {
    console.log(subscription.price_string, subscription.first_renewal.html);
  }
}

// One entry per recurring cart, keyed by the subscription's item key.
const recurring = response.getExtensions().recurring_totals ?? {};
```

Every key is optional, since a plugin's data is only there when the plugin is active and it applies.

## Sending the customer's choices

Some of this data describes a choice: which subscription plan, who receives a gift, which warranty. Send the choice when adding the item, in `addItem()`'s options:

```ts
const product = (await client.products().find(306)).toObject();

// Subscription plans: an option's `value` ('0' is one-time). Without it, the product's default applies.
const monthly = product.extensions.subscription_schemes?.find((o) => o.period === '/ month');
await client.cart().addItem(306, 1, { convert_to_sub: monthly?.value });

// Gifting: the recipient's email.
await client.cart().addItem(302, 1, { recipient_email: 'friend@example.com' });

// Warranty: an option's `key` from the product's `extensions.warranty.options`.
await client.cart().addItem(154, 1, { item_data: { warranty: '1-year' } });
```

`subscription_schemes` is listed only when there's a choice to make: a one-time option, or more than one plan. On a cart item the current option is `selected`; switch it with `changePlan()`:

```ts
const item = (await client.cart().get()).getItems()[0];
const other = item.extensions.subscription_schemes?.find((o) => !o.selected);
if (other) await client.cart().changePlan(item.item_key, other.value);
```

## Data from other plugins

Any plugin can add data with CoCart's filters: `cocart_cart_extensions`, `cocart_cart_item_extensions` and `cocart_product_extensions`. Declare its shape once and the SDK types it everywhere:

```ts
// e.g. in types/cocart.d.ts
declare module '@cocartheadless/sdk' {
  interface CartItemExtensions {
    engraving?: { text: string; font: string };
  }
  interface ProductExtensions {
    engraving?: { max_length: number };
  }
}
```

```ts
const text = item.extensions.engraving?.text; // string | undefined
```

The interfaces are `CartExtensions`, `CartItemExtensions` and `ProductExtensions`. A key you haven't declared is still readable, typed as `unknown`.
