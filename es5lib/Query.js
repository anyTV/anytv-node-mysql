'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var mysql = require('mysql');

var Query = (function () {
    function Query(mysql) {
        _classCallCheck(this, Query);

        var args = Array.from(arguments);

        this.mysql = mysql;
        this.retries = 0;

        args.shift();

        this.query.apply(this, _toConsumableArray(args));
    }

    _createClass(Query, [{
        key: 'query',
        value: function query() {
            var _this = this;

            var _args = Array.from(arguments);
            var mysql_handler = this.mysql;
            var last_query = arguments[0];

            var len = arguments.length;
            var connection = undefined;
            var cb = undefined;

            function new_callback(err, result) {

                // if retryable, re-try
                if (err && mysql_handler.retryable_errors && ~mysql_handler.retryable_errors.indexOf(err.code)) {
                    this.retries++;

                    if (this.retries === mysql_handler._max_retry) {
                        return cb({ message: 'Reached max retries' }, null, mysql_handler._args, last_query);
                    }

                    return this.query.apply(this, _toConsumableArray(_args));
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
                mysql_handler[mysql_handler._key].connection.connect(function (err) {
                    if (err) {
                        _this._logger.log('error in creating connection', err);
                    }
                });
            }

            connection.query.apply(connection, arguments);
        }
    }]);

    return Query;
})();

module.exports = Query;