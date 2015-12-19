'use strict';

import mysql from 'mysql';

export default class Connection {

    constructor (handle) {
        this.max_retries = 3;
        this.handle = handle;
        this.retries = 0;
        this.connect();
    }

    connect () {
        const handle = this.handle;
        const key = handle._key;
        let connection;

        if (handle[key].is_pool) {
            // handle._logger.log('Added a pool connection for', key);
            connection = mysql.createPool(handle[key].config);
        }
        else {
            // handle._logger.log('Created a single connection');
            connection = mysql.createConnection(handle[key].config);
        }

        handle[key].connection = connection;
        handle.current_connection = handle[key].connection;

        this.recon = this.recon.bind(this);

        connection.on('close', this.recon);
        connection.on('error', this.recon);

        // this.keepAlive();
        return this;
    }

    recon (err) {
        this.handle._logger.error(
            this.handle.is_pool
                ? 'pool'
                : 'single',
            'connection error',
            err
        );

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
}
