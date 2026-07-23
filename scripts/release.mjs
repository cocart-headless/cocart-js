#!/usr/bin/env node
/**
 * Bumps every place a release version needs to be updated in lockstep:
 *   - package.json's `version`
 *   - `CoCart.VERSION` in src/cocart.ts (sent in the User-Agent header)
 *   - CHANGELOG.md: retitles [Unreleased] to the new version + date,
 *     opens a fresh empty [Unreleased] section, and updates the
 *     compare-link references at the bottom.
 *
 * Usage: node scripts/release.mjs <version>
 * Example: node scripts/release.mjs 1.2.0
 *
 * Does NOT git commit, tag, or publish — review the diff, then do those
 * steps yourself.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/release.mjs <version>  (e.g. 1.2.0)');
  process.exit(1);
}

// --- package.json ---

const pkgPath = path.join(rootDir, 'package.json');
const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
const previousVersion = pkg.version;

if (previousVersion === version) {
  console.error(`package.json is already at ${version}.`);
  process.exit(1);
}

const newPkgRaw = pkgRaw.replace(
  /"version":\s*"[^"]+"/,
  `"version": "${version}"`,
);
writeFileSync(pkgPath, newPkgRaw);
console.log(`package.json: ${previousVersion} -> ${version}`);

// --- src/cocart.ts (CoCart.VERSION) ---

const cocartTsPath = path.join(rootDir, 'src', 'cocart.ts');
const cocartTs = readFileSync(cocartTsPath, 'utf8');
const versionConstPattern = /static readonly VERSION = '[^']+';/;

if (!versionConstPattern.test(cocartTs)) {
  console.error('Could not find `static readonly VERSION = \'...\';` in src/cocart.ts.');
  process.exit(1);
}

writeFileSync(
  cocartTsPath,
  cocartTs.replace(versionConstPattern, `static readonly VERSION = '${version}';`),
);
console.log(`src/cocart.ts: CoCart.VERSION -> ${version}`);

// --- CHANGELOG.md ---

const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf8');

const unreleasedHeading = '## [Unreleased]';
const unreleasedIndex = changelog.indexOf(unreleasedHeading);

if (unreleasedIndex === -1) {
  console.error('Could not find "## [Unreleased]" heading in CHANGELOG.md.');
  process.exit(1);
}

const afterHeading = unreleasedIndex + unreleasedHeading.length;
const nextHeadingMatch = changelog.slice(afterHeading).match(/\n## \[/);
const sectionEnd = nextHeadingMatch
  ? afterHeading + nextHeadingMatch.index + 1
  : changelog.length;

const unreleasedBody = changelog.slice(afterHeading, sectionEnd);
const today = new Date().toISOString().slice(0, 10);

const replacement = `${unreleasedHeading}\n\n## [${version}] - ${today}${unreleasedBody}`;
let newChangelog = changelog.slice(0, unreleasedIndex) + replacement + changelog.slice(sectionEnd);

// Update the compare-link references at the bottom.
const linkRefPattern = /^\[Unreleased\]: (.+)\/compare\/v[\d.]+\.\.\.HEAD$/m;
const linkMatch = newChangelog.match(linkRefPattern);

if (linkMatch) {
  const repoUrl = linkMatch[1];
  const newLinkBlock =
    `[Unreleased]: ${repoUrl}/compare/v${version}...HEAD\n` +
    `[${version}]: ${repoUrl}/compare/v${previousVersion}...v${version}`;
  newChangelog = newChangelog.replace(linkRefPattern, newLinkBlock);
} else {
  console.warn('Could not find "[Unreleased]: .../compare/vX...HEAD" link line — skipped updating compare links, add manually.');
}

writeFileSync(changelogPath, newChangelog);
console.log(`CHANGELOG.md: [Unreleased] -> [${version}] - ${today}, fresh [Unreleased] section opened`);

console.log('\nDone. Review the diff, then:');
console.log('  npm test && npm run build');
console.log(`  git commit -am "Release v${version}"`);
console.log(`  git tag v${version}`);
console.log('  npm publish');
