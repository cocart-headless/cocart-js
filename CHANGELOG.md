# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Extension system — install third-party SDK modules onto the CoCart client via `.use()` or the `extensions` constructor option
- `CoCartExtension<Name, Instance>` interface for authoring extensions
- `CoCartExtensionRegistry` interface for module augmentation and typed `client.extension('name')` lookup
- `client.on()` / `client.off()` event hooks — subscribe to `request`, `response`, `error`, `retry`, and `auth:refresh` lifecycle events
- `extensions` option in `CoCartOptions` — install extensions at construction time
- `@cocartheadless/analytics-datafast` — Datafast analytics extension with auto-tracking of cart and checkout events, GDPR cookieless mode support, and manual `track()` / `identify()` / `trackPageview()` API
- `@cocartheadless/analytics-gtm` — Google Tag Manager extension that pushes GA4 ecommerce events (`add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`) to `window.dataLayer` automatically
- Extension authoring guide at `docs/extensions.md`

## [1.1.2] - 2025-03-14

### Fixed

- Fallback support for older CoCart plugin versions to fetch cart key via response header

## [1.1.1] - 2025-02-20

### Fixed

- Resolved picomatch CVE-2026-33671 and CVE-2026-33672 vulnerabilities

## [1.1.0] - 2025-01-10

### Added

- Initial public release of `@cocartheadless/sdk`

[Unreleased]: https://github.com/cocart-headless/cocart-js/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/cocart-headless/cocart-js/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/cocart-headless/cocart-js/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/cocart-headless/cocart-js/releases/tag/v1.1.0
