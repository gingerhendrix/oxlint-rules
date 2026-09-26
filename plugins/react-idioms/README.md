# react-idioms Oxlint plugin

Oxlint rules for React code. This repository owns the rules. Consumers vendor a copy with
`bun run vendor react-idioms <repo>`.

| Rule                        | Reports                                                       | Fix                                                                   |
| --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `no-react-global-namespace` | `React.X` type names in a file with no `React` import binding | a named type import, such as `import type { ReactNode } from "react"` |

Origin: Tooee commit `9a95fda`. Tooee registered this rule inside its vendored `anti-slop`
plugin as `anti-slop/no-react-global-namespace`. Here it lives in its own plugin, so the rule id
is `react-idioms/no-react-global-namespace`. Tooee must rename the id when it adopts this copy.

## Tests

```bash
bun run test:rules
```
