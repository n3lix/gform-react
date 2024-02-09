'use strict';

if (process.env.NODE_ENV === 'production') {
    module.exports = require('./gform-react.production.js');
} else {
    module.exports = require('./gform-react.development.js');
}