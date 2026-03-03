<!-- CoCart SDK Support Policy Template v1 -->

# Support & Versioning Policy

> **Note:** This SDK is currently in development. The full support lifecycle (maintenance phase for previous major versions, EOL grace periods) takes effect once the SDK is declared stable and production-ready.

## Versioning

This SDK follows [Semantic Versioning](https://semver.org/) (SemVer):

- **Major** (X.0.0) — Breaking changes to the public API
- **Minor** (x.Y.0) — New features that are backward-compatible
- **Patch** (x.y.Z) — Bug fixes and security patches

Only the **latest major version** receives active development. Older major versions remain available for install but receive no updates. Migration guides are provided in the `docs/` folder for major version upgrades.

### What constitutes a breaking change

- Removing or renaming an exported class, function, type, or interface
- Changing required parameters of a public method
- Changing return types in a way that breaks type assignability
- Removing an export path (e.g., `@cocart/sdk/astro`)
- Changing the module output format (currently ESM + CJS)
- Dropping a Node.js version from the supported matrix

### What is NOT a breaking change

- Adding new optional parameters to existing methods
- Adding new exported classes, functions, types, or response fields
- Internal refactors that do not affect the public API
- Adding a new Node.js version to the supported matrix
- Bug fixes that correct behavior to match documentation

## SDK Lifecycle

| Phase | Description | Duration |
|---|---|---|
| **Active** | New features, bug fixes, security patches | Current major version |
| **Maintenance** | Security patches and critical bug fixes only | Previous major version, 12 months |
| **Deprecated** | No updates; remains installable | After maintenance ends |

## Supported Node.js Versions

| Node.js | Status | SDK Support | Notes |
|---|---|---|---|
| 22 | Active LTS | Supported | Tested in CI |
| 20 | Maintenance LTS | Minimum version | Tested in CI |
| 18 and below | EOL | Not supported | |

### TypeScript compatibility

| TypeScript | Support |
|---|---|
| 5.0+ | Recommended; full type inference |
| 4.x | May work but is not tested or guaranteed |

### Version support policy

We support all Node.js versions that are in **Active LTS** or **Maintenance LTS** status according to the [Node.js Release Schedule](https://nodejs.org/en/about/previous-releases). The SDK requires native `fetch` (stable since Node.js 18, but Node.js 20+ is the minimum supported version).

- **Adding new versions:** When a new even-numbered Node.js version enters Active LTS (typically each October), we add CI testing and official support.
- **Dropping old versions:** When a Node.js LTS version reaches end-of-life, we continue supporting it for **6 months**, then drop it in the next minor or major SDK release.

For TypeScript, we recommend version 5.0+ but do not enforce a minimum. TypeScript itself has no runtime EOL — support follows the Node.js schedule.

## Deprecation Notices

We communicate deprecations through:

1. **JSDoc tags** — `@deprecated` annotations that render as strikethrough in VS Code and other editors
2. **Changelog entry** — Every deprecation is noted in release notes
3. **Minimum one minor release** — A deprecation notice ships at least one minor version before the deprecated feature is removed
4. **Migration guide** — Major version upgrades include a migration guide in the `docs/` folder

## Getting Help

- **Documentation:** https://cocartapi.com/docs
- **Community:** https://cocartapi.com/community
- **Issues:** https://github.com/cocart-headless/cocart-js/issues
