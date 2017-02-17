'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Transaction = require('./Transaction');

var _Transaction2 = _interopRequireDefault(_Transaction);

var _Connection = require('./Connection');

var _Connection2 = _interopRequireDefault(_Connection);

var _Query = require('./Query');

var _Query2 = _interopRequireDefault(_Query);

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * This is my class description
 */
var CustomMySQL = function () {
    function CustomMySQL() {
        _classCallCheck(this, CustomMySQL);

        this.escape = _mysql2.default.escape;
        this._logger = console;
        this._max_retry = 3;
    }

    _createClass(CustomMySQL, [{
        key: 'set_logger',
        value: function set_logger(logger) {
            this._logger = logger || console;
            return this;
        }
    }, {
        key: 'set_max_retry',
        value: function set_max_retry(max) {
            this._max_retry = max || 3;
            return this;
        }
    }, {
        key: 'add',
        value: function add(key, config, is_pool) {
            if (!key || !config) {
                throw new Error('key or config is missing');
            }

            if (typeof key !== 'string') {
                throw new Error('key should be a string');
            }

            this._key = key;
            this[key] = { config: config };
            this[key].is_pool = !!is_pool;

            if (is_pool) {
                new _Connection2.default(this);
            }

            return this;
        }
    }, {
        key: 'retry_if',
        value: function retry_if(retryable_errors) {
            this.retryable_errors = retryable_errors;
            return this;
        }
    }, {
        key: 'use',
        value: function use(key) {
            if (!key) {
                throw new Error('key is missing');
            }

            if (!this[key]) {
                throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
            }

            this.retryable_errors = null;

            if (this._key === key) {
                return this;
            }

            this._key = key;

            if (this.current_connection) {
                this.end();
            }

            return this;
        }
    }, {
        key: 'args',
        value: function args() {
            if (!this._key) {
                throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
            }

            this._args = arguments;
            return this;
        }
    }, {
        key: 'query',
        value: function query() {
            if (!this._key) {
                throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
            }

            if (arguments.length < 2) {
                throw new Error('Incomplete arguments. Have at least a query and a callback');
            }

            if (typeof arguments[arguments.length - 1] !== 'function') {
                throw new Error('Last parameter is not a function');
            }

            new (Function.prototype.bind.apply(_Query2.default, [null].concat([this], Array.prototype.slice.call(arguments))))();
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
        key: 'build',
        value: function build() {
            this._cache = Array.from(arguments);
            return this;
        }
    }, {
        key: 'promise',
        value: function promise() {
            var _this = this;

            return new Promise(function (resolve, reject) {

                _this._cache.push(function (err, result, args, last_query) {

                    if (err) {
                        return reject(err);
                    }

                    resolve(result);
                });

                _this.query.apply(_this, _this._cache);
                _this.end();
            });
        }
    }, {
        key: 'transaction',
        value: function transaction() {
            if (!this.current_connection) {
                new _Connection2.default(this);
            }

            return new _Transaction2.default(this);
        }
    }, {
        key: 'end',
        value: function end() {
            if (this._key && !this[this._key].is_pool && this[this._key].connection) {
                this[this._key].connection.end();
                this[this._key].connection = null;
            }

            this.current_connection = null;

            return this;
        }
    }, {
        key: 'end_pool',
        value: function end_pool() {
            var _this2 = this;

            if (this._key && this[this._key].connection) {
                this[this._key].connection.end(function (err) {
                    if (err) {
                        return _this2._logger.error('Closing pool ' + _this2._key + ' error: \n', err);
                    }

                    _this2._logger.info('Pool ' + _this2._key + ' closed');
                });

                this.current_connection = null;
                this[this._key].connection = null;
            }

            return this;
        }

        /* Everything below will be deprecated */

    }, {
        key: 'open',
        value: function open(config) {
            var self = this,
                config_str = '',
                i = void 0;

            for (i in config) {
                config_str += config[i];
            }

            this._key = config_str;

            if (this[config_str] && this[config_str].connection) {
                return this;
            }

            this[config_str] = {
                config: config,
                is_pool: true,
                connection: _mysql2.default.createPool(config)
            };

            this[config_str].connection.on('error', function (err) {
                console.log('error', err);
            });

            this[config_str].connection.on('close', function (err) {
                console.log('close', err);
                self[config_str].connection = _mysql2.default.createPool(self[config_str].config);
            });

            this.escapeId = this[config_str].connection.escapeId.bind(this[config_str].connection);

            return this;
        }
    }, {
        key: 'async',
        value: function async(query, args, async_args, collector, fn) {
            var _this3 = this;

            var results = [];
            var len = args.length;

            function _collector(err, result, _args) {
                var temp = {
                    err: err,
                    result: result,
                    args: _args
                };

                results.push(collector ? collector(err, result, _args) : temp);

                if (! --len) {
                    fn(async_args || results);
                }
            }

            if (arguments.length === 4) {
                fn = collector;
                collector = async_args;
                async_args = null;
            }

            if (arguments.length === 3) {
                fn = async_args;
                async_args = null;
            }

            args.forEach(function (arg, index) {
                _this3.args(async_args && async_args.hasOwnProperty(index) ? async_args[index] : arg).query(query, arg, _collector);
            });

            return this;
        }
    }, {
        key: 'on',
        value: function on(_event, cb) {
            if (!this._key) {
                throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
            }

            return this[this._key].connection.on(_event, cb);
        }
    }]);

    return CustomMySQL;
}();

exports.default = CustomMySQL;