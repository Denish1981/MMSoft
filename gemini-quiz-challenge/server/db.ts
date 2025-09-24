import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// --- Environment Variable Validation ---
// This block ensures the server fails fast with a clear error message
// if the database configuration is missing.
const requiredEnvVars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`FATAL: Missing required database environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure a .env file is present in the /server directory with all required variables.');
  process.exit(1); // Exit immediately
}

const pgPort = parseInt(process.env.PGPORT!, 10);
if (isNaN(pgPort)) {
    console.error(`FATAL: Invalid value for PGPORT. Expected a number, but got: "${process.env.PGPORT}"`);
    process.exit(1);
}
// --- End Validation ---

const connectionConfig = {
    host: process.env.PGHOST,
    port: pgPort,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    connectionTimeoutMillis: 5000,
};

// Log the configuration being used to help debug environment variable issues.
// The password is intentionally omitted for security.
console.log('Attempting database connection with config:', {
    host: connectionConfig.host,
    port: connectionConfig.port,
    user: connectionConfig.user,
    database: connectionConfig.database,
});

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

// An explicit function to verify the database connection by acquiring a client.
// This is the most robust way to ensure the database is reachable on startup.
export const initializeDatabase = async () => {
  let client;
  try {
    // Acquire a client from the pool. If a connection cannot be established
    // within connectionTimeoutMillis, this will throw an error.
    console.log(`Connecting to the PostgreSQL database at ${connectionConfig.host}:${connectionConfig.port}`);
    client = await pool.connect();
    console.log(`Successfully connected to the PostgreSQL database at ${connectionConfig.host}:${connectionConfig.port}`);
  } catch (error) {
    console.error(`[DB Init] Failed to connect to database.`);
    // Re-throw the original error to be handled by the server's main startup logic.
    throw error;
  } finally {
    // IMPORTANT: Always release the client back to the pool.
    if (client) {
      client.release();
    }
  }
};


export const query = (text: string, params?: any[]) => pool.query(text, params);