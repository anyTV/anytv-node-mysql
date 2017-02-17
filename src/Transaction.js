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


    squel (query, callback) {

        if (typeof query.toParam !== 'function') {
            throw new Error('toParam is not a function');
        }

        query = query.toParam();

        return this.query(query.text, query.values, callback);
    }


    run_queries (err) {

        const current_query = this.queries.shift();
        const last_query = current_query && current_query[0];

        const connection = this.is_pool
            ? this.temp_conn
            : this.connection;

        if (typeof current_query === 'undefined') {
            return connection.commit((err) => {
                this.release();
                this.final_callback(err, null, this.mysql._args, last_query);
            });
        }

        function custom_cb (err, result) {
            // if retryable, re-try
            this.current_cb(err, result, this.mysql._args, last_query);


            if (err) {

                return connection.rollback(() => {
                    this.release();
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

        connection.query.apply(connection, current_query);
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
                this.temp_conn.beginTransaction(this.run_queries.bind(this));
            });
        }
        else {
            this.connection.beginTransaction(this.run_queries.bind(this));
        }

        return this.mysql;
    }
}
