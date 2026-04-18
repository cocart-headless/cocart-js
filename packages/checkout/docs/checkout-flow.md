# Checkout Flow

The package is built around the standard Checkout flow:

1. Fetch checkout state
2. Fetch payment methods
3. Update billing and shipping details
4. Create payment context for client-side gateways
5. Process checkout

## Get checkout state

```ts
const state = await client.checkout.getCheckout();
const data = state.toObject();
```

Useful fields commonly returned by the API include:

- `billing_address`
- `shipping_address`
- `shipping_methods`
- `payment_methods`
- `customer_data`
- `needs_payment`
- `needs_shipping`
- `payment_result`

## Get payment methods

```ts
const methodsResponse = await client.checkout.getPaymentMethods();
const methods = methodsResponse.toObject();
```

## Update checkout data

```ts
await client.checkout.updateCheckout({
  billing_address: {
    first_name: 'Jane',
    last_name: 'Doe',
    address_1: '1 Main Street',
    city: 'Paris',
    postcode: '75001',
    country: 'FR',
    email: 'jane@example.com',
  },
  shipping_method: 'flat_rate:1',
  payment_method: 'stripe',
});
```

## Create payment context

```ts
const paymentContext = await client.checkout.createPaymentContext({
  payment_method: 'stripe',
});
```

This step is especially important for Stripe and PayPal style integrations that need provider-side client initialization.

## Process checkout

```ts
await client.checkout.processCheckout({
  billing_address: {
    first_name: 'Jane',
    address_1: '1 Main Street',
    city: 'Paris',
    postcode: '75001',
    country: 'FR',
  },
  payment_method: 'stripe',
  shipping_method: 'flat_rate:1',
  payment_data: {
    payment_intent_id: 'pi_123',
  },
});
```

## One-call orchestration

Use `submit()` when you want the SDK to run the common update + payment-context + process sequence for you.

```ts
const result = await client.checkout.submit({
  gatewayId: 'stripe',
  update: {
    billing_address: {
      first_name: 'Jane',
      last_name: 'Doe',
      address_1: '1 Main Street',
      city: 'Paris',
      postcode: '75001',
      country: 'FR',
      email: 'jane@example.com',
    },
  },
  process: {
    shipping_method: 'flat_rate:1',
  },
});

const checkoutResult = result.processResponse.toObject();
```
