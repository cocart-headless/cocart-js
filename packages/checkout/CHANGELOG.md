# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **`createStripeGateway()`/`createWooPaymentsGateway()`'s pre-wired path could never actually charge a card.** The default `tokenize` sent no `payment_data` at all on the first `POST /checkout`, on the documented assumption that the WooCommerce gateway creates the PaymentIntent server-side with nothing to gather first — but `WC_Gateway_Stripe::process_payment()` (and WooPayments' equivalent) has no PaymentMethod to charge without it, and fails outright. `tokenize` now calls `stripe.createPaymentMethod({ elements })` and sends the result under the gateway's real `$_POST` key (`wc-stripe-payment-method` for Stripe, `wcpay-payment-method` for WooPayments, both verified against the plugins' own source).
- **The documented manual `tokenize` example (and its TypeScript return type) used a key — `payment_method_id` — that neither gateway reads.** A checkout built from that example would tokenize the card correctly and then have the charge silently fail, since the field name WooCommerce actually looks for was never sent. Fixed the example, and typed the correct `wc-stripe-payment-method`/`wc-stripe-confirmation-token` keys directly.
- **`confirmAction` used `stripe.confirmPayment({ elements, clientSecret, redirect: 'if_required' })` for the `requires_action`/3D Secure retry, which needs `elements` rebound to the new PaymentIntent's `clientSecret` — a step that was never done.** Switched to `stripe.confirmCardPayment(clientSecret)` (or `confirmCardSetup(clientSecret)` when `action_data.intent_type === 'setup_intent'`), which needs no `elements` at all: the PaymentMethod is already attached to the intent server-side by the initial charge attempt.

None of this affected `createStripeExpressGateway` (Apple Pay/Google Pay via the Express Checkout Element), which manages its own PaymentIntent lifecycle differently and still uses `confirmPayment({ elements, ... })` correctly.
