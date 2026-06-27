#!/usr/bin/env node
/*
 * OpenAPI ↔ hand-written client drift guard.
 *
 * The frontend uses a hand-written client (src/api/types.ts) instead of the generated one, so it can
 * silently drift from the contract (turfbook-backend/.../openapi/api.yaml). This guard fails CI when a
 * schema defined in the contract has NO matching `interface | type | enum` in types.ts and is not in
 * the allowlist of intentionally-unmirrored schemas (scripts/api-drift-allowlist.json).
 *
 *   npm run check:api-drift          # verify (exit 1 on new, unmirrored schemas)
 *   npm run check:api-drift:update   # re-seed the allowlist after an intentional change
 */
const fs = require('fs');
const path = require('path');

const API_YAML = path.resolve(__dirname, '../../turfbook-backend/src/main/resources/openapi/api.yaml');
const TYPES_TS = path.resolve(__dirname, '../src/api/types.ts');
const ALLOWLIST = path.resolve(__dirname, 'api-drift-allowlist.json');

function fail(msg) { console.error(msg); process.exit(1); }

if (!fs.existsSync(API_YAML)) fail(`[api-drift] contract not found: ${API_YAML}`);
if (!fs.existsSync(TYPES_TS)) fail(`[api-drift] client types not found: ${TYPES_TS}`);

// ── Collect schema names under `components:` → `schemas:` (2-space, then 4-space keys). ──
const yaml = fs.readFileSync(API_YAML, 'utf8').split(/\r?\n/);
const schemas = [];
let inComponents = false;
let inSchemas = false;
for (const line of yaml) {
  if (/^components:\s*$/.test(line)) { inComponents = true; continue; }
  if (inComponents && /^\S/.test(line)) { inComponents = false; inSchemas = false; } // left components
  if (inComponents && /^  schemas:\s*$/.test(line)) { inSchemas = true; continue; }
  if (inSchemas && /^  \S/.test(line) && !/^    /.test(line)) { inSchemas = false; } // left schemas
  if (inSchemas) {
    const m = line.match(/^    ([A-Za-z0-9_]+):\s*$/);
    if (m) schemas.push(m[1]);
  }
}

if (schemas.length === 0) fail('[api-drift] no schemas parsed from api.yaml — parser may be out of date.');

// ── Type names declared in the hand-written client. ──
const types = fs.readFileSync(TYPES_TS, 'utf8');
const declared = new Set();
for (const m of types.matchAll(/\b(?:export\s+)?(?:interface|type|enum)\s+([A-Za-z0-9_]+)/g)) {
  declared.add(m[1]);
}

const missing = schemas.filter((s) => !declared.has(s)).sort();

const isUpdate = process.argv.includes('--update');
if (isUpdate) {
  fs.writeFileSync(ALLOWLIST, JSON.stringify({ allow: missing }, null, 2) + '\n');
  console.log(`[api-drift] allowlist re-seeded with ${missing.length} unmirrored schema(s): ${ALLOWLIST}`);
  process.exit(0);
}

const allow = fs.existsSync(ALLOWLIST)
  ? new Set((JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')).allow) || [])
  : new Set();

const drift = missing.filter((s) => !allow.has(s));
if (drift.length > 0) {
  fail(
    `[api-drift] ${drift.length} contract schema(s) have no matching type in src/api/types.ts and are not allowlisted:\n` +
    drift.map((s) => `  - ${s}`).join('\n') +
    `\n\nEither add the type to src/api/types.ts, or (if intentionally unmirrored) run: npm run check:api-drift:update`
  );
}

console.log(`[api-drift] OK — ${schemas.length} schemas, ${schemas.length - missing.length} mirrored, ${allow.size} allowlisted.`);
