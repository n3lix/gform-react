'use strict';

if (process.env.NODE_ENV === 'production') {
    module.exports = require('./gform-react-native.production.js');
} else {
    module.exports = require('./gform-react-native.development.js');
}