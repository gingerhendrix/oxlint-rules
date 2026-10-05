# oxlint-rules

The one place for Gareth's custom Oxlint rules. Every rule has its source and its tests here.
Consumer repositories vendor a copy into `tools/oxlint/<plugin>/` and load it with `jsPlugins`.
Consumers own their rule severity, scopes, and exceptions. They do not own the rule code.

## Plugins

| Plugin          | Rules                                                                        | Origin                                                       |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `anti-slop`     | 18 generic rules, plus `effect/` with 5 Effect rules                         | Dillon Mulroy's `dmmulroy/anti-slop` at `c44ef22`, unchanged |
| `effect-idioms` | `no-tag-comparison`, `no-tag-switch`, `no-tag-destructure`, `no-tag-literal` | Streamsy `531d95bf`                                          |
| `react-idioms`  | `no-react-global-namespace`                                                  | Tooee `9a95fda`                                              |
| `ts-idioms`     | `no-unknown-parameters`, with an `allowedNames` option                       | Adapted from `dmmulroy/anti-slop` at `c44ef22` (MIT)         |

`plugins/anti-slop/` stays byte-identical to one upstream commit. See
[`plugins/anti-slop/UPSTREAM.md`](plugins/anti-slop/UPSTREAM.md). Put Personal rules in another
plugin folder.

`ts-idioms/no-unknown-parameters` is a Personal copy of the `anti-slop` rule with one change. Its
`allowedNames` option lets a consumer exempt catch-helper names such as `error` and `err`. The
name match is weak on purpose (lint-debt decision D9). Remove the copy when upstream gets an
equal option. See [`plugins/ts-idioms/README.md`](plugins/ts-idioms/README.md).

## Vendor a plugin into a repository

```bash
bun run vendor effect-idioms ../../streamsy/effect
```

The script copies the rule code and the license into `tools/oxlint/effect-idioms/` in the target
worktree. Use `--dest <path>` for another folder. It skips tests, `README.md`, and `UPSTREAM.md`.
It writes `VENDORED.json` with the source commit and a hash for each file. It leaves the
consumer's `README.md` and `package.json` in place. It refuses to run when the plugin has
uncommitted changes, because the recorded commit would be wrong.

Then, in the consumer:

1. Add the plugin to `jsPlugins` in the Oxlint config, for example
   `{ "name": "effect-idioms", "specifier": "./tools/oxlint/effect-idioms/index.ts" }`.
2. Set rule severities and path overrides.
3. Keep the vendored folder out of the consumer's formatter and out of its own custom-rule
   checks. A formatter pass makes the copy drift.
4. Add or update the entry in [`consumers.json`](consumers.json) here.

## Check for drift

```bash
bun run check-vendor --verbose
```

This compares every copy in `consumers.json` with the canonical plugin, file by file:

| Status            | Meaning                                                          | Action                                               |
| ----------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| `same`            | Byte-identical.                                                  | None.                                                |
| `whitespace-only` | Equal after all whitespace is removed. Usually a formatter pass. | Re-vendor and exclude the folder from the formatter. |
| `stale`           | Matches `VENDORED.json`, but the rule changed here since.        | Re-vendor.                                           |
| `modified`        | The consumer changed the file.                                   | Move the change here, then re-vendor.                |
| `missing`         | The consumer copy lacks a file.                                  | Re-vendor.                                           |
| `extra`           | The consumer copy has a rule file that this repository lacks.    | Move the rule here, then re-vendor.                  |

`--strict` exits 1 for any status except `same` and `whitespace-only`. To check one copy
outside the registry, pass `<plugin> <worktree> [--dest <path>]`.

## Change a rule

1. Make the change in `plugins/<plugin>/` with RuleTester cases. Build invalid cases from real
   code where you can.
2. Run `bun run check`.
3. Commit.
4. Re-vendor into each consumer in `consumers.json`, one consumer branch at a time. Run the
   consumer's lint gate on that branch.

A new rule that only one repository needs can start in that repository. Move it here when a
second repository wants it, or when you want this repository's tests and history for it.

## Commands

| Command                | What it does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| `bun run check`        | Typecheck, lint, format check, and all tests.                          |
| `bun run test:rules`   | RuleTester cases under `node --test`. Oxlint's RuleTester rejects Bun. |
| `bun run test:scripts` | Tests for the vendor and drift-check scripts, under `bun test`.        |
| `bun run vendor`       | Copy a plugin into a consumer.                                         |
| `bun run check-vendor` | Report drift for the registered consumers.                             |

## Oxlint versions

This repository tests with `oxlint` and `@oxlint/plugins` 1.85.0. Consumers pin their own pair:
StreamOS and Tooee use 1.85.0, Effect Ink uses 1.80.0, and Streamsy uses 1.78.0. The tests here
do not cover older Oxlint versions, so run the consumer's lint gate after each vendor run.
