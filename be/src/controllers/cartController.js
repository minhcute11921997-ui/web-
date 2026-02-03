const db = require('../config/db');

// Lấy giỏ hàng của user
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Lấy hoặc tạo giỏ hàng
        let [cart] = await db.query(
            'SELECT * FROM cart WHERE user_id = ?',
            [userId]
        );
        
        if (cart.length === 0) {
            // Tạo giỏ hàng mới nếu chưa có
            const [result] = await db.query(
                'INSERT INTO cart (user_id) VALUES (?)',
                [userId]
            );
            const cartId = result.insertId;
            
            return res.json({
                success: true,
                data: {
                    cart_id: cartId,
                    items: [],
                    total: 0
                }
            });
        }
        
        const cartId = cart[0].id;
        
        // Lấy các sản phẩm trong giỏ
        const [items] = await db.query(`
            SELECT 
                ci.id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.stock,
                p.image_url,
                p.brand,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = ?
        `, [cartId]);
        
        // Tính tổng tiền
        const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        
        res.json({
            success: true,
            data: {
                cart_id: cartId,
                items: items,
                total: total
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

// Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { product_id, quantity = 1 } = req.body;
        
        if (!product_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu product_id' 
            });
        }
        
        // Kiểm tra sản phẩm có tồn tại không
        const [product] = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [product_id]
        );
        
        if (product.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm' 
            });
        }
        
        // Kiểm tra số lượng trong kho
        if (product[0].stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Chỉ còn ${product[0].stock} sản phẩm trong kho` 
            });
        }
        
        // Lấy hoặc tạo giỏ hàng
        let [cart] = await db.query(
            'SELECT * FROM cart WHERE user_id = ?',
            [userId]
        );
        
        let cartId;
        if (cart.length === 0) {
            const [result] = await db.query(
                'INSERT INTO cart (user_id) VALUES (?)',
                [userId]
            );
            cartId = result.insertId;
        } else {
            cartId = cart[0].id;
        }
        
        // Kiểm tra sản phẩm đã có trong giỏ chưa
        const [existing] = await db.query(
            'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, product_id]
        );
        
        if (existing.length > 0) {
            // Cập nhật số lượng nếu đã có
            const newQuantity = existing[0].quantity + quantity;
            
            if (product[0].stock < newQuantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Chỉ còn ${product[0].stock} sản phẩm trong kho` 
                });
            }
            
            await db.query(
                'UPDATE cart_items SET quantity = ? WHERE id = ?',
                [newQuantity, existing[0].id]
            );
        } else {
            // Thêm mới nếu chưa có
            await db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cartId, product_id, quantity]
            );
        }
        
        res.status(201).json({
            success: true,
            message: 'Thêm vào giỏ hàng thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Cập nhật số lượng sản phẩm trong giỏ
exports.updateCartItem = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params; // id của cart_item
        const { quantity } = req.body;
        
        if (!quantity || quantity < 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Số lượng phải lớn hơn 0' 
            });
        }
        
        // Kiểm tra cart_item có thuộc về user không
        const [cartItem] = await db.query(`
            SELECT ci.*, c.user_id, p.stock
            FROM cart_items ci
            JOIN cart c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = ?
        `, [id]);
        
        if (cartItem.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm trong giỏ' 
            });
        }
        
        if (cartItem[0].user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Không có quyền truy cập' 
            });
        }
        
        // Kiểm tra số lượng trong kho
        if (cartItem[0].stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Chỉ còn ${cartItem[0].stock} sản phẩm trong kho` 
            });
        }
        
        await db.query(
            'UPDATE cart_items SET quantity = ? WHERE id = ?',
            [quantity, id]
        );
        
        res.json({
            success: true,
            message: 'Cập nhật số lượng thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Xóa sản phẩm khỏi giỏ
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params; // id của cart_item
        
        // Kiểm tra cart_item có thuộc về user không
        const [cartItem] = await db.query(`
            SELECT ci.*, c.user_id
            FROM cart_items ci
            JOIN cart c ON ci.cart_id = c.id
            WHERE ci.id = ?
        `, [id]);
        
        if (cartItem.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm trong giỏ' 
            });
        }
        
        if (cartItem[0].user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Không có quyền truy cập' 
            });
        }
        
        await db.query('DELETE FROM cart_items WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Xóa sản phẩm khỏi giỏ thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [cart] = await db.query(
            'SELECT * FROM cart WHERE user_id = ?',
            [userId]
        );
        
        if (cart.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy giỏ hàng' 
            });
        }
        
        await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
        
        res.json({
            success: true,
            message: 'Xóa toàn bộ giỏ hàng thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};
