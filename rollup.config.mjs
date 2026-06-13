import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import dts from 'rollup-plugin-dts';

import packageJson from './package.json' with { type: "json" };

const build = process.env.build;
const isProd = build === 'production';
const extensions = ['.js', '.jsx', '.ts', '.tsx'];
const env = isProd ? 'production' : 'development';

const esmEntries = {
    GForm: "src/GForm.tsx",
    GInput: "src/fields/GInput.tsx",
    GValidator: "src/validations/index.ts",
    useFormSelector: "src/form-context.tsx"
};

const rnESMEntries = {
    RNGForm: "src/RNGForm.tsx",
    RNGInput: "src/fields/RNGInput.tsx"
};

const basePlugins = [
    replace({
        'process.env.NODE_ENV': JSON.stringify(env),
        '__DEV__': JSON.stringify(!isProd),
        '__DEBUG__': 'false',
        preventAssignment: true,
    }),
    nodeResolve({ extensions }),
    commonjs()
];

const external = [
    ...Object.keys(packageJson.peerDependencies),
    'react-native'
];

function babelConfig(es = false) {
    return babel({
        extensions,
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
        babelrc: false,
        configFile: false,
        babelrcRoots: false,
        comments: false,
        presets: [
            [
                "@babel/preset-env",
                {
                    // NOTE: don't use `esmodules: true` for the ESM build — it means "any
                    // browser that can load ES modules" (Safari 10.1, Edge 16, 2017-era),
                    // which downlevels object spread/rest into babel helpers and bloats the
                    // bundle ~30% vs the CJS build. The ES2020 floor below matches what the
                    // CJS build (node 14) has always shipped (`?.`/`??` kept native), so both
                    // builds support the same browsers; anything newer than ES2020 that lands
                    // in src gets downleveled instead of silently raising the floor.
                    targets: es
                        ? { chrome: '80', edge: '80', firefox: '74', safari: '13.1' }
                        : { node: '14' },
                    modules: false,
                    bugfixes: true
                }
            ],
            "@babel/preset-typescript",
            // useBuiltIns: JSX spread compiles to Object.assign (native on all targets)
            // instead of the @babel/runtime `_extends` helper.
            ["@babel/preset-react", { useBuiltIns: true }]
        ],
        sourceType: "module"
    });
}

function createCjsEntryPlugin() {
    return {
        name: 'generate-cjs-entry',
        generateBundle() {
            const code = `
'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./gform-react.production.js');
} else {
  module.exports = require('./gform-react.development.js');
}
`;
            this.emitFile({
                type: 'asset',
                fileName: 'index.js',
                source: code
            });
        }
    };
}

const cjs = {
    input: "src/index.ts",
    output: {
        dir: "dist/cjs",
        format: "cjs",
        sourcemap: true,
        entryFileNames: `gform-react.${env}.js`,
    },
    plugins: [
        ...basePlugins,
        babelConfig(false),
        isProd && terser(),
        createCjsEntryPlugin()
    ],
    external
};

const esm = {
    input: esmEntries,
    output: {
        dir: "dist/esm",
        entryFileNames: `[name].${env}.js`,
        chunkFileNames: `shared.${env}.js`,
        format: "es",
        sourcemap: true
    },
    plugins: [
        ...basePlugins,
        babelConfig(true),
        isProd && terser(),
        copy({
            targets: [
                {
                    src: 'src/index.ts',
                    dest: 'dist/esm',
                    // use `env` (from process.env.build) — process.env.BUILD only works on
                    // Windows, where environment variables are case-insensitive
                    rename: isProd ? 'index.js' : `index.${env}.js`,
                    transform: () => Object.keys(esmEntries).map(name => `export { ${name} } from './${name}.${env}.js';`).join('\n')
                }
            ]
        })
    ],
    external
};

const nativeCJS = {
    input: "src/rn/index.ts",
    output: {
        dir: "native/dist/cjs",
        format: "cjs",
        sourcemap: true,
        entryFileNames: `gform-react.${env}.js`,
    },
    plugins: [
        ...basePlugins,
        babelConfig(false),
        isProd && terser(),
        createCjsEntryPlugin()
    ],
    external
};

const nativeESM = {
    input: rnESMEntries,
    output: {
        dir: "native/dist/esm",
        entryFileNames: `[name].${env}.js`,
        chunkFileNames: `shared.${env}.js`,
        format: "es",
        sourcemap: true
    },
    plugins: [
        ...basePlugins,
        babelConfig(true),
        isProd && terser(),
        copy({
            targets: [
                {
                    src: 'src/rn/index.ts',
                    dest: 'native/dist/esm',
                    rename: isProd ? 'index.js' : `index.${env}.js`,
                    transform: () => Object.keys(rnESMEntries).map(name => `export { ${name} } from './${name}.${env}.js';`).join('\n')
                }
            ]
        })
    ],
    external
};

const types = {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.d.ts',
        format: "es"
    },
    plugins: [dts()],
    external
};

const typesRN = {
    input: 'src/rn/index.ts',
    output: {
        file: `native/dist/index.d.ts`,
        format: "es"
    },
    plugins: [dts()],
    external
};

export default [cjs, esm, nativeCJS, nativeESM, types, typesRN];