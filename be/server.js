const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db'); 
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import middleware xác thực token
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

const shippingRoutes = require('./src/routes/shipping');
app.use('/api/shipping', shippingRoutes);

const checkoutRoutes = require('./src/routes/checkout');
app.use('/api/checkout', checkoutRoutes);

const orderRoutes = require('./src/routes/order');
app.use('/api/orders', orderRoutes);

const paymentRoutes = require('./src/routes/payment');
app.use('/api/payments', paymentRoutes);

const discountRoutes = require('./src/routes/discount');
app.use('/api/discounts', discountRoutes);

// Route test server
app.get('/', (req, res) => {
    res.json({ message: '🚀 Backend API đang chạy!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
