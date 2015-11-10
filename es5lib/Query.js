'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
            var _args = Array.from(arguments);
            var last_query = arguments[0];

            var len = arguments.length;
            var connection = undefined;
            var cb = undefined;

            function new_callback(err, result) {

                // if retryable, re-try
                if (err && this.mysql.retryable_errors && ~this.mysql.retryable_errors.indexOf(err.code)) {
                    this.retries++;

                    if (this.retries === this.mysql._max_retry) {
                        return cb({ message: 'Reached max retries' }, null, this.mysql._args, last_query);
                    }

                    return this.query.apply(this, _toConsumableArray(_args));
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
    }]);

    return Query;
})();

module.exports = Query;