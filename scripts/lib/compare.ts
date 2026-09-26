import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { readManifest, sha256 } from "./manifest.ts";
import { consumerFiles, vendoredFiles } from "./plugin-files.ts";

/**
 * - `same`: the consumer file matches the canonical file byte for byte.
 * - `whitespace-only`: the files match after all whitespace is removed, for example after a
 *   consumer formatter ran over the copy.
 * - `stale`: the consumer file matches its manifest, but the canonical file has changed since.
 * - `modified`: the consumer changed the file.
 * - `missing`: the canonical plugin has the file and the consumer copy does not.
 * - `extra`: the consumer copy has a rule file that the canonical plugin does not.
 */
export type FileStatus = "same" | "whitespace-only" | "stale" | "modified" | "missing" | "extra";

export interface FileDrift {
  readonly path: string;
  readonly status: FileStatus;
}

const withoutWhitespace = (content: Buffer) => content.toString("utf8").replace(/\s+/gu, "");

function changedStatus(consumer: Buffer, canonical: Buffer, recordedHash: string | undefined) {
  if (withoutWhitespace(consumer) === withoutWhitespace(canonical)) return "whitespace-only";
  if (recordedHash === sha256(consumer)) return "stale";
  return "modified";
}

/** Compare a consumer's vendored folder with the canonical plugin folder, file by file. */
export function compareCopy(pluginRoot: string, vendorRoot: string): FileDrift[] {
  const canonical = vendoredFiles(pluginRoot);
  const present = existsSync(vendorRoot) ? consumerFiles(vendorRoot) : [];
  const recorded = existsSync(vendorRoot) ? (readManifest(vendorRoot)?.files ?? {}) : {};
  const drift: FileDrift[] = [];

  for (const path of canonical) {
    if (!present.includes(path)) {
      drift.push({ path, status: "missing" });
      continue;
    }
    const consumer = readFileSync(join(vendorRoot, path));
    const source = readFileSync(join(pluginRoot, path));
    const status = consumer.equals(source)
      ? "same"
      : changedStatus(consumer, source, recorded[path]);
    drift.push({ path, status });
  }
  for (const path of present) {
    if (!canonical.includes(path)) drift.push({ path, status: "extra" });
  }
  // Code-unit order, the same order as the file listings.
  return drift.sort((left, right) => (left.path < right.path ? -1 : 1));
}

export function countByStatus(drift: readonly FileDrift[]): Record<FileStatus, number> {
  const counts: Record<FileStatus, number> = {
    same: 0,
    "whitespace-only": 0,
    stale: 0,
    modified: 0,
    missing: 0,
    extra: 0,
  };
  for (const file of drift) counts[file.status] += 1;
  return counts;
}
