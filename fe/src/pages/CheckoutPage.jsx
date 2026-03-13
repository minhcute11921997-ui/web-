import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { discountApi } from '../api/discountApi';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const { items, loading: cartLoading, fetchCart, selectedItems } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [discountCode, setDiscountCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    
    // Delivery info
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    const [shippingFee, setShippingFee] = useState(0);

    const calculateShippingFee = (address) => {
        if (!address) {
            setShippingFee(0);
            return;
        }
        
        // Check if address contains Hà Nội, Ha Noi, HN, Hanoi
        const hanoi = ['hà nội', 'ha noi', 'hn', 'hanoi', 'hànội'];
        const isHanoi = hanoi.some(city => address.toLowerCase().includes(city));
        
        if (isHanoi) {
            setShippingFee(50000);
        } else {
            setShippingFee(100000);
        }
    };

    useEffect(() => {
        if (token) {
            fetchCart();
        }
    }, [token]);

    // Only include selected items
    const cartItems = items.filter(item => selectedItems.includes(item.id));
    const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) {
            toast.warning('Vui lòng nhập mã giảm giá');
            return;
        }
        
        try {
            const response = await discountApi.validateDiscount(
                discountCode.toUpperCase(), 
                totalPrice
            );
            
            const { data } = response.data;
            const discountValue = Number(data.discountAmount) || 0;
            setDiscountAmount(discountValue);
            toast.success(`Áp dụng thành công! ${data.description}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
            setDiscountAmount(0);
        }
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
                    clientIp: '127.0.0.1',
                    cartItemIds: cartItems.map(item => item.id)
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

                {!token ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <p className="text-gray-500 text-lg mb-6">Vui lòng đăng nhập để thanh toán</p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                            Đăng nhập
                        </button>
                    </div>
                ) : cartLoading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <p className="text-gray-400 text-lg">Đang tải giỏ hàng...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Giỏ hàng */}
                        <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Danh Sách Sản Phẩm</h2>
                            </div>
                            
                            {cartItems.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Giỏ hàng trống</p>
                            ) : (
                                <div className="space-y-4">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="flex gap-4 border-b pb-4 items-start">
                                            
                                            {/* Product Image */}
                                            <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                                                <img 
                                                    src={item.image_url || 'https://via.placeholder.com/100'} 
                                                    alt={item.product_name || item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            
                                            {/* Product Info */}
                                            <div className="flex-1 flex justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{item.product_name || item.name}</h3>
                                                    <p className="text-gray-500 text-sm mt-1">SL: {item.quantity}</p>
                                                    <p className="text-blue-600 font-semibold mt-2">
                                                        {item.price.toLocaleString('vi-VN')} ₫/cái
                                                    </p>
                                                </div>
                                                
                                                {/* Total Price */}
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">
                                                        {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Delivery Information Form */}
                        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                            <h2 className="text-xl font-bold mb-6">Thông tin giao hàng</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tên người nhận</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Nhập tên người nhận"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Nhập số điện thoại"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Địa chỉ giao hàng</label>
                                    <textarea
                                        value={customerAddress}
                                        onChange={(e) => {
                                            setCustomerAddress(e.target.value);
                                            calculateShippingFee(e.target.value);
                                        }}
                                        placeholder="Nhập địa chỉ giao hàng"
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú đơn hàng</label>
                                    <textarea
                                        value={customerNotes}
                                        onChange={(e) => setCustomerNotes(e.target.value)}
                                        placeholder="Nhập ghi chú (tuỳ chọn)"
                                        rows="2"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tóm tắt thanh toán */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                            <h2 className="text-xl font-bold mb-6">Phương Thức Thanh Toán</h2>

                            {/* Discount Code Input */}
                            <div className="mb-6 pb-6 border-b border-gray-200">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mã giảm giá</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={discountCode}
                                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                        placeholder="Nhập mã giảm giá"
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button
                                        onClick={handleApplyDiscount}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                                    >
                                        Áp dụng
                                    </button>
                                </div>
                            </div>

                            {/* Thành tiền */}
                            <div className="mb-6 pb-6 border-b border-gray-200">
                                <div className="flex justify-between mb-3">
                                    <span className="text-gray-600">Tạm tính:</span>
                                    <span className="font-semibold">
                                        {Number(totalPrice).toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                                <div className="flex justify-between mb-3">
                                    <span className="text-gray-600">Phí vận chuyển:</span>
                                    <span className="font-semibold">
                                        {shippingFee === 0 ? 'Chưa xác định' : `${Number(shippingFee).toLocaleString('vi-VN')} ₫`}
                                    </span>
                                </div>
                                {Number(discountAmount) > 0 && (
                                    <div className="flex justify-between mb-3">
                                        <span className = "text-gray-600">Giảm giá:</span>
                                        <span className="font-semibold">-{Number(discountAmount).toLocaleString('vi-VN')}₫</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                                    <span>Thành tiền:</span>
                                    <span className="text-blue-600">
                                        {(Number(totalPrice) + Number(shippingFee) - Number(discountAmount)).toLocaleString('vi-VN')} ₫
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
                                        <p className="font-semibold">Tiền Mặt</p>
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
                                        <p className="font-semibold">VNPay</p>
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
                                {loading ? 'Đang xử lý...' : 'Thanh Toán Ngay'}
                            </button>

                            <button
                                onClick={() => navigate('/cart')}
                                className="w-full mt-3 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                                Quay Lại Giỏ Hàng
                            </button>
                        </div>
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;
