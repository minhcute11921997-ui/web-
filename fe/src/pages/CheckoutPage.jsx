import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            const response = await axios.get('/api/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const items = response.data.data?.items || [];
                setCartItems(items);
                calculateTotal(items);
            }
        } catch (error) {
            console.error('Lỗi lấy giỏ hàng:', error);
        }
    };

    const calculateTotal = (items) => {
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setTotalPrice(total);
    };

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            toast.error('Giỏ hàng trống!');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                '/api/payments/create-order',
                {
                    paymentMethod: paymentMethod,
                    clientIp: '127.0.0.1'
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                if (paymentMethod === 'cod') {
                    // COD: Chỉ cần xác nhận
                    toast.success(response.data.message);
                    // Xác nhận COD
                    await confirmCOD(response.data.orderId);
                } else if (paymentMethod === 'vnpay') {
                    // VNPay: Redirect tới VNPay
                    if (response.data.paymentUrl) {
                        window.location.href = response.data.paymentUrl;
                    }
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi tạo đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const confirmCOD = async (orderId) => {
        try {
            const response = await axios.post(
                '/api/payments/confirm-cod',
                { orderId },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                navigate(`/payment-success?orderId=${orderId}&method=cod`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi xác nhận đơn hàng');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <h1 className="text-3xl font-bold mb-8">Thanh Toán</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Giỏ hàng */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <h2 className="text-xl font-bold mb-4">📦 Danh Sách Sản Phẩm</h2>
                            
                            {cartItems.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Giỏ hàng trống</p>
                            ) : (
                                <div className="space-y-4">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between border-b pb-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{item.product_name}</h3>
                                                <p className="text-gray-500 text-sm">SL: {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">
                                                    {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                                                </p>
                                                <p className="text-gray-500 text-sm">
                                                    {item.price.toLocaleString('vi-VN')} ₫/cái
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tóm tắt thanh toán */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                            <h2 className="text-xl font-bold mb-6">Phương Thức Thanh Toán</h2>

                            {/* Tổng tiền */}
                            <div className="mb-8 pb-6 border-b">
                                <div className="flex justify-between mb-2">
                                    <span>Tạm tính:</span>
                                    <span className="font-semibold">
                                        {totalPrice.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span>Phí vận chuyển:</span>
                                    <span className="font-semibold text-green-600">Miễn phí</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-2">
                                    <span>Tổng:</span>
                                    <span className="text-blue-600">
                                        {totalPrice.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                            </div>

                            {/* Lựa chọn phương thức */}
                            <div className="space-y-3 mb-6">
                                {/* COD */}
                                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                                    style={{borderColor: paymentMethod === 'cod' ? '#3b82f6' : '#e5e7eb',
                                            backgroundColor: paymentMethod === 'cod' ? '#eff6ff' : 'transparent'}}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-4 h-4"
                                    />
                                    <div className="ml-3">
                                        <p className="font-semibold">💵 Tiền Mặt</p>
                                        <p className="text-sm text-gray-500">Thanh toán khi nhận hàng</p>
                                    </div>
                                </label>

                                {/* VNPay */}
                                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                                    style={{borderColor: paymentMethod === 'vnpay' ? '#3b82f6' : '#e5e7eb',
                                            backgroundColor: paymentMethod === 'vnpay' ? '#eff6ff' : 'transparent'}}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="vnpay"
                                        checked={paymentMethod === 'vnpay'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-4 h-4"
                                    />
                                    <div className="ml-3">
                                        <p className="font-semibold">🏦 VNPay</p>
                                        <p className="text-sm text-gray-500">Thẻ ngân hàng, ví điện tử</p>
                                    </div>
                                </label>
                            </div>

                            {/* Nút thanh toán */}
                            <button
                                onClick={handleCheckout}
                                disabled={loading || cartItems.length === 0}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition"
                            >
                                {loading ? '⏳ Đang xử lý...' : '✓ Thanh Toán Ngay'}
                            </button>

                            <button
                                onClick={() => navigate('/cart')}
                                className="w-full mt-3 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                                ← Quay Lại Giỏ Hàng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
