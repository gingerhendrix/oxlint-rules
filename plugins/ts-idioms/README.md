# ts-idioms Oxlint plugin

Personal Oxlint rules for plain TypeScript. This repository owns the rules. Consumers vendor a
copy with `bun run vendor ts-idioms <repo>`.

| Rule                    | Reports                                     | Options                                       |
| ----------------------- | ------------------------------------------- | --------------------------------------------- |
| `no-unknown-parameters` | function parameters typed exactly `unknown` | `allowedNames: string[]`, default `["cause"]` |

## `no-unknown-parameters`

This rule is a copy of `anti-slop/no-unknown-parameters` from Dillon Mulroy's
[`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop) at commit
`6d538555cb151d4121ed51a27db81890eacf8ae9`, under the MIT license in [`LICENSE`](LICENSE).
The copy keeps the `6d53855` behaviour, with one change: the `allowedNames` option replaces the
fixed `cause` exemption. With the default option the rule reports the same parameters as the
`anti-slop` rule. A consumer turns `anti-slop/no-unknown-parameters` off when it turns this rule
on.

The copy does not take the newer upstream changes. Those exempt type-predicate subjects
(`value: unknown): value is T`) and report `unknown` inside unions (`string | unknown`). Take
them when `plugins/anti-slop` moves to a newer upstream commit.

StreamOS uses the option for catch helpers:

```json
"ts-idioms/no-unknown-parameters": ["warn", { "allowedNames": ["cause", "error", "err"] }]
```

The list replaces the default, so keep `cause` in it.

### The name match is weak on purpose

The rule matches a parameter by its whole name. Any parameter called `error` passes, even when
it is a data value and not a caught error. This is the approved design (lint-debt decision D9,
option A, 2026-09-27). Catch helpers such as `isAbortError(error: unknown)`, `.catch((error:
unknown) => ...)` callbacks, and promise reject slots take a caught value, and TypeScript types
that value as `unknown`. A structural check for "this value came from a `catch`" would cost much
more. Reviewers should still question a parameter named `error` that is not a caught value.

Prefixes do not match (`errorLike`), and destructured parameters do not match (`{ error }`).

### When to remove this copy

Remove this rule when upstream `anti-slop` gets an equal option and `plugins/anti-slop` moves to
that commit. Consumers then switch back to `anti-slop/no-unknown-parameters` with the same
option.

## Tests

Oxlint's `RuleTester` needs Node 22 or later and does not run under Bun.

```bash
bun run test:rules
```
