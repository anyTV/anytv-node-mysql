'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Transaction = function () {
    function Transaction(mysql) {
        _classCallCheck(this, Transaction);

        if (mysql[mysql._key].is_pool) {
            this.is_pool = true;
        }

        this.connection = mysql.current_connection;
        this.mysql = mysql;
        this.queries = [];
        this.errors = [];
        this.retries = 0;
    }

    _createClass(Transaction, [{
        key: 'query',
        value: function query() {
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
    }, {
        key: 'squel',
        value: function squel(query, callback) {

            if (typeof query.toParam !== 'function') {
                throw new Error('toParam is not a function');
            }

            query = query.toParam();

            return this.query(query.text, query.values, callback);
        }
    }, {
        key: 'run_queries',
        value: function run_queries(err) {
            var _this = this;

            var current_query = this.queries.shift();
            var last_query = current_query && current_query[0];

            var connection = this.is_pool ? this.temp_conn : this.connection;

            if (typeof current_query === 'undefined') {
                return connection.commit(function (err) {
                    _this.release();
                    _this.final_callback(err, null, _this.mysql._args, last_query);
                });
            }

            function custom_cb(err, result) {
                var _this2 = this;

                // if retryable, re-try
                this.current_cb(err, result, this.mysql._args, last_query);

                if (err) {

                    return connection.rollback(function () {
                        _this2.release();
                        _this2.final_callback(err, result, _this2.mysql._args, last_query);
                    });
                }

                // neext
                this.run_queries();
            }

            if (err) {
                this.release();
                return this.final_callback({ message: 'Error in creating transaction' });
            }

            this.current_cb = current_query.pop();

            current_query.push(custom_cb.bind(this));

            connection.query.apply(connection, current_query);
        }
    }, {
        key: 'release',
        value: function release() {
            if (this.temp_conn) {
                this.temp_conn.release();
            }
        }
    }, {
        key: 'commit',
        value: function commit(cb) {
            var _this3 = this;

            this.final_callback = cb;

            if (this.is_pool) {
                this.connection.getConnection(function (err, conn) {
                    if (err) {
                        return _this3.final_callback({ message: 'Error in getting a connection from a pool' });
                    }

                    _this3.temp_conn = conn;
                    _this3.temp_conn.beginTransaction(_this3.run_queries.bind(_this3));
                });
            } else {
                this.connection.beginTransaction(this.run_queries.bind(this));
            }

            return this.mysql;
        }
    }]);

    return Transaction;
}();

exports.default = Transaction;