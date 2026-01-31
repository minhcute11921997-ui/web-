const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Import db connection

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Backend API đang chạy!' });
});

// Test database route
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as total FROM products');
        res.json({ 
            success: true, 
            message: 'Kết nối database OK!',
            totalProducts: rows[0].total
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi database', 
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
