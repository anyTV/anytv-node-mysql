'use strict';


var asql = require('./index'),

    next = function (err, result) {
        if (err) {
            return console.log(err);
        }

        console.log(result);
    },

    conn = asql.open({
        host : '203.177.42.90',
        user : 'rvnjl',
        password : 'focusonrevenue',
        database : 'master'
    }, {debug : true});



for (var i = 0; i < 40; i++) {
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
