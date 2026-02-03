const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ IMPORT MIDDLEWARE
const { verifyToken } = require('./src/middleware/auth');

// Routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

const productRoutes = require('./src/routes/product');
app.use('/api/products', productRoutes);

const categoryRoutes = require('./src/routes/category');
app.use('/api/categories', categoryRoutes);

const cartRoutes = require('./src/routes/cart');
app.use('/api/cart', cartRoutes);

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

// ✅ API TEST MIDDLEWARE - Cần token
app.get('/api/test-protected', verifyToken, (req, res) => {
    res.json({
        success: true,
        message: 'Bạn đã xác thực thành công!',
        user: req.user  // Thông tin từ token
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
