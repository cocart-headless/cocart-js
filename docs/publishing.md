# Publishing the SDK

This guide walks you through publishing `@cocart/sdk` to a package registry — either **publicly** on npm (so anyone can install it) or **privately** on a private registry (restricted to your team or organization).

## Prerequisites

Before publishing, make sure you have:

1. **Node.js 18+** installed — Check with `node -v`
2. **npm account** — Create one at [npmjs.com/signup](https://www.npmjs.com/signup) (for public publishing)
3. **Organization access** — The package is scoped under `@cocart`, so you need to be a member of the `cocart` npm organization with publish permissions

> **What is a scoped package?** The `@cocart/` prefix is called a "scope". It groups packages under an organization name (like `@cocart/sdk`). Scoped packages are **private by default** on npm — you must explicitly mark them as public if you want anyone to install them for free.

---

## Pre-Publish Checklist

Every time before publishing, run through these steps:

### 1. Run Tests

```bash
npm test
```

All tests must pass. Never publish a broken package.

### 2. Run Type Checking

```bash
npm run typecheck
```

Ensures there are no TypeScript errors.

### 3. Build the Package

```bash
npm run build
```

This compiles the TypeScript source into the `dist/` folder with:
- **ESM** output (`dist/index.js`) — for modern `import` syntax
- **CJS** output (`dist/index.cjs`) — for older `require()` syntax
- **Type declarations** (`dist/index.d.ts`) — for TypeScript autocompletion
- **Source maps** (`dist/index.js.map`) — for debugging
- **Framework adapters** (`dist/adapters/astro.js`, `dist/adapters/nextjs.js`)

### 4. Verify Package Contents

```bash
npm pack --dry-run
```

This shows you exactly which files will be included in the published package **without actually creating the tarball**. You should see only the `dist/` folder and `package.json` — no source code, tests, or config files.

> **What is a tarball?** A `.tgz` file (tarball) is a compressed archive. When you run `npm publish`, npm creates a tarball of your package and uploads it to the registry. `npm pack` creates this file locally so you can inspect it.

### 5. Update the Version

```bash
# Patch release (1.0.0 → 1.0.1) — bug fixes
npm version patch

# Minor release (1.0.0 → 1.1.0) — new features, backward compatible
npm version minor

# Major release (1.0.0 → 2.0.0) — breaking changes
npm version major
```

> **What is semantic versioning?** Version numbers follow the format `MAJOR.MINOR.PATCH`. Increment MAJOR for breaking changes (code that worked before may not work now), MINOR for new features that don't break existing code, and PATCH for bug fixes. This helps developers know if it's safe to upgrade.

The `npm version` command automatically:
- Updates the `version` field in `package.json`
- Creates a git commit with the message `v1.0.1` (or whatever the new version is)
- Creates a git tag `v1.0.1`

---

## Publishing Publicly to npm

Public packages are free and available for anyone to install with `npm install @cocart/sdk`.

### 1. Log In to npm

```bash
npm login
```

This opens a browser window to authenticate. After logging in, your credentials are stored locally so you don't need to log in again.

### 2. Publish

Since `@cocart/sdk` is a scoped package, you must explicitly set `--access public`:

```bash
npm publish --access public
```

> **Why `--access public`?** Scoped packages (`@org/name`) default to **restricted** (private) on npm. Without `--access public`, npm will reject the publish unless you have a paid npm organization plan. The `--access public` flag tells npm this is a free, open-source package.

### 3. Verify

After publishing, verify the package is live:

```bash
npm info @cocart/sdk
```

Or visit `https://www.npmjs.com/package/@cocart/sdk` in your browser.

### Making `--access public` the Default

To avoid typing `--access public` every time, add this to `package.json`:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

Then you can simply run `npm publish` without the flag.

---

## Publishing Privately

Private packages are only available to people in your npm organization (or users with explicit access). This is useful for internal SDKs or pre-release versions.

### Option A: npm Private Packages (Paid)

npm offers private packages through [npm Organizations](https://www.npmjs.com/products) (paid plan, per-user pricing).

```bash
# Log in
npm login

# Publish as restricted (the default for scoped packages)
npm publish
```

Only members of the `@cocart` npm organization will be able to install it.

### Option B: GitHub Packages (Free for Private Repos)

[GitHub Packages](https://github.com/features/packages) is a package registry built into GitHub. It's free for private repositories.

#### 1. Create a `.npmrc` File

Create a `.npmrc` file in your project root:

```ini
@cocart:registry=https://npm.pkg.github.com
```

This tells npm: "When installing or publishing any `@cocart/*` package, use GitHub Packages instead of the default npm registry."

> **What is `.npmrc`?** It's a configuration file for npm. It can set registry URLs, authentication tokens, and other npm settings. It can live in your project root (affects only this project) or your home directory (affects all projects).

#### 2. Authenticate with GitHub

Create a **Personal Access Token (PAT)** with `write:packages` permission:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the `write:packages` scope
4. Copy the token

Then log in:

```bash
npm login --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: paste-your-token-here
# Email: your-email
```

#### 3. Add Repository Field

GitHub Packages requires a `repository` field in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/cocart-headless/cocart-sdk-typescript.git"
  }
}
```

#### 4. Publish

```bash
npm publish
```

The package will be available at `https://github.com/orgs/cocart-headless/packages`.

#### 5. Installing from GitHub Packages

Anyone who needs to install the private package must also have a `.npmrc` file:

```ini
@cocart:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

Then they can install normally:

```bash
npm install @cocart/sdk
```

### Option C: Self-Hosted Registry (Verdaccio)

[Verdaccio](https://verdaccio.org/) is a free, open-source npm registry you can host yourself. Useful for teams that want full control over their package infrastructure.

#### 1. Install and Start Verdaccio

```bash
npm install -g verdaccio
verdaccio
```

This starts a local registry at `http://localhost:4873`.

#### 2. Publish to Verdaccio

```bash
npm publish --registry http://localhost:4873
```

#### 3. Install from Verdaccio

```bash
npm install @cocart/sdk --registry http://localhost:4873
```

Or set it in `.npmrc`:

```ini
@cocart:registry=http://localhost:4873
```

---

## CI/CD Publishing (Automated)

Instead of publishing manually, you can automate it with GitHub Actions so that every tagged release is published automatically.

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> **What is `npm ci`?** It's like `npm install` but stricter — it installs exactly the versions listed in `package-lock.json` without modifying it. This ensures your CI build uses the same dependency versions you tested locally.

> **What is `--provenance`?** It adds a cryptographic signature to your package proving it was built by this specific GitHub Actions workflow. This helps users verify the package wasn't tampered with. It shows a "Provenance" badge on the npm package page.

### Setup Steps

1. **Generate an npm token**: Go to [npmjs.com → Access Tokens → Generate New Token](https://www.npmjs.com/settings/~/tokens) → Choose "Automation" type
2. **Add it to GitHub**: Go to your repository → Settings → Secrets and variables → Actions → New repository secret → Name it `NPM_TOKEN`
3. **Create a release**: Go to your repository → Releases → Draft a new release → Choose a tag (e.g., `v1.0.0`) → Publish

The workflow will automatically run tests, build, and publish to npm.

### Publishing to GitHub Packages via CI

Replace the registry URL and token:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`GITHUB_TOKEN` is automatically provided by GitHub Actions — no manual secret needed.

---

## Quick Reference

| Task | Command |
|------|---------|
| Run tests | `npm test` |
| Type check | `npm run typecheck` |
| Build | `npm run build` |
| Preview package contents | `npm pack --dry-run` |
| Bump patch version | `npm version patch` |
| Bump minor version | `npm version minor` |
| Bump major version | `npm version major` |
| Publish publicly | `npm publish --access public` |
| Publish privately | `npm publish` |
| Check published info | `npm info @cocart/sdk` |
| Deprecate a version | `npm deprecate @cocart/sdk@"1.0.0" "Use 1.0.1 instead"` |
| Unpublish (within 72h) | `npm unpublish @cocart/sdk@1.0.0` |

> **Can I unpublish?** npm allows unpublishing within 72 hours of publishing. After that, you can only deprecate (mark as outdated) but not remove the version. This protects the ecosystem from broken dependencies.
