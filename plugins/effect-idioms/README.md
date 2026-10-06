# effect-idioms Oxlint plugin

Oxlint rules that steer tagged values towards Effect's own utilities. This repository owns
the rules. Consumers vendor a copy with `bun run vendor effect-idioms <repo>`.

Origin: Streamsy commit `531d95bf` (`tools/oxlint/effect-idioms/`, branch `effect-tag-lint`).

| Rule                 | Reports                                                       | Suggested replacement                                                                                                            |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `no-tag-comparison`  | `x._tag === "Tag"`, `!==`, `==`, `!=`, and `"_tag" in x`      | `Predicate.isTagged`, `Match.valueTags`, `catchTag`, `Option.isSome`, `Exit.isFailure`, `Result.isFailure`, `Cause.isFailReason` |
| `no-tag-switch`      | `switch (x._tag)`                                             | `Match.valueTags`, `$match`, `Schema.TaggedUnion` `match`                                                                        |
| `no-tag-destructure` | `const { _tag: tag } = x`                                     | Narrow `x` itself with a tag utility                                                                                             |
| `no-tag-literal`     | `{ _tag: "Tag", ... }` values and `_tag = "Tag"` class fields | `Data.taggedEnum`, `Data.TaggedError`, `Schema.TaggedStruct`, `Schema.TaggedError`                                               |

`no-tag-comparison` picks its message from context:

- It names the built-in guard for Effect's own tags (`Some`, `None`, `Success`, `Failure`, `Fail`,
  `Die`, `Interrupt`).
- Inside `catch*` and `orElse` callbacks, it suggests `catchTag` or `catchTags`. For a nested
  `error.reason._tag`, it suggests `Effect.catchReason` or `Effect.catchReasons`.
- Inside `mapError` and `tapError` callbacks, it suggests `Match.valueTags` or
  `Predicate.isTagged`. These callbacks only map or observe the error, so it does not tell you to
  recover.
- It suggests `Predicate.isTagged` for `while` and `until` retry options and for
  `(x) => x._tag === "Tag"` callbacks.

`no-tag-switch` uses the same catch-handler context. It suggests `catchTags` for a `switch` on
`_tag` in a `catch*` or `orElse` callback, and `catchReasons` for a `switch` on `reason._tag`.

These places may still name `_tag` directly, and the rules do not report them:

- type declarations, such as `{ readonly _tag: "Applied" }` and `Extract<Op, { _tag: "Create" }>`;
- schema fields, such as `Schema.Struct({ _tag: Schema.Literal("BadRequest") })`;
- shorthand properties, such as `{ _tag, route }` in a wire decoder;
- values inside `expect(...)`, `toEqual`, `toMatchObject`, and similar test assertions.
- patterns passed to `Match.when`, `Match.whenOr`, `Match.whenAnd`, and `Match.not`, including
  nested objects in those patterns.

Upstream `anti-slop` `c44ef22` added 3 Effect tag rules under `anti-slop-effect`:
`no-manual-tag-comparison`, `no-manual-effect-error-tag`, and `no-manual-tagged-construction`.
These rules find a subset of what this plugin finds. The `Match` pattern exemption, the
`catchReason` advice, and the catch-handler `switch` advice come from those upstream rules. See
the 2026-10-05 overlap study in the vault stream `oxlint-rules-updates`.

Consumers should turn the rules off in test files. Streamsy's `.oxlintrc.effect.json` turns them
off in test files and `src/testing/`. For a deliberate
exception elsewhere, such as an external API option, use a line disable with a reason:

```ts
// oxlint-disable-next-line effect-idioms/no-tag-literal -- provider option shape, not an Effect value
reasoning: { _tag: "disabled" },
```

## Tests

Oxlint's `RuleTester` needs Node 22 or later and does not run under Bun.

```bash
bun run test:rules
```
