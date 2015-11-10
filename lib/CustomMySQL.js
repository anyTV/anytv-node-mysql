'use strict';

const Transaction = require('./Transaction');
const Query       = require('./Query');
const mysql       = require('mysql');

class CustomMySQL {

    constructor () {
        this.escape = mysql.escape;
        this.max_retry = 3;
        this._logger = console;
    }

    set max_retry (max) {
        this._max_retry = max;
        return this;
    }

    set logger (logger) {
        this._logger = logger;
        return this;
    }

    args () {
        if (!this._key) {
            throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
        }

        this._args = arguments;
        return this;
    }

    add (key, config, is_pool) {
        this[key] = {config};

        if (is_pool) {
            this._logger.info('Added a pool connection for', key);
            this[key].is_pool = true;
            this[key].connection = mysql.createPool(config);
            this[key].connection.on('close', err => this._logger.log('pool connection closed', err));
        }

        return this;
    }

    use (key) {
        if (!this[key]) {
            throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
        }

        this._key = key;
        this.retries = 0;
        this.retryable_errors = null;

        if (!this[key].connection) {
            this[key].connection = mysql.createConnection(this[key].config);
            this[key].connection.connect(err => {
                if (err) {
                    this._logger.log('error in creating connection', err);
                }
            });
        }

        return this;
    }

    query () {
        new Query(this, ...arguments);
        return this;
    }

    end () {
        if (this._key && !this[this._key].is_pool && this[this._key].connection) {
            this[this._key].connection.end();
            delete this[this._key].connection;
        }
        else if (!this._key || (this._key && !this[this._key].connection)) {
            throw new Error('Add a connection first by using mysql.add(key, config)');
        }

        return this;
    }

    retry_if (retryable_errors) {
        this.retryable_errors = retryable_errors;
        return this;
    }


    transaction () {
        this.is_transaction = true;
        return new Transaction(this);
    }


    /* Everything below will be depreciated */

    open (config) {
        let self = this,
            config_str = '',
            i;


        for (i in config) {
            config_str += config[i];
        }


        this._key = config_str;

        if (this[config_str] && this[config_str].connection) {
            return this;
        }

        this[config_str] = {
            config,
            is_pool: true,
            connection: mysql.createPool(config)
        };

        this[config_str].connection.on('error', function (err) {
            console.log('error', err);
        });

        this[config_str].connection.on('close', function (err) {
            console.log('close', err);
            self[config_str].connection = mysql.createPool(self[config_str].config);
        });

        this.escapeId = this[config_str].connection.escapeId.bind(this[config_str].connection);

        return this;
    }

    async (query, args, async_args, collector, fn) {
        let results = [];
        let len = args.length;

        function _collector (err, result, _args) {
            let temp = {
                err: err,
                result: result,
                args: _args
            };

            results.push(
                collector
                ? collector(err, result, _args)
               : temp
            );

            if (!--len) {
                fn(async_args || results);
            }
        }

        if (arguments.length === 4) {
            fn = collector;
            collector = async_args;
            async_args = null;
        }

        if (arguments.length === 3) {
            fn = async_args;
            async_args = null;
        }

        args.forEach((arg, index) => {
            this.args(async_args && async_args.hasOwnProperty(index)
                    ? async_args[index]
                   : arg
                )
                .query(query, arg, _collector);
        });

        return this;
    }

    on (_event, cb) {
        if (!this._key) {
            throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
        }

        return this[this._key].connection.on(_event, cb);
    }
}

module.exports = new CustomMySQL();
