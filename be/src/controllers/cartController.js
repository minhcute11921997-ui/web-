const db = require('../config/db');

exports.getCart = async (req, res) => {
    try {
        console.log('getCart called with userId:', req.user.userId);
        // Lấy hoặc tạo cart cho user
        let [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        console.log('carts found:', carts.length);
        let cartId;
        if (carts.length === 0) {
            const [result] = await db.query('INSERT INTO cart (user_id) VALUES (?)', [req.user.userId]);
            cartId = result.insertId;
            console.log('Created new cart with id:', cartId);
        } else {
            cartId = carts[0].id;
            console.log('Found existing cart with id:', cartId);
        }

        const [items] = await db.query(
            `SELECT ci.id, ci.quantity, p.price, p.name, p.image_url, p.stock
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.cart_id = ?`,
            [cartId]
        );

        console.log('items found:', items.length);
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        res.json({ success: true, data: { items, total } });
    } catch (error) {
        console.error('Lỗi getCart:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.addToCart = async (req, res) => {
    try {
        console.log('=== addToCart called ===');
        console.log('Headers:', req.headers.authorization ? 'Has token' : 'No token');
        console.log('req.user:', req.user);
        console.log('req.body:', req.body);
        
        const { productId, quantity = 1 } = req.body;

        // Validate inputs
        if (!productId) {
            console.error('productId is missing or invalid:', productId);
            return res.status(400).json({ success: false, message: 'Thiếu productId' });
        }

        if (!req.user) {
            console.error('req.user is undefined!');
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        }

        if (!req.user.userId) {
            console.error('userId missing in token. Token contents:', req.user);
            return res.status(401).json({ success: false, message: 'Token không có userId' });
        }

        // Check if product exists
        console.log('Checking product:', productId);
        const [products] = await db.query('SELECT id, stock, price FROM products WHERE id = ?', [productId]);
        console.log('Product query result:', products);
        
        if (!products || products.length === 0) {
            console.log('Product not found');
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        const product = products[0];
        console.log('Product found:', product);
        
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Số lượng tồn kho không đủ' });
        }

        // Lấy hoặc tạo cart cho user
        console.log('Looking for cart with user_id:', req.user.userId);
        let [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        console.log('Carts found:', carts.length);
        
        let cartId;
        if (!carts || carts.length === 0) {
            console.log('Creating new cart for user_id:', req.user.userId);
            try {
                const [result] = await db.query('INSERT INTO cart (user_id) VALUES (?)', [req.user.userId]);
                cartId = result.insertId;
                console.log('Created new cart:', cartId);
            } catch (dbError) {
                console.error('Error creating cart:', dbError.message);
                return res.status(500).json({ success: false, message: 'Lỗi tạo giỏ hàng: ' + dbError.message });
            }
        } else {
            cartId = carts[0].id;
            console.log('Using existing cart:', cartId);
        }

        const [existing] = await db.query(
            'SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, productId]
        );
        console.log('Existing items:', existing ? existing.length : 0);

        if (existing && existing.length > 0) {
            console.log('Updating existing item');
            await db.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?',
                [quantity, cartId, productId]
            );
        } else {
            console.log('Inserting new item to cart_id:', cartId, 'product_id:', productId);
            await db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cartId, productId, quantity]
            );
        }

        console.log('Success!');
        res.json({ success: true, message: 'Thêm vào giỏ hàng thành công!' });
    } catch (error) {
        console.error('=== Lỗi addToCart ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        if (quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
        }

        const [result] = await db.query(
            'UPDATE cart_items SET quantity = ? WHERE id = ?',
            [quantity, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        res.json({ success: true, message: 'Cập nhật giỏ hàng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM cart_items WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        res.json({ success: true, message: 'Xoá sản phẩm khỏi giỏ thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        // Lấy cart_id của user
        const [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        
        if (carts.length > 0) {
            await db.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
        }
        
        res.json({ success: true, message: 'Đã xoá toàn bộ giỏ hàng!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
