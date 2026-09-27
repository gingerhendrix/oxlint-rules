// Adapted from dmmulroy/anti-slop `src/rules/no-unknown-parameters.ts` at commit
// 6d538555cb151d4121ed51a27db81890eacf8ae9 (MIT, Copyright (c) 2026 Dillon Mulroy; see LICENSE).
// Local change: the `allowedNames` option replaces the hard-coded `cause` exemption.
import { defineRule } from "@oxlint/plugins";
import type { ESTree, Options } from "@oxlint/plugins";

type Parameter = ESTree.ParamPattern;
type ParameterOwner =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

/** Upstream exempts only `cause`. The default keeps that behaviour. */
const DEFAULT_ALLOWED_NAMES: readonly string[] = ["cause"];

function parameterAnnotation(parameter: Parameter): ESTree.TSTypeAnnotation | null | undefined {
  if (parameter.type === "TSParameterProperty") {
    return parameterAnnotation(parameter.parameter);
  }
  if (parameter.type === "RestElement") {
    return parameter.typeAnnotation ?? parameterAnnotation(parameter.argument);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameter.typeAnnotation ?? parameter.left.typeAnnotation;
  }
  return parameter.typeAnnotation;
}

function parameterName(parameter: Parameter, sourceText: string): string {
  if (parameter.type === "TSParameterProperty") {
    return parameterName(parameter.parameter, sourceText);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameterName(parameter.left, sourceText);
  }
  if (parameter.type === "RestElement") {
    return parameterName(parameter.argument, sourceText);
  }
  return parameter.type === "Identifier"
    ? parameter.name
    : sourceText.replace(/\s*:\s*unknown\s*$/u, "");
}

/** Read `allowedNames` from the first rule option. Fall back to the upstream default. */
function allowedNames(options: Readonly<Options> | undefined): ReadonlySet<string> {
  const option = options?.[0];
  const names =
    typeof option === "object" && option !== null && !Array.isArray(option)
      ? option.allowedNames
      : undefined;
  if (!Array.isArray(names)) return new Set(DEFAULT_ALLOWED_NAMES);
  return new Set(names.filter((name): name is string => typeof name === "string"));
}

/** Disallow unknown inputs except parameters with an allowed name, `cause` by default. */
export const noUnknownParametersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explicitly unknown function parameters except allowed names (`cause` by default); decode unknown input at its I/O boundary instead.",
    },
    messages: {
      unknownParameter:
        "Parameter `{{parameter}}` leaves input unparsed. Accept a named domain type; run the expected schema or parser at the I/O boundary before calling this function.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowedNames: { type: "array", items: { type: "string" }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowedNames: [...DEFAULT_ALLOWED_NAMES] }],
  },
  createOnce(context) {
    const checkParameters = (node: ParameterOwner) => {
      const allowed = allowedNames(context.options);
      for (const parameter of node.params) {
        const annotation = parameterAnnotation(parameter);
        if (annotation?.typeAnnotation.type !== "TSUnknownKeyword") continue;
        const name = parameterName(parameter, context.sourceCode.getText(parameter));
        if (allowed.has(name)) continue;
        context.report({
          node: annotation.typeAnnotation,
          messageId: "unknownParameter",
          data: { parameter: name },
        });
      }
    };

    return {
      ArrowFunctionExpression: checkParameters,
      FunctionDeclaration: checkParameters,
      FunctionExpression: checkParameters,
      TSCallSignatureDeclaration: checkParameters,
      TSConstructSignatureDeclaration: checkParameters,
      TSConstructorType: checkParameters,
      TSDeclareFunction: checkParameters,
      TSEmptyBodyFunctionExpression: checkParameters,
      TSFunctionType: checkParameters,
      TSMethodSignature: checkParameters,
    };
  },
});
