import { eslintCompatPlugin } from "@oxlint/plugins";

import { noUnknownParametersRule } from "./rules/no-unknown-parameters.ts";

/** Personal TypeScript rules, including adapted copies of upstream rules that need options. */
const tsIdiomsPlugin = eslintCompatPlugin({
  meta: { name: "ts-idioms" },
  rules: {
    "no-unknown-parameters": noUnknownParametersRule,
  },
});

export default tsIdiomsPlugin;
