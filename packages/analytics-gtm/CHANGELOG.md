# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-04-19

### Added

- Initial release
- Auto-tracks GA4 ecommerce events (`add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`) via `window.dataLayer`
- Configurable GTM container ID
- Works with CoCart SDK extension system via `.use()`
