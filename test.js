'use strict';


var asql = require('./index'),

    next = function (err, result) {
        if (err) {
            return console.log(err);
        }

        console.log(result);
    },

    conn = asql.open({
        host : '127.0.0.1',
        user : 'root',
        password : '',
        database : 'master'
    }, {debug : true});



for (var i = 0; i < 40000; i++) {
    conn.query(
            'SELECT * FROM channel_stats WHERE insert_date LIKE ? LIMIT ?, ?',
            ['2015-01-31 %', 0, 50],
            next
        )
        .query(
            'SELECT * FROM channel_stats WHERE insert_date LIKE ? LIMIT ?, ?',
            ['2015-01-31 %', 50, 100],
            next
        );
}

conn.end();
