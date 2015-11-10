const config = require(__dirname + '/../master/config/config');
// const mysql = require('anytv-node-mysql');
const mysql = require('./index');


/* on server.js */

// use connection pool
mysql.add('master', config.MYSQL_DB, true);

// create connection for every `.use()`
mysql.add('ytfreedom', config.DASHBOARD_DB);


mysql.add('mine', {
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'raven'
});




/* on controllers */

// will use the pooled connections
/*mysql.use('master')
	.query(
		'select count(*) from mcn_channels',
		(err, result) => {
			console.log(err, result)
		}
	)
	// will not do anything because it's pooled
	.end();


// will create a new connection
mysql.use('ytfreedom')
	.query(
		'SELECT count(*) FROM users',
		(err, result) => {
			console.log(err, result)
		}
	)
	// will terminate the created connection
	.end();*/



// will create a new connection
mysql.use('mine')
	.transaction()
	.query(
		'INSERT INTO channel1 VALUES("aloha")',
		(err, result) => {console.log(result);}
	)
	.query(
		'INSERT INTO channel1 VALUES("aloha2")',
		(err, result) => {console.log(result);}
	)
	// will terminate the created connection
	.commit((err) => {
		if (err) {
			console.log(err);
		}
		process.exit(0);
	});

