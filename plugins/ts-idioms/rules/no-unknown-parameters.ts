// Adapted from dmmulroy/anti-slop `src/rules/no-unknown-parameters.ts` and
// `src/shared/function-parameters.ts` at commit c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b
// (MIT, Copyright (c) 2026 Dillon Mulroy; see LICENSE).
// Local change: the `allowedNames` option replaces the hard-coded `cause` exemption.
import { defineRule } from "@oxlint/plugins";
import type { ESTree, Options, SourceCode } from "@oxlint/plugins";

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

/** Return whether a type is or contains TypeScript's absorbing unknown top type. */
function containsUnknownType(type: ESTree.TSType): boolean {
  if (type.type === "TSUnknownKeyword") return true;
  if (type.type === "TSParenthesizedType") return containsUnknownType(type.typeAnnotation);
  return type.type === "TSUnionType" && type.types.some(containsUnknownType);
}

/** Return the TypeScript annotation attached to a function parameter or its wrapped binding. */
function parameterAnnotation(parameter: Parameter): ESTree.TSTypeAnnotation | null | undefined {
  if (parameter.type === "TSParameterProperty") {
    return parameterAnnotation(parameter.parameter);
  }
  if (parameter.type === "RestElement") {
    return parameter.typeAnnotation ?? parameterAnnotation(parameter.argument);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameter.typeAnnotation ?? parameterAnnotation(parameter.left);
  }
  return parameter.typeAnnotation;
}

/** Return only a parameter's local binding, without its annotation or default value. */
function parameterName(parameter: Parameter, sourceCode: SourceCode): string {
  if (parameter.type === "TSParameterProperty") {
    return parameterName(parameter.parameter, sourceCode);
  }
  if (parameter.type === "AssignmentPattern") {
    return parameterName(parameter.left, sourceCode);
  }
  if (parameter.type === "RestElement") {
    return parameterName(parameter.argument, sourceCode);
  }
  if (parameter.type === "Identifier") return parameter.name;

  const sourceText = sourceCode.getText(parameter);
  const annotationStart = parameter.typeAnnotation?.start;
  return annotationStart === undefined
    ? sourceText
    : sourceText.slice(0, annotationStart - parameter.start).trimEnd();
}

/** Return whether the owner's return type is a predicate (`value is T`, `asserts value`) on this name. */
function isTypePredicateSubject(owner: ParameterOwner, name: string): boolean {
  const predicate = owner.returnType?.typeAnnotation;
  return (
    predicate?.type === "TSTypePredicate" &&
    predicate.parameterName.type === "Identifier" &&
    predicate.parameterName.name === name
  );
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

/** Disallow unknown inputs except type-predicate subjects and allowed names, `cause` by default. */
export const noUnknownParametersRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explicitly unknown function parameters except allowed names (`cause` by default) and type-predicate subjects; decode unknown input at its I/O boundary instead.",
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
        if (annotation === null || annotation === undefined) continue;
        if (!containsUnknownType(annotation.typeAnnotation)) continue;
        const name = parameterName(parameter, context.sourceCode);
        if (allowed.has(name) || isTypePredicateSubject(node, name)) continue;
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
