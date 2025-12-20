module.exports = {
    testEnvironment: "jsdom",
    transform: {
        "^.+\\.(t|j)sx?$": "babel-jest"
    },
    moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"]
};