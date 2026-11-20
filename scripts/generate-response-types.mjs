#!/usr/bin/env node
// Generates the response types in src/generated/ from the CoCart OpenAPI specs:
//
// - cocart-starter-v2.ts from cocart-openapi/starter/v2/openapi-cocart-v2-sdk.yaml
// - cocart-plus-v2.ts from cocart-openapi/plus/v2/openapi-cocart-plus-v2-collection.yaml
// - cocart-plus-checkout-v2.ts from cocart-openapi/plus/v2/openapi-cocart-plus-checkout-v2.yaml
//
// The specs' response schemas are checked against live responses, so the response types in
// src/cocart.types.ts are derived from them instead of written by hand.
//
// Usage: npm run generate:types [-- path/to/cocart-openapi]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const specs = resolve(process.argv[2] ?? join(root, '..', '..', 'cocart-openapi'));

const targets = [
  ['starter/v2/openapi-cocart-v2-sdk.yaml', 'cocart-starter-v2.ts'],
  ['plus/v2/openapi-cocart-plus-v2-collection.yaml', 'cocart-plus-v2.ts'],
  ['plus/v2/openapi-cocart-plus-checkout-v2.yaml', 'cocart-plus-checkout-v2.ts'],
];

for (const [source, file] of targets) {
  const spec = join(specs, source);
  const out = join(root, 'src', 'generated', file);

  // npx is a .cmd shim on Windows, which Node only runs through a shell; quote the paths for it.
  const args = ['--yes', 'openapi-typescript@7.13.0', spec, '--properties-required-by-default', '-o', out];
  if (process.platform === 'win32') {
    execFileSync(['npx', ...args.map((a) => `"${a}"`)].join(' '), { stdio: 'inherit', shell: true });
  } else {
    execFileSync('npx', args, { stdio: 'inherit' });
  }

  // Every property is required by default: CoCart returns the full object unless the request
  // narrows it with `_fields` (see Cart.getFiltered()).
  const header = [
    '/**',
    ' * GENERATED: do not edit. Run `npm run generate:types` to regenerate from',
    ` * cocart-openapi/${source}.`,
    ' *',
    ' * Response types for the public API live in src/cocart.types.ts.',
    ' */',
    '',
  ].join('\n');
  writeFileSync(out, header + readFileSync(out, 'utf8'));
  console.log(`Wrote ${out}`);
}
