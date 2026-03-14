const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");
const js = require("@eslint/js");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module"
            },
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                ...globals.jest,
                React: "readonly",
                __DEV__: "readonly",
                __DEBUG__: "readonly"
            }
        },
        plugins: {
            "@typescript-eslint": tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "indent": ["error", 4, { "SwitchCase": 1 }],
            "semi": ["error", "always"],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-var-requires": 0,
            "@typescript-eslint/no-unnecessary-type-constraint": "off",
            "@typescript-eslint/no-this-alias": [
                "error",
                {
                    "allowDestructuring": true,
                    "allowedNames": ["self"]
                }
            ],
            "@typescript-eslint/no-empty-function": [
                "error",
                {
                    "allow": ["methods"]
                }
            ]
        }
    },
    {
        files: [
            "*.config.js",
            ".eslintrc.js",
            "eslint-rules/*.js",
            "jest.setup.js"
        ],
        rules: {
            "@typescript-eslint/no-require-imports": "off"
        }
    },
    {
        files: ["example/**", "src/**/*.test.tsx"],
        rules: {
            "indent": "off"
        }
    }
];
