
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Common configuration, pulled from environment variables
const connectionConfig = {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD, // Directly from .env
    database: process.env.PGDATABASE,
};

// Environment-specific configuration
if (isProduction && process.env.CLOUD_SQL_CONNECTION_NAME) {
    // For Cloud Run, a Unix socket is the recommended approach.
    console.log(`Production: Connecting to Cloud SQL via Unix socket.`);
    connectionConfig.host = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
} else {
    // For local development, connect to the Cloud SQL Auth Proxy via TCP.
    console.log(`Development: Connecting to database via TCP.`);
    connectionConfig.host = process.env.PGHOST || 'denishE1570';
    connectionConfig.port = process.env.PGPORT || 5432;
}

const pool = new Pool(connectionConfig);

pool.on('connect', (client) => {
    console.log('Successfully connected to the PostgreSQL database!');
    client.query('SHOW server_version;')
        .then(res => console.log('PostgreSQL server version:', res.rows[0].server_version))
        .catch(err => console.error('Error getting server version', err.stack));
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getPool: () => pool,
};
