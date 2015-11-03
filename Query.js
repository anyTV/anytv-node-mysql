'use strict';

class Query {

    constructor (mysql) {
        this.retries = 0;
        this.mysql = mysql;

        let args = Array.from(arguments);

        args.shift();

        this.query(...args);
    }

    query () {
        let last_query = arguments[0];
        let len = arguments.length;
        let _args = Array.from(arguments);
         let connection;
        let cb;

        this.mysql.pending = arguments;

        while (len--) {
            if (typeof arguments[len] === 'function') {
                cb = arguments[len];
                arguments[len] = (err, result) => {

                    if (err && this.mysql.retryable_errors && ~this.mysql.retryable_errors.indexOf(err.code)) {
                        this.retries++;

                        if (this.retries === this.mysql._max_retry) {
                            return cb({message: 'Reached max retries'}, null, this.mysql._args, last_query);
                        }

                        return this.query(..._args);
                    }

                    cb(err, result, this.mysql._args, last_query);
                };
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
