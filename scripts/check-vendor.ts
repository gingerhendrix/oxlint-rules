// Report drift between consumer copies and the canonical plugins.
//
//   bun run check-vendor [--strict] [--verbose]              every entry in consumers.json
//   bun run check-vendor <plugin> <consumer-worktree> [--dest <path>] [--strict] [--verbose]
//
// --strict exits 1 when a copy is stale, modified, missing files, or has extra rule files.
// Whitespace-only differences are reported and do not fail.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { compareCopy, countByStatus, type FileDrift } from "./lib/compare.ts";
import { consumerWorktree, defaultDest, readConsumers } from "./lib/consumers.ts";
import { readManifest } from "./lib/manifest.ts";

const root = resolve(import.meta.dir, "..");
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    dest: { type: "string" },
    strict: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
  },
});

interface Target {
  readonly label: string;
  readonly plugin: string;
  readonly vendorRoot: string;
}

function targets(): Target[] {
  const [plugin, consumer] = positionals;
  if (plugin !== undefined && consumer !== undefined) {
    const vendorRoot = resolve(consumer, values.dest ?? defaultDest(plugin));
    return [{ label: consumer, plugin, vendorRoot }];
  }
  return readConsumers(root).map((entry) => ({
    label: `${entry.repo}/${entry.worktree}`,
    plugin: entry.plugin,
    vendorRoot: join(consumerWorktree(root, entry), entry.dest),
  }));
}

const FAILING = new Set(["stale", "modified", "missing", "extra"]);

function describe(drift: readonly FileDrift[]): string {
  const counts = countByStatus(drift);
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${status}`);
  return parts.join(", ");
}

let failed = false;
for (const target of targets()) {
  const heading = `${target.label}  ${target.plugin}`;
  if (!existsSync(target.vendorRoot)) {
    console.log(`${heading}: no copy at ${target.vendorRoot}`);
    failed = true;
    continue;
  }
  const drift = compareCopy(join(root, "plugins", target.plugin), target.vendorRoot);
  const manifest = readManifest(target.vendorRoot);
  const provenance =
    manifest === null ? "no VENDORED.json" : `vendored at ${manifest.commit.slice(0, 8)}`;
  const drifted = drift.filter((file) => file.status !== "same");
  const verdict = drifted.length === 0 ? "in sync" : describe(drift);
  console.log(`${heading}: ${verdict} (${provenance})`);
  if (values.verbose)
    for (const file of drifted) console.log(`    ${file.status.padEnd(15)} ${file.path}`);
  if (drift.some((file) => FAILING.has(file.status))) failed = true;
}

if (values.strict && failed) process.exit(1);
