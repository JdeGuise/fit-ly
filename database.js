const pg = require('pg');
const configJS = require('./config');

const config = {
	max: 10,
	idleTimeoutMillis: 30000,
    host: configJS.POSTGRES_DB_HOST,
    port: configJS.POSTGRES_DB_PORT,
    user: configJS.POSTGRES_DB_USER,
    password: configJS.POSTGRES_DB_PASS,
    database: configJS.POSTGRES_DB_NAME
};

module.exports = new pg.Pool(config);