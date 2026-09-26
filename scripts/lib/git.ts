function git(root: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", "-C", root, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed in ${root}: ${result.stderr.toString().trim()}`);
  }
  return result.stdout.toString().trim();
}

export function headCommit(root: string): string {
  return git(root, ["rev-parse", "HEAD"]);
}

/** True when the given paths have uncommitted changes, so a recorded commit would not match. */
export function hasUncommittedChanges(root: string, paths: readonly string[]): boolean {
  return git(root, ["status", "--porcelain", "--", ...paths]) !== "";
}
