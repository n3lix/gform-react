
import html from '@rollup/plugin-html';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import {liveServer} from 'rollup-plugin-live-server';

const { build, mode = '' } = process.env;
const production = build === 'production';
const debug = mode.includes('debug');
const strict = mode.includes('strict');
const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const esm = {
    input: 'example/index.tsx',
    output: [
        {
            format: "es",
            sourcemap: true,
            dir: "dist"
        }
    ],
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(build),
            '__DEBUG__': JSON.stringify(debug),
            '__DEV__': JSON.stringify(!production),
            '__STRICT__': JSON.stringify(strict),
            preventAssignment: true
        }),
        nodeResolve({ extensions }),
        commonjs(),
        babel({
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
        }),
        html({
            meta: [{
                charset: 'utf-8'
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1'
            }],
            template: ({ title, files, meta }) => `
<!DOCTYPE html>
<html>
    <head>
        <title>${title}</title>
        ${meta.map(m => `<meta ${Object.keys(m).map(k => `${k}="${m[k]}"`).join(' ')}/>`).join('\n\t\t\t\t')}
        ${files.js.map(file => `<script src='${file.fileName}' type='module'></script>`).join('\n\t\t\t\t')}
    </head>
    <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
    </body>
</html>`
        }),
        liveServer({
            port: 8001,
            host: "localhost",
            root: "dist",
            file: "index.html",
            mount: [['/dist', './dist'], ['/src', './src'], ['/node_modules', './node_modules']],
            open: true,
            wait: 500
        })
    ]
};

export default esm;