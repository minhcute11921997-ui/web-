/**
 * Tính phí vận chuyển dựa trên địa chỉ giao hàng
 * Logic được chuyển từ CheckoutPage.jsx
 */
exports.calculateShipping = async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ' });
    }

    // Tính phí vận chuyển dựa trên địa chỉ
    const hanoiKeywords = ['hà nội', 'ha noi', 'hn', 'hanoi', 'hànội'];
    const isHanoi = hanoiKeywords.some(keyword =>
      address.toLowerCase().includes(keyword)
    );
    const shippingFee = isHanoi ? 50000 : 100000;

    res.json({
      success: true,
      data: {
        address,
        shippingFee,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
