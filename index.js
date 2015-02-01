'use strict';

var Csql = require(__dirname + '/class'),
    connections = {};

module.exports = {
    open : function (config, options) {
        var cfg = this.hash(config);
        if (!connections[cfg]) {
            connections[cfg] = new Csql(config, options);
        }
        return connections[cfg];
    },

    hash : function (cfg) {
        var crypto = require('crypto');
        return crypto.createHash('sha1')
            .update(JSON.stringify(cfg))
            .digest('hex');
    }

};
