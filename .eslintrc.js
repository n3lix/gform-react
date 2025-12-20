/** @type {import('eslint').Linter.Config} */
const config = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": ["@typescript-eslint"],
    "rules": {
        "indent": ['error', 4, {"SwitchCase": 1}],
        "semi": ["error", "always"],
        "@typescript-eslint/no-explicit-any": "off",
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/no-unnecessary-type-constraint': 'off',
        "@typescript-eslint/no-this-alias": [
            "error",
            {
                "allowDestructuring": true,
                "allowedNames": [
                    "self"
                ]
            }
        ],
        "@typescript-eslint/no-empty-function": [
            "error",
            {
                "allow": ["methods"]
            }
        ]
    },
    overrides: [
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
                indent: "off"
            }

        }
    ]
};

module.exports = config;