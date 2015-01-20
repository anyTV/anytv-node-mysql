var mysql = require('mysql');

module.exports = {
    open : function (config) {
        this.connection = mysql.createConnection(config);
        return this;
    },

    open_pool : function (config) {
        this.connection = mysql.createPool(config);
        this.connection.connect(function (err) {
            console.log(err);
        });
        return this;
    },

    args : function () {
        this._args = arguments;
        return this;
    },

    async : function (query, args, async_args, collector, fn) {
        var self = this,
            results = [],
            len = args.length,

            _collector = function (err, result, args) {
                var temp = {
                            err : err,
                            result : result,
                            args : args
                        };

                results.push(
                    collector
                    ? collector(err, result, args)
                    : temp
                );

                if (!--len) {
                    fn(async_args || results);
                    self.end();
                }
            };

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
            self.args(async_args && async_args.hasOwnProperty(index)
                    ? async_args[index]
                    : arg
                )
                .query(query, arg, _collector);
        });

        return this;
    },

    query : function () {
        var len = arguments.length,
            self = this,
            _args = this._args,
            cb,
            closure = function (err, result) {
                cb(err, result, _args);
            };

        while (len--) {
            if (typeof arguments[len] === 'function') {
                cb = arguments[len];
                arguments[len] = closure;
                break;
            }
        }

        if (this.connection) {
            this.connection.query.apply(this.connection, arguments);
        }
        else {
            throw new Error('Establish a connection first by using mysql.open()');
        }

        return this;
    },

    end : function () {
        if (!this.ended) {
            this.connection.end();
            this.ended = true;
            delete this.connection;
        }
    }
};

