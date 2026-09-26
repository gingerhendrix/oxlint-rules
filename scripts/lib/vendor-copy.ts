import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { readManifest, sha256, writeManifest } from "./manifest.ts";
import { vendoredFiles } from "./plugin-files.ts";

export interface VendorResult {
  readonly written: readonly string[];
  readonly removed: readonly string[];
}

/**
 * Copy one canonical plugin into a consumer folder and record its provenance.
 *
 * The copy removes files that an earlier vendor run wrote and the plugin no longer has. It
 * leaves every other consumer file in place, including the consumer's README and package.json.
 */
export function vendorPlugin(
  plugin: string,
  pluginRoot: string,
  vendorRoot: string,
  commit: string,
): VendorResult {
  const files = vendoredFiles(pluginRoot);
  const previous = existsSync(vendorRoot) ? readManifest(vendorRoot) : null;
  const removed = Object.keys(previous?.files ?? {}).filter((path) => !files.includes(path));

  for (const path of removed) rmSync(join(vendorRoot, path), { force: true });

  const hashes: Record<string, string> = {};
  for (const path of files) {
    const target = join(vendorRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(pluginRoot, path), target);
    hashes[path] = sha256(readFileSync(target));
  }
  writeManifest(vendorRoot, { source: "oxlint-rules", plugin, commit, files: hashes });
  return { written: files, removed };
}
