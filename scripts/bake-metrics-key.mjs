#!/usr/bin/env node
/**
 * Substitutes the metrics endpoint and API key into the compiled output.
 *
 * The CLI runs on the user's machine, where METRICS_API_KEY will never be set,
 * so the channel key has to travel with the package. It must not travel with the
 * repository: the source keeps `__METRICS_URL__` / `__METRICS_API_KEY__`
 * placeholders, CI replaces them in build/ right before publishing, and a value
 * still in placeholder form is treated as absent at runtime (telemetry off).
 *
 * Missing env vars are not an error — a local build simply stays un-baked.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 'build/modules/metrics/metrics.const.js';

const substitutions = [
  ['__METRICS_URL__', process.env.METRICS_URL],
  ['__METRICS_API_KEY__', process.env.METRICS_API_KEY],
];

if (substitutions.every(([, value]) => !value)) {
  console.log('bake-metrics-key: METRICS_URL/METRICS_API_KEY unset, leaving placeholders.');
  process.exit(0);
}

let source;
try {
  source = readFileSync(TARGET, 'utf8');
} catch {
  console.error(`bake-metrics-key: ${TARGET} not found — run the build first.`);
  process.exit(1);
}

for (const [placeholder, value] of substitutions) {
  if (!value) {
    console.warn(`bake-metrics-key: no value for ${placeholder}, leaving it in place.`);
    continue;
  }
  if (!source.includes(placeholder)) {
    console.error(`bake-metrics-key: ${placeholder} not found in ${TARGET}.`);
    process.exit(1);
  }
  source = source.replaceAll(placeholder, value);
}

writeFileSync(TARGET, source);
console.log(`bake-metrics-key: baked into ${TARGET}.`);
