import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { createOrder } from '../api/orderApi';
import { toast } from 'react-toastify';

const CartPage = () => {
  const { items, loading, fetchCart, updateItem, removeItem, clearAll } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, []);

  const totalPrice = items.reduce((sum, item) => 
    sum + Number(item.price) * item.quantity, 0
  );

  const handleOrder = async () => {
    if (items.length === 0) return;
    try {
      await createOrder({ items });
      await clearAll();
      toast.success('Đặt hàng thành công!');
      navigate('/orders');
    } catch {
      toast.error('Đặt hàng thất bại, vui lòng thử lại!');
    }
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    if (window.confirm('Bạn chắc chắn muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
      clearAll();
      toast.info('Đã xóa tất cả sản phẩm');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen text-gray-400">
      <p className="text-center text-lg">Đang tải giỏ hàng...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn</h1>
          <p className="text-gray-500">{items.length} sản phẩm</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-500 text-lg mb-6">Giỏ hàng đang trống</p>
            <button 
              onClick={() => navigate('/products')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              ← Tiếp tục mua sắm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="space-y-4">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition bg-gray-50"
                    >
                      {/* Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={item.image_url || 'https://placehold.co/100x100?text=No+Image'}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg bg-white"
                          onError={(e) => (e.target.src = 'https://placehold.co/100x100?text=No+Image')}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">{item.name}</h3>
                        <p className="text-blue-600 font-bold text-lg">
                          {Number(item.price).toLocaleString('vi-VN')}₫
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                        <button
                          onClick={() => updateItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >−</button>
                        <span className="w-12 text-center font-semibold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                        >+</button>
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-lg">
                          {(Number(item.price) * item.quantity).toLocaleString('vi-VN')}₫
                        </p>
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Clear All Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleClearAll}
                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg transition font-semibold"
                  >
                    🗑️ Xóa tất cả sản phẩm
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-4 h-fit">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính:</span>
                    <span className="font-semibold text-gray-900">
                      {totalPrice.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold text-green-600">Miễn phí</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Giảm giá:</span>
                    <span className="font-semibold text-gray-900">0₫</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Tổng cộng:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {totalPrice.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/checkout')}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    💳 Tiến hành thanh toán
                  </button>
                  <button
                    onClick={() => navigate('/products')}
                    className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
                  >
                    ← Tiếp tục mua sắm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
