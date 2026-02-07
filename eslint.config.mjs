import tsParser from "@typescript-eslint/parser";
import jsdoc from "eslint-plugin-jsdoc";

const EXPORTED_FUNCTION_CONTEXT = ["ExportNamedDeclaration > FunctionDeclaration"];

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ["src/engine/**/*.ts", "src/vtg/**/*.ts", "src/state/**/*.ts"],
    ignores: ["**/*.d.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module"
    },
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
  }
];
