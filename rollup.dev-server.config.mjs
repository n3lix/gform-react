import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import packageJson from './package.json' assert { type: "json" };
import copy from 'rollup-plugin-copy';

const { build } = process.env;
const production = build === 'production';
const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const pluggins = [
    replace({
        'process.env.NODE_ENV': JSON.stringify(build),
        '__DEBUG__': 'false',
        '__DEV__': JSON.stringify(!production),
        preventAssignment: true
    }),
    nodeResolve({ extensions })
];

const external = Object.keys(packageJson.peerDependencies).concat(/@babel\/runtime/);

/** @type {import('rollup').RollupOptions} */
export default [
    {
        input: "src/index.ts",
        output: [
            {
                format: "cjs",
                sourcemap: true,
                dir: "dist/cjs",
                entryFileNames: `${packageJson.name}.${build}.js`,
                plugins: [
                    production && terser({
                        mangle: {
                            properties: {
                                regex: /^_/
                            }
                        }
                    })
                ]
            }
        ],
        plugins: pluggins.concat(commonjs(), babel({
            extensions,
            exclude: 'node_modules/**',
            babelHelpers: 'runtime',
            plugins: ['@babel/plugin-transform-runtime'],
            presets: [
                [
                    "@babel/preset-env", {
                        targets: {
                            node: '10.0'
                        }
                    }
                ]
            ]
        }), copy({
            targets: [
                { 
                    src: 'src/cjs/index.cjs.js', 
                    dest: 'dist/cjs', 
                    rename: 'index.js' 
                }
            ]
        })),
        external
    },
    {
        input: production
            ?
            {
                "GForm": "src/GForm.tsx",
                "GInput": "src/fields/GInput.tsx",
                "GValidator": "src/validations/GValidator.ts"
            }
            :
            "src/index.ts",
        output: [
            {
                format: "es",
                sourcemap: true,
                dir: "dist/esm",
                entryFileNames: `[name].${build}.js`,
                chunkFileNames: `shared.${build}.js`,
                plugins: [
                    production && terser({
                        mangle: {
                            properties: {
                                regex: /^_/
                            }
                        }
                    })
                ]
            }
        ],
        plugins: pluggins.concat(commonjs(), babel({
            extensions,
            exclude: 'node_modules/**',
            babelHelpers: 'runtime',
            plugins: [
                [
                    '@babel/plugin-transform-runtime', {
                        useESModules: true,
                        version: "7.22.5" /** @see https://github.com/preconstruct/preconstruct/issues/297 @see https://github.com/preconstruct/preconstruct/issues/318 */
                    }
                ]
            ],
            presets: [
                [
                    "@babel/preset-env", {
                        targets: {
                            esmodules: true
                        },
                        modules: false,
                        bugfixes: true
                    }
                ]
            ]
        }), production && copy({
            targets: [
                {
                    src: 'src/index.ts',
                    dest: 'dist/esm',
                    rename: 'index.js',
                    transform: (content) => {
                        const c = content.toString().split('\n').map(line => {
                            const name = /(?: \{ )(.+)(?: \} )/.exec(line).pop();
                            return line.replace(line.substring(line.indexOf('from')), `from './${name}.${build}';`);
                        });
                        return c.join('\n');
                    }
                },
                {
                    src: 'example/index.d.ts',
                    dest: 'dist',
                }
            ]
        })),
        external
    }
];