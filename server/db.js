const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const isSocketConnection = !!process.env.DB_SOCKET_PATH;

const dbConfig = isSocketConnection
  ? {
      socketPath: process.env.DB_SOCKET_PATH,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'akocentric',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'akocentric',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
    };

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function testConnection() {
  const [rows] = await getPool().query('SELECT 1 AS ok, DATABASE() AS databaseName');
  return rows[0];
}

module.exports = {
  dbConfig,
  getPool,
  query,
  testConnection,
};