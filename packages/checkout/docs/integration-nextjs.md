# Next.js App Router Integration

A complete reference showing how to wire live CoCart API data to the React checkout components. This example uses Next.js App Router with a Client Component for interactivity.

---

## Prerequisites

```bash
npm install @cocartheadless/sdk @cocartheadless/checkout react react-dom
```

---

## Client setup

Create a shared client module that your pages import:

```ts
// lib/checkout-client.ts
import { CoCart } from '@cocartheadless/sdk';
import { createCheckout, createStripeGateway, createModernCheckoutTheme } from '@cocartheadless/checkout';
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export const client = new CoCart(process.env.NEXT_PUBLIC_COCART_URL!).use(
  createCheckout({
    defaultTheme: createModernCheckoutTheme({
      variables: { colorPrimary: '#6366f1' },
    }),
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/order/{CHECKOUT_ID}`,
    returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`,
    gatewayAdapters: [
      createStripeGateway({ stripe, elements: null }), // elements attached at render time
    ],
  })
);
```

---

## Data mapping helpers

The CoCart API returns all monetary values as **integer minor units** (e.g. `"2000"` = $20.00 USD, `"2000"` = ¥2000 JPY). The React components consume these directly as `number`. Use `CurrencyFormatter` from the SDK to format display strings for shipping rates.

```ts
// lib/checkout-mappers.ts
import { CurrencyFormatter } from '@cocartheadless/sdk';
import type { CurrencyInfo } from '@cocartheadless/sdk';
import type { CheckoutSummaryItem, CheckoutShippingRate } from '@cocartheadless/checkout';
import type { OrderLineItem, ShippingRate } from '@cocartheadless/checkout/react';

const fmt = new CurrencyFormatter();

export function toLineItem(item: CheckoutSummaryItem): OrderLineItem {
  return {
    name: item.name,
    variant: '',      // CheckoutSummaryItem has no variant field
    qty: item.quantity,
    price: item.price,
  };
}

export function toShippingRate(rate: CheckoutShippingRate, currency: CurrencyInfo): ShippingRate {
  const cost = parseInt(rate.cost, 10);
  return {
    id: rate.id,      // what shipping_method takes
    label: rate.label,
    meta: '',         // API has no delivery estimate field
    price: cost === 0 ? 'Free' : fmt.format(cost, currency),
  };
}
```

---

## Checkout page

```tsx
// app/checkout/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { client } from '@/lib/checkout-client';
import { toLineItem, toShippingRate } from '@/lib/checkout-mappers';
import { CoCartError } from '@cocartheadless/sdk';
import type { CurrencyInfo } from '@cocartheadless/sdk';
import type { CheckoutOrderSummary } from '@cocartheadless/checkout';
import type { OrderLineItem, ShippingRate, AppliedCoupon } from '@cocartheadless/checkout/react';
import {
  CheckoutContainer,
  Address,
  ExpressBar,
  ShippingMethods,
  PaymentMethods,
  OrderSummary,
  PayButton,
  TermsAndConditions,
} from '@cocartheadless/checkout/react';

export default function CheckoutPage() {
  const [summary, setSummary] = useState<CheckoutOrderSummary | null>(null);
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingCostCents, setShippingCostCents] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const form = client.checkout.createForm({ gatewayId: 'stripe' });
  const regularGateways = client.checkout.listGateways();
  const expressGateways = client.checkout.listExpressGateways();

  const contactSection  = form.sections.find(s => s.id === 'contact');
  const shippingSection = form.sections.find(s => s.id === 'shipping');
  const billingSection  = form.sections.find(s => s.id === 'billing');
  const paymentSection  = form.sections.find(s => s.id === 'payment');

  useEffect(() => {
    async function load() {
      try {
        // Fetch cart to get currency metadata for display formatting
        const cartResponse = await client.cart().get();
        const curr = cartResponse.getCurrency();
        setCurrency(curr);

        // Fetch checkout summary (items + coupons + totals). This is the review page:
        // CoCart Plus records the total shown here, and submit() checks it before paying.
        const sum = await client.checkout.getOrderSummary();
        setSummary(sum);

        // Fetch available shipping rates
        const pkgs = await client.checkout.getShippingMethods();
        const allRates = pkgs.flatMap(pkg =>
          pkg.rates.map(r => toShippingRate(r, curr))
        );
        setRates(allRates);

        // Pre-select the store's currently chosen shipping rate
        const chosenRate = pkgs[0]?.rates.find(r => r.id === pkgs[0].chosen_rate);
        if (chosenRate) setShippingCostCents(parseInt(chosenRate.cost, 10));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load checkout.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleApply(code: string): Promise<AppliedCoupon | null> {
    try {
      const before = await client.checkout.getOrderSummary();
      const prevDiscount = parseInt(before.totals.discount_total, 10);
      await client.checkout.applyCoupon(code);
      const after = await client.checkout.getOrderSummary();
      const coupon = after.coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
      if (!coupon) return null;
      const newDiscount = parseInt(after.totals.discount_total, 10);
      setSummary(after);
      return {
        code: coupon.code,
        discount: coupon.saving,
        discountCents: newDiscount - prevDiscount,
        freeShipping: parseInt(after.totals.shipping_total, 10) === 0,
      };
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const { result } = await client.checkout.submit({ gatewayId: 'stripe' });
      if (result.isFailed) {
        // A declined card is a result, not an exception. The message is plain text.
        setNotice(result.message ?? 'Payment failed. Please try again.');
      } else if (result.redirectUrl) {
        // An off-site step, or the order-received page. Only ever https/http.
        window.location.href = result.redirectUrl;
      }
    } catch (e) {
      if (e instanceof CoCartError && e.errorCode === 'cocart_checkout_total_mismatch') {
        // The total changed since the customer saw it: nothing was charged. Show the new one.
        setSummary(await client.checkout.getOrderSummary());
        setNotice('Your total has changed. Please review it and place your order again.');
        return;
      }
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.');
    }
  }

  if (error) return <p role="alert">{error}</p>;

  const items: OrderLineItem[] = summary?.items.map(toLineItem) ?? [];
  const subtotalCents = summary ? parseInt(summary.totals.subtotal, 10) : 0;
  const taxCents = summary ? parseInt(summary.totals.tax_total, 10) : 0;
  const totalDisplay = summary && currency
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.currency_code,
        minimumFractionDigits: currency.currency_minor_unit,
      }).format(parseInt(summary.totals.total, 10) / Math.pow(10, currency.currency_minor_unit))
    : '';

  return (
    <CheckoutContainer form={form} layout="two-column">
      <form onSubmit={handleSubmit}>
        {notice && <p role="status">{notice}</p>}

        {expressGateways.length > 0 && (
          <ExpressBar gateways={expressGateways} theme={form.theme} loading={loading} />
        )}

        {contactSection && (
          <Address type="contact" section={contactSection} theme={form.theme} loading={loading} />
        )}

        {shippingSection && (
          <Address type="shipping" section={shippingSection} theme={form.theme} loading={loading} />
        )}

        <ShippingMethods
          theme={form.theme}
          rates={rates}
          loading={loading}
          placeholder={!loading && rates.length === 0}
          onRateChange={async rate => {
            // Save the choice: the checkout comes back with the new total, the one the customer now sees.
            const checkout = (await client.checkout.updateCheckout({ shipping_method: rate.id })).toObject();
            setShippingCostCents(parseInt(checkout.totals.shipping_total, 10));
            setSummary(await client.checkout.getOrderSummary());
          }}
        />

        <PaymentMethods
          gateways={regularGateways}
          theme={form.theme}
          paymentSection={paymentSection}
          billingSection={billingSection}
          loading={loading}
        />

        <TermsAndConditions theme={form.theme} termsUrl="/terms" privacyUrl="/privacy">
          <PayButton theme={form.theme} label="Place order" />
        </TermsAndConditions>
      </form>

      <OrderSummary
        theme={form.theme}
        items={items}
        subtotalCents={subtotalCents}
        taxCents={taxCents}
        shippingCostCents={shippingCostCents}
        total={totalDisplay}
        loading={loading}
        onApply={handleApply}
        onCouponsChange={coupons => {
          const hasFreeShipping = coupons.some(c => c.freeShipping);
          if (hasFreeShipping) setShippingCostCents(0);
        }}
      />
    </CheckoutContainer>
  );
}
```

---

## Notes

**Monetary values** — The CoCart API returns all prices and totals as integer strings in the currency's minor unit (cents for USD/EUR/GBP, whole units for JPY, fils for KWD). Pass them directly to the React components' `*Cents` props via `parseInt(val, 10)` — no multiplication needed.

**Currency metadata** — `getCurrency()` is available on any `Response` object from the SDK. Fetch it once from `client.cart().get()` to get `CurrencyInfo`, which includes `currency_code`, `currency_minor_unit`, and prefix/suffix for formatting display strings. Use `CurrencyFormatter` from `@cocartheadless/sdk` for shipping rate prices.

**Shipping rate display** — Each package from `getShippingMethods()` has a `rates` list and a `chosen_rate` (the chosen rate's `id`). `CheckoutShippingRate` has no delivery estimate field. If your store returns extra metadata in the rate object (via `[key: string]: unknown`), read it from `rate['description']` or similar and pass it as `meta`.

**Variant/attribute display** — `CheckoutSummaryItem` has no variant field. If your products have attributes you want to show, fetch them from the cart items via `client.cart().getItems()` and join on `item.key`.

**Form fields** — `createForm()` builds sections from the registered gateway adapter's `getFields()`. For custom field layouts, map over `section.fields` and render your own inputs alongside or instead of `<Address>`.

**Error handling** — `applyCoupon()` and `submit()` throw `CoCartError` on API failures (a rejected coupon is `cocart_coupon_not_applied`; a total that changed since the customer saw it is `409 cocart_checkout_total_mismatch`). A declined card isn't an exception: `submit()` returns it as `result.isFailed` with `result.message`. Wrap the calls in try/catch and surface errors via `role="alert"` or `role="status"` elements for screen reader accessibility. Messages are plain text: render them as text, never as HTML.

**Server Components** — If you prefer fetching on the server, move the `getOrderSummary()` / `getShippingMethods()` calls into an `async` Server Component and pass the mapped data as props to a `'use client'` child for interactivity.
