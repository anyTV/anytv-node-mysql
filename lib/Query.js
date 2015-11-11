'use strict';

const mysql = require('mysql');

class Query {

    constructor (mysql) {
        const args = Array.from(arguments);

        this.mysql = mysql;
        this.retries = 0;

        args.shift();

        this.query(...args);
    }

    query () {
        const _args = Array.from(arguments);
        const mysql_handler = this.mysql;
        const last_query = arguments[0];

        let len = arguments.length;
        let connection;
        let cb;

        function new_callback (err, result) {

            // if retryable, re-try
            if (err && mysql_handler.retryable_errors && ~mysql_handler.retryable_errors.indexOf(err.code)) {
                this.retries++;

                if (this.retries === mysql_handler._max_retry) {
                    return cb({message: 'Reached max retries'}, null, mysql_handler._args, last_query);
                }

                return this.query(..._args);
            }

            // call callback
            cb(err, result, mysql_handler._args, last_query);
        }

        mysql_handler.pending = arguments;

        while (len--) {
            if (typeof arguments[len] === 'function') {
                // get callback
                cb = arguments[len];

                // replace callback
                arguments[len] = new_callback.bind(this);
                break;
            }
        }

        connection = mysql_handler._key && mysql_handler[mysql_handler._key].connection;

        if (!connection && !mysql_handler.is_pool) {
            connection = mysql.createConnection(mysql_handler[mysql_handler._key].config);
            mysql_handler[mysql_handler._key].connection = connection;
            mysql_handler[mysql_handler._key].connection.connect(err => {
                if (err) {
                    this._logger.log('error in creating connection', err);
                }
            });
        }

        connection.query.apply(connection, arguments);

    }
}

module.exports = Query;
