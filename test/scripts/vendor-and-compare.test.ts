import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { compareCopy, countByStatus } from "../../scripts/lib/compare.ts";
import { readManifest } from "../../scripts/lib/manifest.ts";
import { vendorPlugin } from "../../scripts/lib/vendor-copy.ts";

let workspace = "";
let pluginRoot = "";
let vendorRoot = "";

function write(root: string, path: string, content: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const statusOf = (path: string) =>
  compareCopy(pluginRoot, vendorRoot).find((file) => file.path === path)?.status;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "oxlint-rules-"));
  pluginRoot = join(workspace, "plugins", "demo");
  vendorRoot = join(workspace, "consumer", "tools", "oxlint", "demo");
  write(pluginRoot, "index.ts", "export default { rules: {} };\n");
  write(pluginRoot, "rules/no-thing.ts", "export const rule = {\n  meta: {},\n};\n");
  write(pluginRoot, "rules/no-thing.test.ts", "// canonical test\n");
  write(pluginRoot, "test/rule-tester.ts", "// canonical helper\n");
  write(pluginRoot, "LICENSE", "MIT\n");
  write(pluginRoot, "README.md", "# demo\n");
  write(pluginRoot, "UPSTREAM.md", "# upstream\n");
});

afterEach(() => rmSync(workspace, { recursive: true, force: true }));

describe("vendorPlugin", () => {
  test("copies rule code and the license, and leaves out tests and canonical docs", () => {
    const result = vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");

    expect(result.written).toEqual(["LICENSE", "index.ts", "rules/no-thing.ts"]);
    expect(existsSync(join(vendorRoot, "rules/no-thing.test.ts"))).toBe(false);
    expect(existsSync(join(vendorRoot, "test/rule-tester.ts"))).toBe(false);
    expect(existsSync(join(vendorRoot, "README.md"))).toBe(false);
    expect(existsSync(join(vendorRoot, "UPSTREAM.md"))).toBe(false);
  });

  test("records the plugin, commit, and file hashes in VENDORED.json", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    const manifest = readManifest(vendorRoot);

    expect(manifest?.plugin).toBe("demo");
    expect(manifest?.commit).toBe("abc123");
    expect(Object.keys(manifest?.files ?? {})).toEqual([
      "LICENSE",
      "index.ts",
      "rules/no-thing.ts",
    ]);
  });

  test("removes files from an earlier run and keeps consumer-owned files", () => {
    write(pluginRoot, "rules/old-rule.ts", "export const old = 1;\n");
    vendorPlugin("demo", pluginRoot, vendorRoot, "first");
    write(vendorRoot, "README.md", "# consumer notes\n");
    write(vendorRoot, "package.json", "{}\n");
    rmSync(join(pluginRoot, "rules/old-rule.ts"));

    const result = vendorPlugin("demo", pluginRoot, vendorRoot, "second");

    expect(result.removed).toEqual(["rules/old-rule.ts"]);
    expect(existsSync(join(vendorRoot, "rules/old-rule.ts"))).toBe(false);
    expect(readFileSync(join(vendorRoot, "README.md"), "utf8")).toBe("# consumer notes\n");
    expect(existsSync(join(vendorRoot, "package.json"))).toBe(true);
  });
});

describe("compareCopy", () => {
  test("reports a fresh copy as the same, file by file", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    const counts = countByStatus(compareCopy(pluginRoot, vendorRoot));

    expect(counts.same).toBe(3);
    expect(counts.modified + counts.missing + counts.extra + counts.stale).toBe(0);
  });

  test("ignores the consumer's README, package.json, manifest, and tests", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    write(vendorRoot, "README.md", "# consumer\n");
    write(vendorRoot, "package.json", "{}\n");
    write(vendorRoot, "test/local.test.ts", "// consumer test\n");

    expect(compareCopy(pluginRoot, vendorRoot).map((file) => file.path)).toEqual([
      "LICENSE",
      "index.ts",
      "rules/no-thing.ts",
    ]);
  });

  test("labels a reformatted file as whitespace-only", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    write(vendorRoot, "rules/no-thing.ts", "export const rule = {\n\tmeta: {},\n};\n");

    expect(statusOf("rules/no-thing.ts")).toBe("whitespace-only");
  });

  test("labels a file as stale when the canonical file changed after vendoring", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    write(pluginRoot, "rules/no-thing.ts", "export const rule = { meta: { fixed: true } };\n");

    expect(statusOf("rules/no-thing.ts")).toBe("stale");
  });

  test("labels a consumer edit as modified", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    write(vendorRoot, "rules/no-thing.ts", "export const rule = { meta: { local: true } };\n");

    expect(statusOf("rules/no-thing.ts")).toBe("modified");
  });

  test("labels a changed file as modified when the copy has no manifest", () => {
    write(vendorRoot, "index.ts", "export default { rules: { local: 1 } };\n");

    expect(statusOf("index.ts")).toBe("modified");
    expect(statusOf("rules/no-thing.ts")).toBe("missing");
  });

  test("labels a consumer-only rule file as extra", () => {
    vendorPlugin("demo", pluginRoot, vendorRoot, "abc123");
    write(vendorRoot, "rules/local-rule.ts", "export const local = 1;\n");

    expect(statusOf("rules/local-rule.ts")).toBe("extra");
  });
});
