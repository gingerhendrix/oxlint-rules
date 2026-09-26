import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Files that consumers own even inside a vendored folder. The vendor script never writes them. */
const CONSUMER_OWNED = new Set(["README.md", "package.json", "VENDORED.json"]);

/** Canonical-only files. They document or test a plugin here and are not vendored. */
const CANONICAL_ONLY = new Set(["README.md", "UPSTREAM.md"]);

function isTestPath(path: string): boolean {
  return path.endsWith(".test.ts") || path.split("/").includes("test");
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      if (entry === "node_modules") continue;
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) walk(path);
      else files.push(relative(root, path).split(sep).join("/"));
    }
  };
  walk(root);
  return files.sort();
}

/** Relative paths of the plugin files that a consumer receives: rule code and the license. */
export function vendoredFiles(pluginRoot: string): string[] {
  return listFiles(pluginRoot).filter((path) => !isTestPath(path) && !CANONICAL_ONLY.has(path));
}

/**
 * Relative paths in a consumer folder that the drift check compares. The consumer's own README,
 * package.json, and manifest are left out.
 */
export function consumerFiles(vendorRoot: string): string[] {
  return listFiles(vendorRoot).filter((path) => !isTestPath(path) && !CONSUMER_OWNED.has(path));
}
