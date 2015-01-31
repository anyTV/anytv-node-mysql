'use strict';

var mysql = require('mysql');

module.exports = function (config) {

    this.queries = 0;
    this.done_queries = 0;
    this.config = config;

    this.connect = function () {
        this.disconnect();
        this.connection = mysql.createConnection(this.config);
        this.connection.connect(function (err) {
            if (err) {
                console.log(err);
            }
        });
        return this;
    };

    this.args = function () {
        this._args = arguments;
        return this;
    };

    this.async = function (query, args, async_args, collector, fn) {
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
                    self.end();
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
    };

    this.query = function () {
        var len = arguments.length,
            _args = this._args,
            self = this,
            cb,
            closure = function (err, result) {
                self.querying = false;
                cb(err, result, _args);
                self.done_queries++;
                if (self.done_queries === self.queries) {
                    if (self.endit) {
                        self.end();
                    }
                }
            };

        this.queries++;

        while (len--) {
            if (typeof arguments[len] === 'function') {
                cb = arguments[len];
                arguments[len] = closure;
                break;
            }
        }

        if (this.connection) {
            this.querying = true;
            this.connection.query.apply(this.connection, arguments);
        }
        else {
            throw new Error('Establish a connection first by using mysql.open()');
        }

        return this;
    };

    this.disconnect = function () {
        this.endit = true;
        if (this.queries === this.done_queries && this.connection && this.connection.end) {
            this.connection.end();
            this.connection = null;
            this.endit = false;
        }
    };

    this.end = this.disconnect;

    this.connect();
    return this;
};
