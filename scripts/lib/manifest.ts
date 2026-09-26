import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const MANIFEST_NAME = "VENDORED.json";

/** Provenance record that the vendor script writes into each consumer copy. */
export interface VendorManifest {
  readonly source: "oxlint-rules";
  readonly plugin: string;
  readonly commit: string;
  readonly files: Readonly<Record<string, string>>;
}

export function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function readManifest(vendorRoot: string): VendorManifest | null {
  const path = join(vendorRoot, MANIFEST_NAME);
  if (!existsSync(path)) return null;
  // SAFETY: only the vendor script writes this file, and it writes a VendorManifest.
  return JSON.parse(readFileSync(path, "utf8")) as VendorManifest;
}

export function writeManifest(vendorRoot: string, manifest: VendorManifest): void {
  writeFileSync(join(vendorRoot, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
}
