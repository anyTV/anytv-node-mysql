'use strict';

export default class Transaction {

    constructor (mysql) {

        if (mysql[mysql._key].is_pool) {
            this.is_pool = true;
        }

        this.connection = mysql.current_connection;
        this.mysql = mysql;
        this.queries = [];
        this.errors = [];
        this.retries = 0;
    }

    query () {
        if (arguments.length < 2) {
            throw new Error('Incomplete arguments. Have at least a query and a callback');
        }

        if (typeof arguments[0] !== 'string') {
            throw new Error('Query is not a string');
        }

        if (typeof arguments[arguments.length - 1] !== 'function') {
            throw new Error('Last parameter is not a function');
        }

        this.queries.push(Array.from(arguments));
        return this;
    }

    run_queries (err) {
        const current_query = this.queries.shift();
        const last_query = current_query && current_query[0];

        if (typeof current_query === 'undefined') {
            this.release();
            return (this.conn
                ? this.conn
                : this.connection).commit((err) => {
                this.final_callback(err, null, this.connection);
            });
        }

        function custom_cb (err, result) {
            // if retryable, re-try
            this.current_cb(err, result, this.mysql._args, last_query);


            if (err) {
                this.release();
                return this.connection.rollback(() => {
                    this.final_callback(err, result, this.mysql._args, last_query);
                });
            }

            // neext
            this.run_queries();
        }

        if (err) {
            this.release();
            return this.final_callback({message: 'Error in creating transaction'});
        }

        this.current_cb = current_query.pop();

        current_query.push(custom_cb.bind(this))

        this.connection.query.apply(this.connection, current_query);
    }

    release () {
        if (this.temp_conn) {
            this.temp_conn.release();
        }
    }

    commit (cb) {
        this.final_callback = cb;

        if (this.is_pool) {
            this.connection.getConnection((err, conn) => {
                if (err) {
                    return this.final_callback({message: 'Error in getting a connection from a pool'});
                }

                this.temp_conn = conn;
                conn.beginTransaction(this.run_queries.bind(this));
            });
        }
        else {
            this.connection.beginTransaction(this.run_queries.bind(this));
        }

        return this.mysql;
    }
}
