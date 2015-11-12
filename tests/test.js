'use strict';

const should = require('chai').should();
const mysql = require(process.cwd() + '/index');



describe('Overall test', () => {


	it ('mysql.escape should exist', (done) => {
		mysql.escape.should.exist;
		done();
	});



	it ('mysql should have a default logger', (done) => {
		mysql._logger.should.exist;
		done();
	});



	it ('mysql.set_logger should use the given logger', (done) => {
		const new_logger = {
			info: () => {
				done();
			}
		};

		mysql.set_logger.should.not.be.undefined;
		mysql.set_logger(new_logger);
		mysql._logger.info();
	});



	it ('mysql.set_max_retry should set the max retry', (done) => {
		mysql.set_max_retry.should.not.be.undefined;
		mysql.set_max_retry(5);
		mysql._max_retry.should.be.equal(5);
		// bring it back
		mysql.set_max_retry();
		done();
	});



	it ('mysql._max_retry should default to 3', (done) => {
		mysql._max_retry.should.exist;
		mysql._max_retry.should.be.equal(3);
		done();
	});



	it ('mysql.add should throw an error if key or config is missing', (done) => {

		mysql.add.should.throw(Error, 'key or config is missing');

		(() => {
			mysql.add('key');
		}).should.throw(Error, 'key or config is missing');

		(() => {
			mysql.add({});
		}).should.throw(Error, 'key or config is missing');

		done();
	});



	it ('mysql.add should throw an error if key is not a string', (done) => {
		(() => {
			mysql.add(1, {});
		}).should.throw(Error, 'key should be a string');

		done();
	});



	it ('mysql.add should throw an error if config is not an object', (done) => {
		(() => {
			mysql.add('key', 1);
		}).should.throw(Error, 'config should be an object');

		done();
	});

});
