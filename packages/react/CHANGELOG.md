# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-11

### Added

- Initial release
- `<CoCartProvider>` — makes a CoCart client available to `useCoCart()`/`useAuth()`
- `useCoCart()` — read the raw CoCart client from context
- `useAuth()` — reactive `{ user, isAuthenticated, isLoading, error, login, logout }`, built on `SessionManager.loginWithJwt()`/`.logout()` (guest-cart merge on login included)
