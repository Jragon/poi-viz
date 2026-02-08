import tsParser from "@typescript-eslint/parser";
import jsdoc from "eslint-plugin-jsdoc";

const EXPORTED_FUNCTION_CONTEXT = ["ExportNamedDeclaration > FunctionDeclaration"];
const TYPESCRIPT_FILES = ["src/**/*.ts"];
const JSDOC_FILES = ["src/engine/**/*.ts", "src/vtg/**/*.ts", "src/state/**/*.ts"];

const TYPESCRIPT_LANGUAGE_OPTIONS = {
  parser: tsParser,
  ecmaVersion: "latest",
  sourceType: "module"
};

/**
 * Creates import-boundary restrictions for a layer.
 *
 * @param {string[]} disallowedPatterns Layer-import patterns that must be blocked.
 * @param {string} message Rule message shown on violations.
 * @returns {import("eslint").Linter.RuleEntry}
 */
function restrictedImportsRule(disallowedPatterns, message) {
  return [
    "error",
    {
      patterns: disallowedPatterns.map((pattern) => ({ group: [pattern], message }))
    }
  ];
}

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: TYPESCRIPT_FILES,
    ignores: ["**/*.d.ts"],
    languageOptions: TYPESCRIPT_LANGUAGE_OPTIONS
  },
  {
    files: JSDOC_FILES,
    languageOptions: TYPESCRIPT_LANGUAGE_OPTIONS,
    plugins: {
      jsdoc
    },
    settings: {
      jsdoc: {
        mode: "typescript"
      }
    },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: false,
            MethodDefinition: false,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false
          },
          contexts: EXPORTED_FUNCTION_CONTEXT
        }
      ],
      "jsdoc/require-description": ["error", { contexts: EXPORTED_FUNCTION_CONTEXT }],
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-param-names": "error",
      "jsdoc/check-property-names": "error",
      "jsdoc/require-param": ["error", { contexts: EXPORTED_FUNCTION_CONTEXT }],
      "jsdoc/require-param-description": ["error", { contexts: EXPORTED_FUNCTION_CONTEXT }],
      "jsdoc/require-returns": ["error", { contexts: EXPORTED_FUNCTION_CONTEXT }],
      "jsdoc/require-returns-description": ["error", { contexts: EXPORTED_FUNCTION_CONTEXT }]
    }
  },
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictedImportsRule(
        ["@/components/**", "@/composables/**", "@/render/**"],
        "Engine modules must remain UI/render independent."
      )
    }
  },
  {
    files: ["src/vtg/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictedImportsRule(
        ["@/components/**", "@/composables/**", "@/render/**"],
        "VTG modules must remain domain-only and UI/render independent."
      )
    }
  },
  {
    files: ["src/state/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictedImportsRule(
        ["@/components/**", "@/composables/**", "@/render/**", "@/vtg/**"],
        "State modules must not depend on UI/render/VTG layers."
      )
    }
  },
  {
    files: ["src/render/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictedImportsRule(
        ["@/components/**", "@/composables/**"],
        "Render modules must not depend on UI/composable layers."
      )
    }
  },
  {
    files: ["src/composables/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictedImportsRule(
        ["@/components/**", "@/render/**"],
        "Composable modules must not import component/render layers."
      )
    }
  }
];
