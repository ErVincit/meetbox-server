const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.OFFICIAL_DB, ssl: true });
pool.on("error", (error) => console.error("Error:", error));
// NOTE: pg-cursor per leggere grandi quantità di informazioni

module.exports = pool;
