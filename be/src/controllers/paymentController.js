const db = require('../config/db');
const { createVNPayUrl, verifyVNPayResponse } = require('../config/payment');

/**
 * Tạo order và trả về URL thanh toán
 * POST /api/payments/create-order
 */
exports.createOrder = async (req, res) => {
    try {
        const { paymentMethod, clientIp, cartItemIds } = req.body;
        const userId = req.user.userId;

        // Validate payment method
        if (!['cod', 'vnpay'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Phương thức thanh toán không hợp lệ'
            });
        }

        // Lấy giỏ hàng của user
        const [carts] = await db.query('SELECT * FROM cart WHERE user_id = ?', [userId]);
        if (carts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        const cartId = carts[0].id;

        // Lấy các sản phẩm trong giỏ 
        let cartItems;
        if (cartItemIds && cartItemIds.length > 0) {
            const placeholders = cartItemIds.map(() => '?').join(',');
            [cartItems] = await db.query(
                `SELECT ci.*, p.price FROM cart_items ci 
                 JOIN products p ON ci.product_id = p.id 
                 WHERE ci.cart_id = ? AND ci.id IN (${placeholders})`,
                [cartId, ...cartItemIds]
            );
        } else {
            [cartItems] = await db.query(
                'SELECT ci.*, p.price FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?',
                [cartId]
            );
        }

        if (cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng không có sản phẩm'
            });
        }

        // Tính tổng tiền
        let totalPrice = 0;
        cartItems.forEach(item => {
            totalPrice += item.price * item.quantity;
        });

        // Tạo order mới
        const [orderResult] = await db.query(
            `INSERT INTO orders (user_id, total_price, payment_method, payment_status, order_status) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, totalPrice, paymentMethod, 'pending', 'pending']
        );

        const orderId = orderResult.insertId;

        // Thêm order items
        for (const item of cartItems) {
            await db.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price) 
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // Xử lý theo phương thức thanh toán
        if (paymentMethod === 'cod') {
            // COD: Thanh toán khi nhận hàng
            res.json({
                success: true,
                message: 'Tạo đơn hàng thành công!',
                orderId: orderId,
                totalPrice: totalPrice,
                paymentMethod: 'cod',
                paymentUrl: null
            });
        } else if (paymentMethod === 'vnpay') {
            // VNPay: Tạo URL thanh toán
            const orderDescription = `Thanh toán đơn hàng ${orderId}`;
            const paymentUrl = createVNPayUrl({
                orderId: `${orderId}`,
                amount: totalPrice,
                orderDescription: orderDescription,
                clientIp: clientIp || '127.0.0.1'
            });

            res.json({
                success: true,
                message: 'Tạo đơn hàng thành công! Chuyển hướng đến VNPay...',
                orderId: orderId,
                totalPrice: totalPrice,
                paymentMethod: 'vnpay',
                paymentUrl: paymentUrl
            });
        }

        // Chỉ xóa các cart_items đã được thanh toán (items được chọn)
        if (cartItemIds && cartItemIds.length > 0) {
            const placeholders = cartItemIds.map(() => '?').join(',');
            await db.query(
                `DELETE FROM cart_items WHERE cart_id = ? AND id IN (${placeholders})`,
                [cartId, ...cartItemIds]
            );
        } else {
            await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
        }

    } catch (error) {
        console.error('Lỗi tạo order:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

/**
 * Callback từ VNPay
 * GET /api/payments/vnpay-callback
 */
exports.vnpayCallback = async (req, res) => {
    try {
        const verifyResult = verifyVNPayResponse(req.query);

        if (!verifyResult.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Xác minh chữ ký thất bại'
            });
        }

        if (verifyResult.responseCode !== '00') {
            await db.query(
                `UPDATE orders SET payment_status = ?, transaction_id = ? WHERE id = ?`,
                ['failed', verifyResult.transactionNo, verifyResult.orderId]
            );

            return res.status(400).json({
                success: false,
                message: `Thanh toán thất bại. Mã lỗi: ${verifyResult.responseCode}`
            });
        }

        const orderId = verifyResult.orderId;
        const amount = verifyResult.amount;

        await db.query(
            `UPDATE orders SET payment_status = ?, order_status = ?, transaction_id = ? WHERE id = ?`,
            ['completed', 'processing', verifyResult.transactionNo, orderId]
        );

        res.json({
            success: true,
            message: 'Thanh toán thành công!',
            orderId: orderId,
            amount: amount,
            transactionNo: verifyResult.transactionNo
        });

    } catch (error) {
        console.error('Lỗi callback VNPay:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

/**
 * Lấy chi tiết thanh toán của một order
 * GET /api/payments/:orderId
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        const [orders] = await db.query(
            `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
            [orderId, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Đơn hàng không tồn tại'
            });
        }

        const order = orders[0];

        res.json({
            success: true,
            data: {
                orderId: order.id,
                totalPrice: order.total_price,
                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,
                orderStatus: order.order_status,
                transactionId: order.transaction_id,
                createdAt: order.created_at
            }
        });

    } catch (error) {
        console.error('Lỗi lấy status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

/**
 * Xác nhận thanh toán bằng tiền mặt (COD)
 * POST /api/payments/confirm-cod
 */
exports.confirmCOD = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.userId;

        const [orders] = await db.query(
            `SELECT * FROM orders WHERE id = ? AND user_id = ? AND payment_method = 'cod'`,
            [orderId, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Đơn hàng không tồn tại hoặc không phải COD'
            });
        }

        const order = orders[0];

        if (order.payment_status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được xử lý rồi'
            });
        }

        await db.query(
            `UPDATE orders SET payment_status = ?, order_status = ? WHERE id = ?`,
            ['completed', 'processing', orderId]
        );

        res.json({
            success: true,
            message: 'Đơn hàng đã được xác nhận. Chúng tôi sẽ liên hệ với bạn sớm!',
            orderId: orderId
        });

    } catch (error) {
        console.error('Lỗi xác nhận COD:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};
