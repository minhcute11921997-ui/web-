const db = require('../config/db');

const STATUS_LABEL = {
  pending:    'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped:    'Đang giao',    
  delivered:  'Đã giao',
  cancelled:  'Đã hủy',
};

// Helper — thêm status_label vào mỗi order
const formatOrder = (order) => ({
  ...order,
  status_label: STATUS_LABEL[order.status] || order.status,
});

exports.createOrder = async (req, res) => {
  try {
    const { shipping_address } = req.body;
    if (!shipping_address) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ giao hàng' });
    }

    // Lấy cart_id của user
    const [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
    if (carts.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }
    const cartId = carts[0].id;

    const [items] = await db.query(
      'SELECT ci.*, p.price, p.stock, p.name FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?',
      [cartId]
    );

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    for (const item of items) {
      if (item.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${item.name}" không đủ hàng trong kho`
        });
      }
    }

    const total_price = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const [order] = await db.query(
      'INSERT INTO orders (user_id, total_price, shipping_address, status) VALUES (?, ?, ?, ?)',
      [req.user.userId, total_price, shipping_address, 'pending']
    );

    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [order.insertId, item.product_id, item.quantity, item.price]
      );
      await db.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    res.status(201).json({ success: true, message: 'Đặt hàng thành công!', orderId: order.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    // ✅ map formatOrder vào từng order
    res.json({ success: true, data: orders.map(formatOrder) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[0];
    if (order.user_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này' });
    }

    const [orderItems] = await db.query(
      'SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [req.params.id]
    );

    // ✅ map formatOrder vào order
    res.json({ success: true, data: { ...formatOrder(order), items: orderItems } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.username, u.email, u.full_name 
       FROM orders o JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC`
    );
    // ✅ map formatOrder vào từng order
    res.json({ success: true, data: orders.map(formatOrder) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatus = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']; // ✅ fix 'shipping' → 'shipped'
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    res.json({ success: true, message: 'Cập nhật trạng thái thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    res.json({ success: true, message: 'Xoá đơn hàng thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
