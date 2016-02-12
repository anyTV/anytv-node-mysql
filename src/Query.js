'use strict';

import Connection from './Connection';
import mysql from 'mysql';

export default class Query {

    constructor (mysql) {
        const args = Array.from(arguments);

        this.previous_errors = [];
        this.mysql = mysql;
        this.retries = 0;

        args.shift();

        this.query(...args);
    }

    query () {
        const _args = Array.from(arguments);
        const mysql_handler = this.mysql;
        const last_query = arguments[0];
        const current_args = mysql_handler._args;

        let len = arguments.length;
        let connection;
        let cb;

        function new_callback (err, result) {

            // if retryable, re-try
            if (err && mysql_handler.retryable_errors && ~mysql_handler.retryable_errors.indexOf(err.code)) {
                this.retries++;

                this.previous_errors.push(JSON.parse(JSON.stringify(err)));

                if (this.retries === mysql_handler._max_retry) {

                    return cb(
                        {
                            message: 'Reached max retries',
                            code: 'ER_MAX_RETRIES',
                            max_tries: mysql_handler._max_retry,
                            previous_errors: this.previous_errors
                        },
                        null,
                        current_args,
                        last_query
                    );
                }

                return this.query(..._args);
            }

            // call callback
            cb(err, result, current_args, last_query);
        }

        while (len--) {
            if (typeof arguments[len] === 'function') {
                // get callback
                cb = arguments[len];

                // replace callback
                arguments[len] = new_callback.bind(this);
                break;
            }
        }


        if (!mysql_handler.current_connection) {
            if (this.mysql[this.mysql._key].connection) {
                this.mysql.current_connection = this.mysql[this.mysql._key].connection;
            }
            else {
                new Connection(mysql_handler);
            }
        }

        mysql_handler
            .current_connection
            .query
            .apply(mysql_handler.current_connection, arguments);
    }
}
