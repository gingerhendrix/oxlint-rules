# anti-slop upstream

This folder is Dillon Mulroy's `anti-slop` Oxlint plugin under the MIT license (see `LICENSE`).

- Upstream: `https://github.com/dmmulroy/anti-slop`
- Upstream commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10, after v0.1.2)
- Upstream path: `src/`
- Local changes: none. The files are byte-identical to upstream `src/`, including upstream tests.

Keep this folder byte-identical to one upstream commit. Do not format it. Put Personal rules in
another plugin folder. To take an upstream change, copy the new `src/` over this folder in one
commit and update the commit line above.

History: this folder first held upstream `6d53855` (2026-08-18). Personal consumers vendored that
commit before this repository existed. On 2026-10-06 it moved to `c44ef22`. That update adds
`no-array-filter-map`, `no-reduce-accumulator-copy`, and `require-readable-spacing`, four more
Effect rules under `effect/`, and a vendored ESLint Stylistic engine under
`vendor/eslint-stylistic/`. Consumers still on `6d53855` show as `stale` until they re-vendor.
