const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

// POST /api/payments/create-order - Tạo order và lấy URL thanh toán
router.post('/create-order', verifyToken, paymentController.createOrder);

// GET /api/payments/vnpay-callback - Callback từ VNPay
router.get('/vnpay-callback', paymentController.vnpayCallback);

// GET /api/payments/:orderId - Lấy trạng thái thanh toán
router.get('/:orderId', verifyToken, paymentController.getPaymentStatus);


module.exports = router;
