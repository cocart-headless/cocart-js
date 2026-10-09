/**
 * Compile-time checks for the typed extension data: the CoCart Plus integrations are typed out of the
 * box, any other plugin's data can be added by augmenting the location interfaces, and unknown keys
 * stay `unknown`. Not imported by anything and not part of the published build.
 */
import type { CartItem, CartResponse, Product, Response } from '../index.js';

// A store's own plugin, declared once.
declare module '../index.js' {
  interface CartItemExtensions {
    engraving?: { text: string };
  }
}

declare const item: CartItem;
declare const cart: CartResponse;
declare const product: Product;

// Built in: CoCart Plus integrations.
const payNow: string | undefined = item.extensions.subscription_data?.pay_now;
const bundled: number | undefined = item.extensions.bundle_data?.child_items[0]?.quantity.value;
const recurring: string | undefined = cart.extensions.recurring_totals?.['abc']?.totals.total;
const vendor: string | undefined = product.extensions.vendor?.store_name;
const schemes: string | undefined = product.extensions.subscription_schemes?.[0]?.value;
const selected: boolean | undefined = item.extensions.subscription_schemes?.[0]?.selected;
// @ts-expect-error A product's options have no `selected`: nothing is chosen before the cart.
product.extensions.subscription_schemes?.[0]?.selected;

// Added by augmentation.
const engraving: string | undefined = item.extensions.engraving?.text;

// Anything else stays unknown, and the cart's items carry the typed extensions too.
const other: unknown = item.extensions['some_other_plugin'];
const firstItemWarranty: string | undefined = cart.items[0]?.extensions.warranty?.duration;

// @ts-expect-error a known key keeps its type
const wrong: number | undefined = item.extensions.subscription_data?.pay_now;

// The example in docs/extension-data.md.
declare const response: Response;
for (const cartItem of response.getItems()) {
  const subscription = cartItem.extensions.subscription_data;
  if (subscription) {
    const line: string = `${subscription.price_string} ${subscription.first_renewal.html}`;
    void line;
  }
}
const recurringTotals = response.getExtensions().recurring_totals ?? {};
const firstRecurringTotal: string | undefined = Object.values(recurringTotals)[0]?.totals.total;
void firstRecurringTotal;

void payNow;
void bundled;
void recurring;
void vendor;
void schemes;
void selected;
void engraving;
void other;
void firstItemWarranty;
void wrong;
