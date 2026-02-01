const mysql = require('mysql2');
require('dotenv').config();

// Tạo connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Chuyển sang Promise để dùng async/await
const promisePool = pool.promise();

// Test kết nối
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Lỗi kết nối database:', err.message);
        return;
    }
    console.log('✅ Kết nối database thành công!');
    connection.release();
});

module.exports = promisePool;
