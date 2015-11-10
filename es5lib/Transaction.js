'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Transaction = (function () {
    function Transaction(mysql) {
        _classCallCheck(this, Transaction);

        var args = Array.from(arguments);

        this.connection = mysql[mysql._key].connection;
        this.mysql = mysql;
        this.queries = [];
        this.errors = [];
        this.retries = 0;

        args.shift();
    }

    _createClass(Transaction, [{
        key: 'query',
        value: function query() {
            if (arguments.length < 2) {
                throw new Error('Too few arguments. Must at least have query and callback');
            }

            this.queries.push(Array.from(arguments));
            return this;
        }
    }, {
        key: 'run_queries',
        value: function run_queries(err) {
            var _this = this;

            var current_query = this.queries.shift();
            var last_query = current_query && current_query[0];

            if (typeof current_query === 'undefined') {
                return this.connection.commit(function (err) {
                    _this.final_callback(err, null, _this.connection);
                });
            }

            function custom_cb(err, result) {
                var _this2 = this;

                // if retryable, re-try
                if (err) {
                    this.connection.rollback(function () {
                        _this2.final_callback(err, result, _this2.mysql._args, last_query);
                    });

                    this.queries = [];
                }

                // neeext
                this.current_cb(err, result, this.mysql._args, last_query);
                this.run_queries();
            }

            if (err) {
                return this.final_callback({ message: 'Error in creating transaction' });
            }

            this.current_cb = current_query.pop();

            current_query.push(custom_cb.bind(this));

            this.connection.query.apply(this.connection, current_query);
        }
    }, {
        key: 'commit',
        value: function commit(cb) {
            this.final_callback = cb;
            this.connection.beginTransaction(this.run_queries.bind(this));
            return this.mysql;
        }
    }]);

    return Transaction;
})();

module.exports = Transaction;