'use strict';

var mysql = require('mysql');

module.exports = function (config, options) {

    var logger = {
        log : function () {
            if (options && options.debug) {
                console.log.apply(console, arguments);
            }
        }
    };

    this.queries = 0;
    this.done_queries = 0;
    this.config = config;

    if (options && options.logger) {
        logger = options.logger;
    }

    this.connect = function () {
        var self = this;
        logger.log('connecting to', this.config);
        this.connection = mysql.createConnection(this.config);
        this.connection.connect(function (err) {
            if (err) {
                console.log(err);
            }
            else {
                logger.log('connected');
            }
        });

        this.connection.on('error', function (err) {
            console.log('error', err);
        });

        this.connection.on('close', function (err) {
            console.log('close', err);
            logger.log('reconnecting');
            self.connection = mysql.createConnection(self.config);
        });
        return this;
    };

    this.args = function () {
        logger.log('setting args', arguments);
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
                self.done_queries++;
                logger.log('done with query', self.done_queries);
                self.querying = false;
                logger.log('calling callback with', err, result);
                cb(err, result, _args);
                if (self.done_queries === self.queries && self.endit) {
                    logger.log('done === pending, ending');
                    self.end();
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
            logger.log('starting query', this.queries);
            this.connection.query.apply(this.connection, arguments);
        }
        else {
            throw new Error('Establish a connection first by using mysql.open()');
        }

        return this;
    };

    this.disconnect = function () {
        // logger.log('disconnect is called');
        // this.endit = true;
        // if (this.queries === this.done_queries && this.connection && this.connection.end) {
        //     this.connection.end();
        //     this.connection = null;
        //     this.endit = false;
        //     logger.log('disconnected');
        // }
    };

    this.end = this.disconnect;

    this.connect();
    return this;
};
