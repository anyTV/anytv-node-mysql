'use strict';

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
        const last_query = arguments[0];

        let len = arguments.length;
        let connection;
        let cb;

        function new_callback (err, result) {

            // if retryable, re-try
            if (err && this.mysql.retryable_errors && ~this.mysql.retryable_errors.indexOf(err.code)) {
                this.retries++;

                if (this.retries === this.mysql._max_retry) {
                    return cb({message: 'Reached max retries'}, null, this.mysql._args, last_query);
                }

                return this.query(..._args);
            }

            // call callback
            cb(err, result, this.mysql._args, last_query);
        }

        this.mysql.pending = arguments;

        while (len--) {
            if (typeof arguments[len] === 'function') {
                // get callback
                cb = arguments[len];

                // replace callback
                arguments[len] = new_callback.bind(this);
                break;
            }
        }

        connection = this.mysql._key && this.mysql[this.mysql._key].connection;

        if (!connection) {
            throw new Error('Add a connection first by using mysql.add(key, config) or start a connection using mysql.use(key)');
        }

        connection.query.apply(connection, arguments);

    }
}

module.exports = Query;
