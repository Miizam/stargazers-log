const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: 'Z',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    }
});

pool.query('SELECT 1')
    .then(() => console.log('✅ Conexão TiDB OK (TLS)'))
    .catch(e => console.error('❌ Conexão TiDB falhou:', e.message));

module.exports = pool;
