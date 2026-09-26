import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** One vendored copy of one plugin in one consumer worktree. */
export interface Consumer {
  readonly repo: string;
  readonly worktree: string;
  readonly plugin: string;
  readonly dest: string;
  readonly notes?: string;
}

interface ConsumerRegistry {
  readonly consumers: readonly Consumer[];
}

export function readConsumers(root: string): readonly Consumer[] {
  // SAFETY: consumers.json is a hand-edited registry in this repository with this shape.
  const registry = JSON.parse(
    readFileSync(join(root, "consumers.json"), "utf8"),
  ) as ConsumerRegistry;
  return registry.consumers;
}

/**
 * Consumer worktrees sit beside this repository under the Personal `repos/` folder:
 * `repos/oxlint-rules/main` and `repos/<repo>/<worktree>`.
 */
export function consumerWorktree(root: string, consumer: Consumer): string {
  return resolve(root, "..", "..", consumer.repo, consumer.worktree);
}

export const defaultDest = (plugin: string) => `tools/oxlint/${plugin}`;
