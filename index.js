'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var mysql = require('mysql');

var CustomMySQL = (function () {
    function CustomMySQL() {
        _classCallCheck(this, CustomMySQL);

        this.escape = mysql.escape;
        this.max_retry = 3;
        this.logger = console;
    }

    _createClass(CustomMySQL, [{
        key: 'args',
        value: function args() {
            if (!this._key) {
                throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
            }

            this._args = arguments;
            return this;
        }
    }, {
        key: 'add',
        value: function add(key, config, is_pool) {
            var _this = this;

            this[key] = { config: config };

            if (is_pool) {
                this._logger.info('Added a pool connection for', key);
                this[key].is_pool = true;
                this[key].connection = mysql.createPool(config);
                this[key].connection.on('close', function (err) {
                    return _this._logger.log('connection closed', err);
                });
            }

            return this;
        }
    }, {
        key: 'use',
        value: function use(key) {
            var _this2 = this;

            if (!this[key]) {
                throw new Error('Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');
            }

            this._key = key;
            this.retries = 0;
            this.retryable_errors = null;

            if (!this[key].connection) {
                this._logger.log('Creating connection');
                this[key].connection = mysql.createConnection(this[key].config);
                this[key].connection.connect(function (err) {
                    if (err) {
                        _this2._logger.log('error in creating connection', err);
                    }
                });
                this[key].connection.on('close', function (err) {
                    return _this2._logger.log('connection closed', err);
                });
            }

            return this;
        }
    }, {
        key: 'query',
        value: function query() {
            var _this3 = this;

            var last_query = arguments[0];
            var len = arguments.length;
            var _args = arguments;
            var self = this;
            var connection = undefined;
            var cb = undefined;

            this.pending = arguments;

            while (len--) {
                if (typeof arguments[len] === 'function') {
                    cb = arguments[len];
                    arguments[len] = function (err, result) {
                        if (err && _this3.retryable_errors && ~_this3.retryable_errors.indexOf(err.code)) {
                            _this3.retries++;
                            _this3._logger.log('Retrying');

                            if (_this3.retries === _this3.max_retry) {
                                return cb({ message: 'Reached max retries' }, null, _this3._args, last_query);
                            }

                            return _this3.query.apply(_this3, _toConsumableArray(_args));
                        }

                        cb(err, result, _this3._args, last_query);
                    };
                    break;
                }
            }

            connection = this._key && this[this._key].connection;

            if (connection) {
                connection.query.apply(connection, arguments);
            } else {
                throw new Error('Add a connection first by using mysql.add(key, config) or start a connection using mysql.use(key)');
            }

            return this;
        }
    }, {
        key: 'end',
        value: function end() {
            if (this._key && !this[this._key].is_pool && this[this._key].connection) {
                this[this._key].connection.end();
                delete this[this._key].connection;
            } else if (!this._key || this._key && !this[this._key].connection) {
                throw new Error('Add a connection first by using mysql.add(key, config)');
            }

            return this;
        }
    }, {
        key: 'retry_if',
        value: function retry_if(retryable_errors) {
            this.retryable_errors = retryable_errors;
            return this;
        }

        /* Everything below will be depreciated */

    }, {
        key: 'open',
        value: function open(config) {
            var self = this,
                config_str = '',
                i = undefined;

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
                connection: mysql.createPool(config)
            };

            this[config_str].connection.on('error', function (err) {
                console.log('error', err);
            });

            this[config_str].connection.on('close', function (err) {
                console.log('close', err);
                self[config_str].connection = mysql.createPool(self[config_str].config);
            });

            this.escapeId = this[config_str].connection.escapeId.bind(this[config_str].connection);

            return this;
        }
    }, {
        key: 'async',
        value: function async(query, args, async_args, collector, fn) {
            var _this4 = this;

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
                _this4.args(async_args && async_args.hasOwnProperty(index) ? async_args[index] : arg).query(query, arg, _collector);
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
    }, {
        key: 'max_retry',
        set: function set(max) {
            this._max_retry = max;
            return this;
        }
    }, {
        key: 'logger',
        set: function set(logger) {
            this._logger = logger;
            return this;
        }
    }]);

    return CustomMySQL;
})();

module.exports = new CustomMySQL();
