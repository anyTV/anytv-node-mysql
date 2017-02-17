'use strict';

import Transaction from './Transaction';
import Connection from './Connection';
import Query from './Query';
import mysql from 'mysql';

/**
 * This is my class description
 */
export default class CustomMySQL {

    constructor () {
        this.escape = mysql.escape;
        this._logger = console;
        this._max_retry = 3;
    }


    set_logger (logger) {
        this._logger = logger || console;
        return this;
    }

    set_max_retry (max) {
        this._max_retry = max || 3;
        return this;
    }


    add (key, config, is_pool) {
        if (!key || !config) {
            throw new Error('key or config is missing');
        }

        if (typeof key !== 'string') {
            throw new Error('key should be a string');
        }

        this._key = key;
        this[key] = {config};
        this[key].is_pool = !!is_pool;

        if (is_pool) {
            new Connection(this);
        }

        return this;
    }

    retry_if (retryable_errors) {
        this.retryable_errors = retryable_errors;
        return this;
    }

    use (key) {
        if (!key) {
            throw new Error('key is missing');
        }

        if (!this[key]) {
            throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
        }

        this.retryable_errors = null;

        if (this._key === key) {
            return this;
        }

        this._key = key;

        if (this.current_connection) {
            this.end();
        }

        return this;
    }

    args () {
        if (!this._key) {
            throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
        }

        this._args = arguments;
        return this;
    }

    query () {
        if (!this._key) {
            throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
        }

        if (arguments.length < 2) {
            throw new Error('Incomplete arguments. Have at least a query and a callback');
        }

        if (typeof arguments[arguments.length - 1] !== 'function') {
            throw new Error('Last parameter is not a function');
        }

        new Query(this, ...arguments);
        return this;
    }

    squel (query, callback) {

        if (typeof query.toParam !== 'function') {
            throw new Error('toParam is not a function');
        }

        query = query.toParam();

        return this.query(query.text, query.values, callback);
    }

    build () {
        this._cache = Array.from(arguments);
        return this;
    }

    promise () {

        return new Promise((resolve, reject) => {

            this._cache.push(function (err, result, args, last_query) {

                if (err) {
                    return reject(err);
                }

                resolve(result);
            });

            this.query.apply(this, this._cache);
            this.end();
        });
    }

    transaction () {
        if (!this.current_connection) {
            new Connection(this);
        }

        return new Transaction(this);
    }

    end () {
        if (this._key && !this[this._key].is_pool && this[this._key].connection) {
            this[this._key].connection.end();
            this[this._key].connection = null;
        }

        this.current_connection = null;

        return this;
    }

    end_pool () {
        if (this._key && this[this._key].connection) {
            this[this._key].connection.end((err) => {
                if (err) {
                    return this._logger.error(`Closing pool ${this._key} error: \n`, err);
                }

                this._logger.info(`Pool ${this._key} closed`);
            });

            this.current_connection = null;
            this[this._key].connection = null;
        }

        return this;
    }

    /* Everything below will be deprecated */

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
