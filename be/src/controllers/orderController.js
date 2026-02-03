const db = require('../config/db');

// Tạo đơn hàng từ giỏ hàng
exports.createOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.user.userId;
        const { shipping_address, payment_method, notes } = req.body;
        
        if (!shipping_address) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu địa chỉ giao hàng' 
            });
        }
        
        // Lấy giỏ hàng của user
        const [cart] = await connection.query(
            'SELECT * FROM cart WHERE user_id = ?',
            [userId]
        );
        
        if (cart.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Giỏ hàng trống' 
            });
        }
        
        const cartId = cart[0].id;
        
        // Lấy các sản phẩm trong giỏ
        const [cartItems] = await connection.query(`
            SELECT 
                ci.product_id,
                ci.quantity,
                p.name,
                p.price,
                p.stock,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = ?
        `, [cartId]);
        
        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Giỏ hàng trống, không thể đặt hàng' 
            });
        }
        
        // Kiểm tra tồn kho
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `Sản phẩm "${item.name}" chỉ còn ${item.stock} trong kho` 
                });
            }
        }
        
        // Tính tổng tiền
        const totalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        
        // Tạo đơn hàng
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, totalAmount, shipping_address, payment_method || 'cash_on_delivery', notes || '', 'pending']
        );
        
        const orderId = orderResult.insertId;
        
        // Thêm chi tiết đơn hàng
        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
            
            // Trừ số lượng trong kho
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        // Xóa giỏ hàng sau khi đặt hàng thành công
        await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            orderId: orderId,
            totalAmount: totalAmount
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

// Lấy lịch sử đơn hàng của user
exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 10, status = '' } = req.query;
        const offset = (page - 1) * limit;
        
        // Query lấy đơn hàng
        let query = 'SELECT * FROM orders WHERE user_id = ?';
        let params = [userId];
        
        // Lọc theo trạng thái nếu có
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [orders] = await db.query(query, params);
        
        // Đếm tổng số đơn hàng
        let countQuery = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';
        let countParams = [userId];
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        
        const [total] = await db.query(countQuery, countParams);
        
        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].count,
                totalPages: Math.ceil(total[0].count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }
        
        // Lấy chi tiết sản phẩm trong đơn
        const [orderItems] = await db.query(`
            SELECT 
                oi.*,
                p.name,
                p.image_url,
                p.brand
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id]);
        
        res.json({
            success: true,
            data: {
                ...orders[0],
                items: orderItems
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Admin: Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                o.*,
                u.username,
                u.email,
                u.phone
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE 1=1
        `;
        let params = [];
        
        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [orders] = await db.query(query, params);
        
        let countQuery = 'SELECT COUNT(*) as count FROM orders WHERE 1=1';
        let countParams = [];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        
        const [total] = await db.query(countQuery, countParams);
        
        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].count,
                totalPages: Math.ceil(total[0].count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Admin: Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Trạng thái không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}` 
            });
        }
        
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }
        
        await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );
        
        res.json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Admin: Xóa đơn hàng
exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query('DELETE FROM orders WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }
        
        res.json({
            success: true,
            message: 'Xóa đơn hàng thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};
