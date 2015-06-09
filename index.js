'use strict';

var mysql = require('mysql'),
    connections = {};

module.exports = {

    escape: mysql.escape,

    open : function (_config) {
        var self = this,
            config_str = '',
            i;

        this.config = _config;

        for (i in _config) {
            config_str += _config[i];
        }

        if (connections[config_str]) {
            this.connection = connections[config_str];
            return this;
        }

        this.connection = mysql.createPool(_config);

        this.connection.on('error', function (err) {
            console.log('error', err);
        });

        this.connection.on('close', function (err) {
            console.log('close', err);
            self.connection = mysql.createPool(self.config);
            if (self.pending) {
                console.log('re querying');
                self.query.apply(self, self.pending);
            }
        });

        this.escapeId = this.connection.escapeId.bind(this.connection);

        connections[config_str] = this.connection;

        return this;
    },

    graph: function (cb) {
        this.grapher = cb;
    },

    args : function () {
        this._args = arguments;
        return this;
    },

    async : function (query, args, async_args, collector, fn) {
        var self = this,
            results = [],
            len = args.length,

            _collector = function (err, result, _args) {
                var temp = {
                            err : err,
                            result : result,
                            args : _args
                        };

                results.push(
                    collector
                    ? collector(err, result, _args)
                    : temp
                );

                if (!--len) {
                    fn(async_args || results);
                }
            };

        if (arguments.length === 4) {
            fn = collector;
            collector = async_args;
            async_args = null;
        }

        if (arguments.length === 3) {
            fn = async_args;
            async_args = null;
        }

        args.forEach(function (arg, index) {
            self.args(async_args && async_args.hasOwnProperty(index)
                    ? async_args[index]
                    : arg
                )
                .query(query, arg, _collector);
        });

        return this;
    },

    query : function () {
        var len = arguments.length,
            _args = this._args,
            self = this,
            last_query,
            start,
            cb,

            closure = function (err, result) {
                self.pending = null;

                if (self.grapher) {
                    self.grapher(start, +new Date());
                }

                if (err) {
                    console.log('error on query:', last_query);
                }

                cb(err, result, _args);

            };

        this.pending = arguments;
        last_query = arguments[0];

        while (len--) {
            if (typeof arguments[len] === 'function') {
                cb = arguments[len];
                arguments[len] = closure;
                break;
            }
        }

        if (this.connection) {
            start = +new Date();
            this.connection.query.apply(this.connection, arguments);
        }
        else {
            throw new Error('Establish a connection first by using mysql.open()');
        }

        return this;
    },

    on : function (event, cb) {
        return this.connection.on(event, cb);
    },

    end : function () {
        // this.connection.end();
        return this;
    }
};
