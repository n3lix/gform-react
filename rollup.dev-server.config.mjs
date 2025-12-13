import html from '@rollup/plugin-html';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { liveServer } from 'rollup-plugin-live-server';

const MODE = process.env.MODE || "development";
const DEBUG = process.env.DEBUG === "true";
const STRICT = process.env.STRICT === "true";

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

function startServer(options) {
    let started = false;
    return {
        name: "start-server-once",
        writeBundle() {
            if (!started) {
                started = true;
                console.log("Starting dev server...");
                liveServer(options);
            }
        }
    };
}

export default {
    input: 'example/index.tsx',

    output: {
        format: "es",
        sourcemap: true,
        dir: "dist"
    },

    plugins: [
        replace({
            preventAssignment: true,
            values: {
                "process.env.NODE_ENV": JSON.stringify(MODE),
                "__DEV__": JSON.stringify(MODE !== "production"),
                "__DEBUG__": JSON.stringify(DEBUG),
                "__STRICT__": JSON.stringify(STRICT)
            }
        }),
        nodeResolve({ extensions }),
        commonjs(),
        babel({
            extensions,
            exclude: 'node_modules/**',
            babelHelpers: 'runtime',
            plugins: [
                ['@babel/plugin-transform-runtime', {
                    useESModules: true,
                    version: "7.22.5"
                }]
            ],
            presets: [
                ['@babel/preset-env', {
                    targets: { esmodules: true },
                    bugfixes: true,
                    modules: false
                }]
            ]
        }),
        html({
            title: 'GForm Dev Server',
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
            ],
            template: ({ title, files, meta }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>${title}</title>
  ${meta.map(
        m =>
            `<meta ${Object.keys(m)
                .map(k => `${k}="${m[k]}"`)
                .join(" ")}>`
    ).join('\n  ')}
  ${files.js
        .map(file => `<script type="module" src="${file.fileName}"></script>`)
        .join('\n  ')}
</head>
<body>
  <div id="root"></div>
</body>
</html>
`
        }),
        startServer({
            port: 8001,
            host: "localhost",
            root: "dist",
            file: "index.html",
            open: true,
            wait: 150,
            mount: [
                ['/src', './src'],
                ['/example', './example'],
                ['/node_modules', './node_modules']
            ]
        })
    ]
};