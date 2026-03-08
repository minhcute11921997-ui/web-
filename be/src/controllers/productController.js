const db = require('../config/db');

exports.getAllProducts = async (req, res) => {
    try {
        const { search, category } = req.query;

        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND p.name LIKE ?';
            params.push(`%${search}%`);
        }
        if (category) {
            query += ' AND p.category_id = ?';
            params.push(category);
        }

        query += ' ORDER BY p.id DESC';

        const [products] = await db.query(query, params);

        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        // Lấy thêm thông số kỹ thuật
        const [specs] = await db.query(
            'SELECT spec_name, spec_value FROM product_specifications WHERE product_id = ? ORDER BY id ASC',
            [req.params.id]
        );

        res.json({ success: true, data: { ...products[0], specifications: specs } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};


exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, image_url, category_id } = req.body;
        if (!name || !price || !category_id) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (tên, giá, danh mục)' });
        }
        const [result] = await db.query(
            'INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, image_url, category_id]
        );
        res.status(201).json({ success: true, message: 'Tạo sản phẩm thành công!', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { name, description, price, stock, image_url, category_id } = req.body;
        const [result] = await db.query(
            'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ? WHERE id = ?',
            [name, description, price, stock, image_url, category_id, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }
        res.json({ success: true, message: 'Xoá sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
