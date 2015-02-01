'use strict';

var Csql = require(__dirname + '/class');

module.exports = {
    open : function (config, options) {
        return new Csql(config, options);
    }
};
