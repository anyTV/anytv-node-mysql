'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Connection = require('./Connection');

var _Connection2 = _interopRequireDefault(_Connection);

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Query = function () {
    function Query(mysql) {
        _classCallCheck(this, Query);

        var args = Array.from(arguments);

        this.previous_errors = [];
        this.mysql = mysql;
        this.retries = 0;

        args.shift();

        this.query.apply(this, _toConsumableArray(args));
    }

    _createClass(Query, [{
        key: 'query',
        value: function query() {
            var _args = Array.from(arguments);
            var mysql_handler = this.mysql;
            var last_query = arguments[0];
            var current_args = mysql_handler._args;

            var len = arguments.length;
            var connection = void 0;
            var cb = void 0;

            function new_callback(err, result) {

                // if retryable, re-try
                if (err && mysql_handler.retryable_errors && ~mysql_handler.retryable_errors.indexOf(err.code)) {
                    this.retries++;

                    this.previous_errors.push(JSON.parse(JSON.stringify(err)));

                    if (this.retries === mysql_handler._max_retry) {

                        return cb({
                            message: 'Reached max retries',
                            code: 'ER_MAX_RETRIES',
                            max_tries: mysql_handler._max_retry,
                            previous_errors: this.previous_errors
                        }, null, current_args, last_query);
                    }

                    return this.query.apply(this, _toConsumableArray(_args));
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
                } else {
                    new _Connection2.default(mysql_handler);
                }
            }

            mysql_handler.current_connection.query.apply(mysql_handler.current_connection, arguments);
        }
    }]);

    return Query;
}();

exports.default = Query;