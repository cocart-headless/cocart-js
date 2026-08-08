# Checkout Gateway Compatibility

Several WooCommerce payment gateway plugins report `result: 'success'` from their own `process_payment()` while the order still needs payment, still needs manual/fraud review, or otherwise doesn't map cleanly onto a REST client's success/failure expectations — there's no way for a headless client to tell the difference from a genuine success without server-side help.

CoCart Plus ships a gateway-agnostic safety net plus dedicated per-gateway compat integrations that translate these cases into the uniform `payment_result` envelope documented in [Checkout Flow → Handling payment_result](../packages/checkout/docs/checkout-flow.md#handling-payment_result). This page tracks which installed gateways are covered, and which SDK helper (if any) to use for each.

| WooCommerce gateway plugin | Gateway ID(s) | SDK helper | Notes |
|---|---|---|---|
| WooCommerce Stripe Gateway | `stripe` | `createStripeGateway()` | Pre-wired — 3D Secure/SCA handled automatically via `confirmAction`. |
| WooPayments | `woocommerce_payments` | `createWooPaymentsGateway()` | Pre-wired — same Stripe.js-based `confirmAction` as above; also surfaces Multibanco voucher details via `payment_result.action_type: 'wcpay_multibanco_voucher'` when relevant. |
| PayPal Payments | `ppcp-gateway`, `ppcp-credit-card-gateway` | None — no pre-wired factory | Approval/3D-Secure redirects (`paypal_approve`/`paypal_confirm_3ds`) are real URLs, not a client SDK call — see [Gateways → PayPal Payments](../packages/checkout/docs/gateways.md#paypal-payments) for the pattern, including the `ppcp_resume_nonce` retry requirement. Not the same plugin as the classic PayPal Smart Buttons flow (`createPayPalGateway()`, gateway ID `paypal`). |
| PeachPay (ConvesioPay card gateway) | `peachpay_convesiopay_card`, `peachpay_convesiopay_unified` | None needed | Fixed entirely server-side (a forced compliance flag) — no client-side change required, use these gateway IDs like any other. |
| WooCommerce Authorize.Net Gateway (CIM) | — | None needed | Fraud/risk holds are covered by the generic safety net (`payment_status: 'on_hold'`) — no SDK-specific handling required beyond checking `payment_status`. |
| WooCommerce Square | — | None needed | Same as Authorize.Net CIM above. |
| Payment Gateway for Authorize.net for WooCommerce | — | None needed | No false-success path found — this SDK's `createAuthorizeNetGateway()` (Accept.js) is unrelated to this plugin despite the similar name; that helper targets `includes/rest-api/class-cocart-payment-processor.php`'s generic opaque-data flow, not this specific plugin. |

Any gateway not listed here falls back to the generic safety net, which is enough to prevent a false "success" in the common cases (needs-payment-but-reported-success, on-hold review) — it just won't have a gateway-specific `action_type` like `stripe_confirm_payment`. Unrecognized redirect-based cases get `action_type: 'gateway_redirect_required'` instead, which is generic but still actionable (open the URL).

See `docs/gateway-compatibility.md` in the CoCart Plus plugin repository for the full audit methodology and per-gateway source analysis this table summarizes.
