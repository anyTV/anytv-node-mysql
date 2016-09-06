'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Connection = function () {
    function Connection(handle) {
        _classCallCheck(this, Connection);

        this.max_retries = 3;
        this.handle = handle;
        this.retries = 0;
        this.connect();
    }

    _createClass(Connection, [{
        key: 'connect',
        value: function connect() {
            var handle = this.handle;
            var key = handle._key;
            var connection = void 0;

            if (handle[key].is_pool) {
                // handle._logger.log('Added a pool connection for', key);
                connection = _mysql2.default.createPool(handle[key].config);
            } else {
                // handle._logger.log('Created a single connection');
                connection = _mysql2.default.createConnection(handle[key].config);
            }

            handle[key].connection = connection;
            handle.current_connection = handle[key].connection;

            this.recon = this.recon.bind(this);

            connection.on('close', this.recon);
            connection.on('error', this.recon);

            // this.keepAlive();
            return this;
        }
    }, {
        key: 'recon',
        value: function recon(err) {
            this.handle._logger.error(this.handle.is_pool ? 'pool' : 'single', 'connection error', err);

            if (++this.retries >= this.max_retries) {
                this.handle._logger.error('too many errors');
                return;
            }

            this.connect();
            return this;
        }

        /*
        keep_alive () {
            setInterval(() => {
                this.handle.query('SELECT 1;', (err) => {
                    if (err) {
                        this.handle._logger.error(err);
                    }
                });
            }, 5000);
             return this;
        }*/

    }]);

    return Connection;
}();

exports.default = Connection;