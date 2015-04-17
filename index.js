'use strict';

var mysql = require('mysql'),
    config;

module.exports = {
    open : function (_config) {
        var self = this;

        config = _config;

        this.connection = mysql.createConnection(config);

        this.connection.on('error', function (err) {
            console.log('error', err);
        });

        this.connection.on('close', function (err) {
            console.log('close', err);
            self.connection = mysql.createConnection(self.config);
            if (self.pending) {
                console.log('re querying');
                self.query.apply(self, self.pending);
            }
        });

        return this;
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
            cb,
            closure = function (err, result) {
                self.pending = null;
                cb(err, result, _args);
            };

        this.pending = arguments;

        while (len--) {
            if (typeof arguments[len] === 'function') {
                cb = arguments[len];
                arguments[len] = closure;
                break;
            }
        }

        if (this.connection) {
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
        this.connection.end();
        return this;
    }
};
