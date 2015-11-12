'use strict';

export default class Transaction {

    constructor (mysql) {
        this.connection = mysql.current_connection;
        this.mysql = mysql;
        this.queries = [];
        this.errors = [];
        this.retries = 0;
    }

    query () {
        if (arguments.length < 2) {
            throw new Error('Too few arguments. Must at least have query and callback');
        }

        this.queries.push(Array.from(arguments));
        return this;
    }

    run_queries (err) {
        const current_query = this.queries.shift();
        const last_query = current_query && current_query[0];

        if (typeof current_query === 'undefined') {
            return this.connection.commit((err) => {
                this.final_callback(err, null, this.connection);
            });
        }

        function custom_cb (err, result) {
            // if retryable, re-try
            this.current_cb(err, result, this.mysql._args, last_query);


            if (err) {
                return this.connection.rollback(() => {
                    this.final_callback(err, result, this.mysql._args, last_query);
                });
            }

            // neext
            this.run_queries();
        }

        if (err) {
            return this.final_callback({message: 'Error in creating transaction'});
        }

        this.current_cb = current_query.pop();

        current_query.push(custom_cb.bind(this))

        this.connection.query.apply(this.connection, current_query);
    }

    commit (cb) {
        this.final_callback = cb;
        this.connection.beginTransaction(this.run_queries.bind(this));
        return this.mysql;
    }
}
