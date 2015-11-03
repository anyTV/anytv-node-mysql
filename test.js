const config = require(__dirname + 'config/config');
const mysql = require('anytv-node-mysql');


/* on server.js */

// use connection pool
mysql.add('master', config.MYSQL_DB, true);

// create connection for every `.use()`
mysql.add('ytfreedom', config.DASHBOARD_DB);




/* on controllers */

// will use the pooled connections
mysql.use('master')
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
	.end();

