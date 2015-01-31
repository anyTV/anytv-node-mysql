'use strict';

var Csql = require(__dirname + '/class');

module.exports = {
    open : function (config) {
        return new Csql(config);
    }
};
