# Shared checkout fixtures

Each JSON file is one checkout case: the call, the HTTP exchanges it makes, and the expected outcome. Every CoCart SDK replays the same files against its own client with a mocked transport, so all of them are tested on the same data. cocart-js runs them in `../fixtures.test.ts`.

The responses are the documents CoCart Plus 2.0 sends (`cocart-openapi/plus/v2`), trimmed to the fields that matter: an order or a subscription with what the request did in `result`. The `payment_data` keys come from the gateways' own source. `source` names where each case comes from.

## Format

```json
{
  "name": "What the case shows",
  "source": "checkout.test.ts:215",
  "call": { "target": "checkout", "method": "placeOrder", "args": [ { "payment_method": "stripe" } ] },
  "exchanges": [
    {
      "request": { "method": "POST", "path": "cocart/v2/checkout", "query": {}, "body": { "payment_method": "stripe" } },
      "response": { "status": 200, "body": { "object": "order", "result": { "code": "order_placed", "message": "…", "action": null, "redirect_url": null, "error": null }, "id": 217 } }
    }
  ],
  "expect": { "result": { "code": "order_placed", "isComplete": true, "orderId": 217 } }
}
```

- **`call.target`:** `checkout` (the checkout client) or `account` (`client.account()`).
- **`call.args`:** positional, as cocart-js takes them. An object argument (`searchAddresses`, `getAddressDetails`, the `confirmReturn` options, the `getCheckout` parameters) maps onto the SDK's own parameters. A boolean query parameter is sent as `"true"` or `"false"`.
- **`exchanges`:** the requests the call must make, in order, and the response to give each one.
  - `path` is relative to `wp-json/`, without the query string.
  - `query` is the whole query string as a map.
  - `body` is the decoded JSON body, or `null` when there's none.

  A runner checks that the requests match exactly, and that no others are made. `confirm-return-missing-order` and `place-order-invalid-checkout-id` have none: the call must fail before it sends anything.
- **`expect`** holds one or more of:
  - **`result`:** the `CheckoutResult`. Compare only the keys listed; `null` is a field the result leaves out. They're named in camelCase; an SDK compares its own spelling (`is_complete` in Python, `IsComplete()` in Go).
  - **`value`:** the exact return value (`getSavedPaymentMethods`, `getCheckoutStatus`). Its keys follow the same naming rule.
  - **`responseBody`:** the body of the returned response, or of `result.response`.
  - **`error.code`:** the call throws (or returns) the SDK's error with this API code. With **`error.checkoutId`**, it's the SDK's checkout-outcome-unknown error, carrying that `checkout_id` (`place-order-in-progress`: another request is still taking payment, so how this one ends isn't known).

The responses carry no headers. A fixture never needs a cart key or a login: those are the client's concern, and the store would send the same body either way.

Every `placeOrder` case passes the same `checkout_id` (`chk_fixture_0000000001`), so the request body is the same in every SDK. Left out, each SDK sends a random one.

`/pay` and `/confirm` send the order key in the body, never in the query string.

There are 53 cases. Each SDK's runner checks that it found all of them.

## Method names in each SDK

| Fixture | PHP | Python | Go | Kotlin / Swift / Flutter |
|---|---|---|---|---|
| `checkout.placeOrder` | `checkout()->placeOrder()` | `checkout().place_order()` | `Checkout().PlaceOrder()` | `checkout().placeOrder()` |
| `checkout.payForOrder` | `payForOrder()` | `pay_for_order()` | `PayForOrder()` | `payForOrder()` |
| `checkout.confirmReturn` | `confirmReturn()` | `confirm_return()` | `ConfirmReturn()` / `ConfirmReturnFor()` with options | `confirmReturn()` |
| `checkout.getSavedPaymentMethods` | `getSavedPaymentMethods()` | `get_saved_payment_methods()` | `GetSavedPaymentMethods()` | `getSavedPaymentMethods()` |
| `checkout.getCheckoutStatus` | `getStatus()` | `get_status()` | `GetStatus()` | `getStatus()` |
| `checkout.getCheckout` | `get()` | `get()` | `Get()` | `get()` |
| `checkout.updateCheckout` | `update()` | `update()` | `Update()` | `update()` |
| `checkout.getCheckoutConfig` | `getConfig()` | `get_config()` | `GetConfig()` | `getConfig()` |
| `checkout.getPaymentMethods` | `getPaymentMethods()` | `get_payment_methods()` | `GetPaymentMethods()` | `getPaymentMethods()` |
| `checkout.searchAddresses` | `searchAddresses()` | `search_addresses()` | `SearchAddresses()` | `searchAddresses()` |
| `checkout.getAddressDetails` | `getAddressDetails()` | `get_address_details()` | `GetAddressDetails()` | `getAddressDetails()` |
| `checkout.getOrderReceived` | `getOrderReceived()` | `get_order_received()` | `GetOrderReceived()` | `getOrderReceived()` |
| `account.updateSubscriptionPaymentMethod` | `account()->updateSubscriptionPaymentMethod()` | `account().update_subscription_payment_method()` | `Account().UpdateSubscriptionPaymentMethod()` | `account().updateSubscriptionPaymentMethod()` |

React Native runs through cocart-js, so it needs no runner of its own.

## Adding a case

Add it here first, run cocart-js's tests, then run it in every other SDK. Keep keys and test card IDs fake or public: Stripe's test PaymentMethod IDs (`pm_card_visa`…) are fine, and no API key belongs in a fixture.
