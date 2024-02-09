# GForm

![gform-react](https://gform-react.onrender.com/gform-logo.png)

[![gzip size](http://img.badgesize.io/https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js?label=minified_size)](https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js)
[![gzip size](http://img.badgesize.io/https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js?compression=gzip)](https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js)
![npm peer dependency version](https://img.shields.io/npm/dependency-version/gform-react/peer/react)
![npm peer dependency version](https://img.shields.io/npm/dependency-version/gform-react/peer/react-dom)
[![NPM](https://img.shields.io/npm/l/gform-react)](https://unpkg.com/gform-react@latest/LICENSE.md)

#### build generic forms with validations for react-based applications.
it doesn't matter which UI library you're using,
it only cares about the form and the inputs inside.

## Pros
* Lightweight, no dependencies
* Based on native form and constraint validations (can also add custom and async validations)
* Can be used with any UI library that preserves native form controls (input, button, etc. can also be adjusted to non-native controls)
* Tree shakeable
* Accessiblity semi-automatic (required inputs and invalid inputs automatically sets aria-required and aria-invalid)
* React Native support

## Docs
https://gform-react.onrender.com

## Demo:
https://codesandbox.io/s/gracious-paper-5xhzqw

## Installation
npm:
```shell
npm install gform-react
```

yarn:
```shell
yarn add gform-react
```

#### NOTE:
react >=16.8.0, react-dom >=16.8.0 are peer dependecies