import { noReactGlobalNamespaceRule } from "../rules/no-react-global-namespace.ts";
import { ruleTester } from "./rule-tester.ts";

ruleTester.run("no-react-global-namespace", noReactGlobalNamespaceRule, {
  valid: [
    'import type { ReactNode } from "react"; type Props = { children: ReactNode };',
    'import React from "react"; type Props = { children: React.ReactNode };',
    'import * as React from "react"; let element: React.JSX.Element;',
    'import type React from "react"; let node: React.ReactNode;',
    "type Props = { children: Preact.ComponentChildren };",
  ],
  invalid: [
    {
      code: "type Props = { children: React.ReactNode };",
      errors: [{ messageId: "globalNamespace", line: 1, column: 25 }],
    },
    {
      code: 'import { useState } from "react"; let element: React.JSX.Element;',
      errors: [{ messageId: "globalNamespace" }],
    },
    {
      code: "function render(): React.ReactElement { return null; }",
      errors: [{ messageId: "globalNamespace" }],
    },
  ],
});
