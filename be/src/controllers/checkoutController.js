/**
 * Tính giá checkout với shipping fee và discount
 * Logic được chuyển từ CheckoutPage.jsx
 */
exports.calculateCheckout = async (req, res) => {
  try {
    const { cartItems, shippingFee, discountAmount } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }

    // Tính tổng giá của các item được chọn
    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );

    // Đảm bảo discount không vượt quá subtotal + shipping
    const maxDiscount = subtotal + shippingFee;
    const actualDiscount = Math.min(Math.max(discountAmount || 0, 0), maxDiscount);

    // Giá cuối cùng
    const total = subtotal + shippingFee - actualDiscount;

    const priceBreakdown = {
      subtotal,
      shippingFee,
      discountAmount: actualDiscount,
      total: Math.max(0, total),
    };

    res.json({
      success: true,
      data: priceBreakdown
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
