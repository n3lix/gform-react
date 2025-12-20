module.exports = {
    presets: [
        [
            "@babel/preset-env",
            {
                targets: { node: 'current' }
            }
        ],
        [
            "@babel/preset-typescript",
            {
                "onlyRemoveTypeImports": true
            }
        ],
        "@babel/preset-react"
    ],
    comments: false,
    exclude: /node_modules/,
    sourceType: "unambiguous",
};