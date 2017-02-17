'use strict';

const should = require('chai').should();
const CustomMySQL = require(process.cwd() + '/lib/CustomMySQL').default;
const squel    = require('squel').useFlavour('mysql');
const FREE_DB  = 'mysql://root:@localhost/test';
const FREE_DB2 = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'test2'
};



describe('Overall test', () => {

    const noop_logger = {
        silly: () => {},
        info: () => {},
        log: () => {}
    };


    it ('mysql.escape should exist', (done) => {
        const mysql = new CustomMySQL();
        mysql.escape.should.exist;
        done();
    });



    it ('mysql should have a default logger', (done) => {
        const mysql = new CustomMySQL();
        mysql._logger.should.exist;
        done();
    });



    it ('mysql.set_logger should use the given logger', (done) => {
        const mysql = new CustomMySQL();
        const new_logger = {
            info: () => {
                done();
            }
        };

        mysql.set_logger.should.not.be.undefined;
        mysql.set_logger(new_logger);
        mysql._logger.info();
    });



    it ('mysql.set_logger should return the mysql object', (done) => {
        const mysql = new CustomMySQL();

        mysql.set_logger().should.be.equal(mysql);

        done();
    });



    it ('mysql.set_max_retry should set the max retry', (done) => {
        const mysql = new CustomMySQL();
        mysql.set_max_retry.should.not.be.undefined;
        mysql.set_max_retry(5);
        mysql._max_retry.should.be.equal(5);
        done();
    });



    it ('mysql.set_max_retry should return the mysql object', (done) => {
        const mysql = new CustomMySQL();

        mysql.set_max_retry().should.be.equal(mysql);

        done();
    });



    it ('mysql should have a default max_retry of 3', (done) => {
        const mysql = new CustomMySQL();
        mysql._max_retry.should.exist;
        mysql._max_retry.should.be.equal(3);
        done();
    });



    it ('mysql.add should throw an error if key or config is missing', (done) => {
        const mysql = new CustomMySQL();

        mysql.add.should.throw(Error, 'key or config is missing');

        (() => {
            mysql.add('key');
        }).should.throw(Error, 'key or config is missing');

        done();
    });



    it ('mysql.add should throw an error if key is not a string', (done) => {
        const mysql = new CustomMySQL();

        (() => {
            mysql.add(1, {});
        }).should.throw(Error, 'key should be a string');

        done();
    });



    it ('mysql.add should create a property for a newly added key-config pair', (done) => {
        const mysql = new CustomMySQL();

        mysql.add('key', {});
        mysql.key.should.be.an.object;

        mysql.add('key2', {});
        mysql.key2.should.exist;

        done();
    });



    it ('mysql.add should save the given config', (done) => {
        const mysql = new CustomMySQL();
        const config = {};

        mysql.add('key', config);
        mysql.key.config.should.be.equal(config);

        done();
    });



    it ('mysql.add should default to no pooling', (done) => {
        const mysql = new CustomMySQL();

        mysql.add('key', {});
        mysql.key.is_pool.should.be.equal(false);

        done();
    });



    it ('mysql.add should set is_pool to true', (done) => {
        const mysql = new CustomMySQL();

        mysql.set_logger(noop_logger);
        mysql.add('key', {}, true);
        mysql.key.is_pool.should.be.equal(true);

        done();
    });



    it ('mysql.add should set the current key to the given key', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, {});
        mysql._key.should.be.equal(key);

        done();
    });



    it ('mysql.add should immediately create a connection if pooled', (done) => {
        const mysql = new CustomMySQL();

        mysql.set_logger(noop_logger)
            .add('key', {}, true);
        mysql.key.connection.should.exist;
        mysql.current_connection.should.exist;

        done();
    });



    it ('mysql.add should return the mysql object', (done) => {
        const mysql = new CustomMySQL();

        mysql.add('key', {}).should.be.equal(mysql);

        done();
    });



    it ('mysql.retry_if should set the retryable errors', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';
        const errors = ['a', 'b'];

        mysql.retry_if(errors);
        mysql.retryable_errors.should.equal(errors);

        done();
    });



    it ('mysql.retry_if should return the mysql object', (done) => {
        const mysql = new CustomMySQL();

        mysql.retry_if()
            .should.be.equal(mysql);

        done();
    });



    it ('mysql.use should throw an error if key is missing', (done) => {
        const mysql = new CustomMySQL();

        mysql.use.should.throw(Error, 'key is missing');

        done();
    });



    it ('mysql.use should throw an error if the key is not yet added', (done) => {
        const mysql = new CustomMySQL();

        (() => {
            mysql.use('key');
        }).should.throw(Error, 'Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');

        done();
    });



    it ('mysql.use should set the current key to the given key', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, {});
        mysql.add('key2', {});
        mysql.use(key);
        mysql._key.should.be.equal(key);

        done();
    });



    it ('mysql.use should be able to use multiple pools', (done) => {
        const mysql = new CustomMySQL();

        mysql.add('key', FREE_DB, true);
        mysql.add('key2', FREE_DB2, true);

        mysql.use('key')
            .query('SELECT DATABASE() as d', (e, r) => {
                r[0].d.should.exist;
            })
            .end()
            .use('key2')
            .query('SELECT DATABASE() as d', (e, r) => {
                r[0].d.should.exist;
                done();
            })
            .end();
    });



    it ('mysql.use should set the retryable errors to null', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, {});
        mysql.retry_if(['asdf', 'asdf2']);
        should.not.equal(mysql.retryable_errors, null);

        mysql.use(key);
        should.equal(mysql.retryable_errors, null);

        done();
    });



    it ('mysql.use should end hanging non-pooled connection', (done) => {
        const mysql = new CustomMySQL();

        mysql.add('new_key', {})
            .add('key', {})
            .set_logger(noop_logger)
            .query('SELECT 1', () => {});

        mysql.current_connection.should.exist;

        mysql.use('new_key');
        should.equal(mysql.current_connection, null);

        done();
    });



    it ('mysql.use should return the mysql object', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, {})
            .use(key)
            .should.be.equal(mysql);

        done();
    });



    it ('mysql.args should throw an error if key is not yet set', (done) => {
        const mysql = new CustomMySQL();

        (() => {
            mysql.args();
        }).should.throw(Error, 'Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');

        done();
    });



    it ('mysql.args should set _args which contains everything I passed in the function', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';
        const obj = {};
        const args = [1, 2, '123', obj, []];

        mysql.add(key, {})
            .args(...args);

        Array.from(mysql._args).should.be.eql(args);
        mysql._args[3].should.equal(obj);

        done();
    });



    it ('mysql.args should return the mysql object', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, {})
            .args()
            .should.equal(mysql);

        done();
    });



    it ('mysql.query should throw an error if key is not yet set', (done) => {
        const mysql = new CustomMySQL();

        (() => {
            mysql.query();
        }).should.throw(Error, 'Key does not exist. Add a connection first by using mysql.add(key, config, is_pool)');

        done();
    });



    it ('mysql.query should throw an error if argument length is less than 2', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        (() => {
            mysql.add(key, {})
                .query();
        }).should.throw(Error, 'Incomplete arguments. Have at least a query and a callback');

        (() => {
            mysql.add(key, {})
                .query('');
        }).should.throw(Error, 'Incomplete arguments. Have at least a query and a callback');

        done();
    });



    it ('mysql.query should throw an error if last parameter is not function', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        (() => {
            mysql.add(key, {})
                .query('1', 2);
        }).should.throw(Error, 'Last parameter is not a function');

        done();
    });



    it ('mysql.query should ensure there\'s a connection', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, {})
            .query('', () => {});

        mysql.key.connection.should.exist;
        mysql.current_connection.should.exist;

        delete mysql.current_connection;
        mysql.query('', () => {});
        mysql.key.connection.should.exist;
        mysql.current_connection.should.exist;

        done();
    });



    it ('mysql.query should execute a query', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .query(
                'SELECT 1;',
                (err, result) => {
                    should.equal(err, null);
                    result.length.should.equal(1);
                    done();
                }
            )
            .end();
    });



    it ('mysql.build and mysql.promise should execute a query', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .build('SELECT 1;')
            .promise()
            .then(result => {
                result.length.should.equal(1);
                done();
            })
            .catch(err => {
                should.equal(err, null);
                done();
            });
    });



    it ('mysql.squel should execute a query', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        const query = squel.select()
            .field('1');

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .squel(
                query,
                (err, result) => {
                    should.equal(err, null);
                    result.length.should.equal(1);
                    done();
                }
            )
            .end();
    });



    it ('mysql.squel should execute a query in transaction', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        const query = squel.select()
            .field('1');

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .transaction()
            .squel(
                query,
                (err, result) => {
                    should.equal(err, null);
                    result.length.should.equal(1);
                }
            )
            .commit(done);
    });



    it ('mysql.build and mysql.promise with params should execute a query', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .build('SELECT ?;', [1])
            .promise()
            .then(result => {
                result.length.should.equal(1);
                done();
            })
            .catch(err => {
                should.equal(err, null);
                done();
            });
    });



    it ('mysql.query should accept query placeholder values', (done) => {
        const mysql = new CustomMySQL();
        const value = 'hi';
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .query(
                'SELECT ?;',
                [value],
                (err, result) => {
                    should.equal(err, null);
                    result[0][value].should.equal(value);
                    done();
                }
            )
            .end();
    });



    it ('mysql.query should pass the args and last query on callback', (done) => {
        const mysql = new CustomMySQL();
        const obj = {};
        const args = [1, 2, '123', obj, []];
        const query = 'SELECT 1;';
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, FREE_DB)
            .args(...args)
            .query(query, callback)
            .end();

        function callback (err, result, _args, last_query) {
            should.equal(err, null);
            result.length.should.equal(1);
            Array.from(_args).should.eql(args);
            last_query.should.equal(query);
            _args[3].should.equal(obj);

            done();
        }
    });



    it ('mysql.query should reach the max retries after having ER_BAD_FIELD_ERROR twice', (done) => {
        const mysql = new CustomMySQL();
        const query = 'SELECT a;';
        const key = 'key';

        mysql.set_logger(noop_logger)
            .set_max_retry(2)
            .retry_if(['ER_BAD_FIELD_ERROR'])
            .add(key, FREE_DB)
            .query(query, callback)
            .end();

        function callback (err, result, _args, last_query) {
            should.equal(result, null);
            err.code.should.be.equal('ER_MAX_RETRIES');
            err.max_tries.should.be.equal(2);
            err.previous_errors
                .map(a => a.code)
                .should.be
                .eql(['ER_BAD_FIELD_ERROR', 'ER_BAD_FIELD_ERROR']);

            done();
        }
    });



    it ('mysql.query should return the mysql object', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, {})
            .set_logger(noop_logger)
            .query('1', () => {})
            .should.be.equal(mysql);

        done();
    });



    it ('mysql.transcation should do the same with pooled connections', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, FREE_DB, true)
            .set_logger(noop_logger)
            .transaction()
            .query('SELECT 1', (err) => {
                should.equal(err, null);
            })
            .query('SELECT 2', (err) => {
                should.equal(err, null);
            })
            .commit((err) => {
                should.equal(err, null);
                done();
            });
    });



    it ('mysql.transaction should return an object with query and commit', (done) => {
        let mysql = new CustomMySQL();
        const key = 'key';

        mysql = mysql.add(key, {})
            .set_logger(noop_logger)
            .transaction();

        mysql.query.should.exist;
        mysql.commit.should.exist;

        done();
    });



    it ('mysql.transaction should be able to do series of queries', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, FREE_DB)
            .set_logger(noop_logger)
            .transaction()
            .query('SELECT 1', (err) => {
                should.equal(err, null);
            })
            .query('SELECT 2', (err) => {
                should.equal(err, null);
            })
            .commit((err) => {
                should.equal(err, null);
                done();
            });
    });



    it ('mysql.transaction should automatically rollback if one query fails', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, FREE_DB)
            .set_logger(noop_logger)
            .query('DROP TABLE IF EXISTS users;', (err, result) => {
                should.equal(err, null);
                result.should.exist;
            })
            .query('CREATE TABLE users(name varchar(128) primary key);', (err, result) => {
                should.equal(err, null);
                result.should.exist;
            })
            .transaction()
            .query('INSERT INTO users VALUES (?)', ['name1'], (err, result) => {
                should.equal(err, null);
                result.should.exist;
            })
            .query('INSERT INTO users VALUES (?)', ['name1'], (err) => {
                err.should.exist;
            })
            .query('INSERT INTO users VALUES (?)', ['name2'], (err) => {
                // this won't be executed anymore
            })
            .commit((err) => {
                err.should.exist;

                mysql.query(
                        'SELECT name FROM users',
                        (err, result) => {
                            should.equal(err, null);
                            result.length.should.equal(0);
                        }
                    )
                    .query(
                        'DROP TABLE IF EXISTS users;',
                        (err) => {
                            should.equal(err, null);
                            done();
                        }
                    )
                    .end();
            });
    });



    it ('mysql.transaction should automatically rollback if one query fails on pooled connections', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add(key, FREE_DB, true)
            .set_logger(noop_logger)
            .query('DROP TABLE IF EXISTS users2;', (err, result) => {

                should.equal(err, null);
                result.should.exist;

                mysql.query('CREATE TABLE users2 (name varchar(128) primary key);', (err, result) => {

                        should.equal(err, null);
                        result.should.exist;

                        mysql.use(key)
                            .transaction()
                            .query('INSERT INTO users2 VALUES (?)', ['name1'], (err, result) => {
                                should.equal(err, null);
                                result.should.exist;
                            })
                            .query('INSERT INTO users2 VALUES (?)', ['name1'], (err) => {
                                err.should.exist;
                            })
                            .query('INSERT INTO users2 VALUES (?)', ['name2'], (err) => {
                                // this won't be executed anymore
                            })
                            .commit((err) => {
                                err.should.exist;

                                mysql.query(
                                        'SELECT name FROM users2',
                                        (err, result) => {
                                            should.equal(err, null);
                                            result.length.should.equal(0);
                                        }
                                    )
                                    .query(
                                        'DROP TABLE IF EXISTS users2;',
                                        (err) => {
                                            should.equal(err, null);
                                            done();
                                        }
                                    )
                                    .end();
                            });
                    })
                    .end();
            })
            .end();
    });



    it ('mysql.transaction().query should throw an error if argument length is less than 2', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        (() => {
            mysql.add(key, FREE_DB)
                .set_logger(noop_logger)
                .transaction()
                .query();
        }).should.throw(Error, 'Incomplete arguments. Have at least a query and a callback');

        (() => {
            mysql.add(key, FREE_DB)
                .set_logger(noop_logger)
                .transaction()
                .query('');
        }).should.throw(Error, 'Incomplete arguments. Have at least a query and a callback');

        done();
    });



    it ('mysql.transaction().query should throw an error if query is not a string', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        (() => {
            mysql.add(key, FREE_DB)
                .set_logger(noop_logger)
                .transaction()
                .query(1, 2);
        }).should.throw(Error, 'Query is not a string');

        done();
    });



    it ('mysql.transaction().query should throw an error if last parameter is not function', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        (() => {
            mysql.add(key, FREE_DB)
                .set_logger(noop_logger)
                .transaction()
                .query('1', 2);
        }).should.throw(Error, 'Last parameter is not a function');

        done();
    });



    it ('mysql.transaction...commit should return the mysql object', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';
        let temp;

        temp = mysql.add(key, FREE_DB)
            .set_logger(noop_logger)
            .transaction()
            .query('SELECT 1', (err) => {
                should.equal(err, null);
            })
            .commit((err) => {
                should.equal(err, null);
                mysql.should.be.equal(temp);

                done();
            });
    });



    it ('mysql.end should remove the current_connection and key\'s connection', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.add('key', {})
            .set_logger(noop_logger)
            .query('1', () => {})
            .end();

        should.equal(mysql.current_connection, null);
        should.equal(mysql.key.connection, null);

        done();
    });



    it ('mysql.end should return the mysql object', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.end()
            .should.be.equal(mysql);

        done();
    });

    it ('mysql.end_pool should close pooled connections', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, {}, true)
            .use(key)
            .end_pool();

        should.equal(mysql[key].connection, null);

        should.equal(mysql.current_connection, null);

        done();
    });

    it ('mysql.end_pool should return the mysql object', (done) => {
        const mysql = new CustomMySQL();
        const key = 'key';

        mysql.set_logger(noop_logger)
            .add(key, {}, true)
            .use(key)
            .end_pool()
            .should.be.equal(mysql)

        done();
    });

});
