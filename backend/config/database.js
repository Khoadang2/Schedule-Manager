const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_WEB_USER || "sa",
  password: process.env.DB_WEB_PASSWORD || "Qweasd@123",
  server: process.env.DB_WEB_SERVER || "192.168.71.111",
  database: process.env.DB_WEB_DATABASE || "WEB_IP",
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

let pool = null;

const getConnection = async () => {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    pool = await sql.connect(config);
    console.log('✅ Database connected successfully!');
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

const testConnection = async () => {
  try {
    const poolConnection = await getConnection();
    const result = await poolConnection.request().query('SELECT 1 as test');
    
    if (result.recordset.length > 0) {
      console.log('✅ Database connection test: SUCCESS');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Database connection test: FAILED');
    console.error('Error:', error.message);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error closing database:', error);
    process.exit(1);
  }
});

module.exports = {
  sql,
  getConnection,
  testConnection
};