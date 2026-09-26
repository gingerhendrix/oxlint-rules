// Copy one canonical plugin into a consumer repository.
//
//   bun run vendor <plugin> <consumer-worktree> [--dest tools/oxlint/<plugin>] [--allow-dirty]
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { defaultDest } from "./lib/consumers.ts";
import { hasUncommittedChanges, headCommit } from "./lib/git.ts";
import { vendorPlugin } from "./lib/vendor-copy.ts";

const root = resolve(import.meta.dir, "..");
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { dest: { type: "string" }, "allow-dirty": { type: "boolean", default: false } },
});

const [plugin, consumer] = positionals;
if (plugin === undefined || consumer === undefined) {
  console.error(
    "usage: bun run vendor <plugin> <consumer-worktree> [--dest <path>] [--allow-dirty]",
  );
  process.exit(2);
}

const pluginPath = `plugins/${plugin}`;
const pluginRoot = join(root, pluginPath);
if (!existsSync(pluginRoot)) {
  console.error(`unknown plugin "${plugin}": ${pluginRoot} does not exist`);
  process.exit(2);
}
if (hasUncommittedChanges(root, [pluginPath]) && !values["allow-dirty"]) {
  console.error(`${pluginPath} has uncommitted changes. Commit them first, or pass --allow-dirty.`);
  process.exit(1);
}

const vendorRoot = resolve(consumer, values.dest ?? defaultDest(plugin));
const commit = headCommit(root);
const result = vendorPlugin(plugin, pluginRoot, vendorRoot, commit);

console.log(`vendored ${plugin} at ${commit.slice(0, 8)} into ${vendorRoot}`);
console.log(`  ${result.written.length} files written, ${result.removed.length} removed`);
for (const path of result.removed) console.log(`  removed ${path}`);
