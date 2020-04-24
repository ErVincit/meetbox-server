const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_ALTERNATIVO, ssl: false});
pool.on("error", (error, client) => console.error("Error:", error));
// NOTE: pg-cursor per leggere grandi quantità di informazioni

module.exports = pool;