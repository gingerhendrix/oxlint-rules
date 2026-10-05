import { noUnknownParametersRule } from "../rules/no-unknown-parameters.ts";
import { ruleTester } from "./rule-tester.ts";

const catchHelpers = [{ allowedNames: ["cause", "error", "err"] }];

function reported(parameter: string) {
  return [{ messageId: "unknownParameter", data: { parameter } }];
}

// Code samples are trimmed from StreamOS main at adf8732b. The path above each case names the source.
ruleTester.run("no-unknown-parameters (default options)", noUnknownParametersRule, {
  valid: [
    "function enrich(cause: unknown): void {}",
    "function enrich(cause: Error | unknown): void {}",
    "function parse(value: string | number): void {}",
    // Type-predicate and assertion subjects are exempt (upstream c44ef22).
    "function isString(value: unknown): value is string { return true; }",
    "const isString = (value: unknown): value is string => true;",
    "function assertString(value: unknown): asserts value is string {}",
    "type Guard = (value: unknown) => value is string;",
    "declare function isString(value: unknown): value is string;",
    "type Guards = { isString(value: unknown): value is string };",
  ],
  invalid: [
    {
      // packages/streams-client/src/lifecycle-source.ts
      code: 'function isAbortError(error: unknown): boolean { return error instanceof DOMException && error.name === "AbortError"; }',
      errors: reported("error"),
    },
    {
      // packages/streams-client/src/react-lifecycle.ts
      code: "void runTail(config, streamId, subscription).catch((error: unknown) => { report(error); });",
      errors: reported("error"),
    },
    {
      // packages/streams-sync/src/active-agents.ts
      code: "let rejectReady!: (error: unknown) => void;",
      errors: reported("error"),
    },
    {
      // apps/ptui/src/routes/agent-usage/agent-usage-provider.ts
      code: "function isStreamNotFound(err: unknown): boolean { return false; }",
      errors: reported("err"),
    },
    {
      // `unknown` absorbs every union member, so a union with `unknown` is reported (upstream c44ef22).
      code: "function parse(value: string | unknown): void {}",
      errors: reported("value"),
    },
    {
      code: "function parse(value: string | (number | unknown)): void {}",
      errors: reported("value"),
    },
    {
      // Only the predicate subject is exempt. Other unknown parameters are still reported.
      code: "function isString(value: unknown, context: unknown): value is string { return true; }",
      errors: reported("context"),
    },
    {
      // A destructured parameter is named by its binding only, without the annotation or default.
      code: "export function parse({ value }: unknown = {}): void {}",
      errors: reported("{ value }"),
    },
  ],
});

ruleTester.run("no-unknown-parameters (catch-helper names)", noUnknownParametersRule, {
  valid: [
    { code: "function enrich(cause: unknown): void {}", options: catchHelpers },
    {
      // packages/streams-sync/src/lifecycle-fact-source.ts
      code: 'function isAbortError(error: unknown): boolean { return error instanceof DOMException && error.name === "AbortError"; }',
      options: catchHelpers,
    },
    {
      // apps/ptui/src/routes/agent-events/agent-events-provider.ts
      code: "function isStreamNotFound(err: unknown): boolean { return false; }",
      options: catchHelpers,
    },
    {
      // apps/streams-server/src/lifecycle/snooze-reconciler.ts
      code: "run().catch((error: unknown) => { log.warn(error); });",
      options: catchHelpers,
    },
    {
      // packages/streams-sync/src/agent-day-router.ts
      code: "let rejectReady!: (error: unknown) => void;",
      options: catchHelpers,
    },
    {
      // packages/streams-sync/src/sync.ts
      code: "class Sync { private markFailed(error: unknown): void {} }",
      options: catchHelpers,
    },
    { code: "function collect(...err: unknown): void {}", options: catchHelpers },
    { code: "function fail(error: unknown = new Error()): void {}", options: catchHelpers },
    {
      code: "class Failure { constructor(readonly error: unknown) {} }",
      options: catchHelpers,
    },
    { code: "function report(error: Error | unknown): void {}", options: catchHelpers },
    {
      // The predicate exemption does not depend on the option.
      code: "function isFailure(value: unknown): value is Error { return true; }",
      options: catchHelpers,
    },
  ],
  invalid: [
    {
      // apps/ptui/src/routes/agent-events/event-mapping.ts
      code: "function compactValue(value: unknown): string { return String(value); }",
      options: catchHelpers,
      errors: reported("value"),
    },
    {
      // packages/schema/src/lifecycle.ts
      code: "type FactValidator = (value: unknown, path: string) => string[];",
      options: catchHelpers,
      errors: reported("value"),
    },
    {
      // packages/streams-sync/src/day-overview.ts: the rule matches whole names, so `e` is reported.
      code: "let ok!: () => void, fail!: (e: unknown) => void;",
      options: catchHelpers,
      errors: reported("e"),
    },
    {
      // A name only counts when it is the whole binding. Prefixes and destructured names do not.
      code: "function wrap(errorLike: unknown, { error }: unknown): void {}",
      options: catchHelpers,
      errors: [...reported("errorLike"), ...reported("{ error }")],
    },
    {
      code: "function collect(...value: unknown): void {}",
      options: catchHelpers,
      errors: reported("value"),
    },
    {
      code: "function read(value: unknown = null): void {}",
      options: catchHelpers,
      errors: reported("value"),
    },
    {
      code: "function render(value: string | unknown, error: unknown): void {}",
      options: catchHelpers,
      errors: reported("value"),
    },
    {
      // The configured list replaces the default. Leave out `cause` and `cause` is reported.
      code: "function enrich(cause: unknown, error: unknown): void {}",
      options: [{ allowedNames: ["error"] }],
      errors: reported("cause"),
    },
  ],
});
