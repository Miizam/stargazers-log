const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: 'Z',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true   // ou `false` para testes
    }
});

module.exports = pool;
