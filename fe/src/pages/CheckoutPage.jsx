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

    // Thông tin giao hàng
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    const [shippingFee, setShippingFee] = useState(0);

    const calculateShippingFee = (address) => {
        if (!address.trim()) { setShippingFee(0); return; }
        const hanoi = ['hà nội', 'ha noi', 'hn', 'hanoi', 'hànội'];
        const isHanoi = hanoi.some(c => address.toLowerCase().includes(c));
        setShippingFee(isHanoi ? 50000 : 100000);
    };

    useEffect(() => {
        if (token) fetchCart();
    }, [token]);

    const cartItems = items.filter(item => selectedItems.includes(item.id));
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) { toast.warning('Vui lòng nhập mã giảm giá'); return; }
        try {
            const response = await discountApi.validateDiscount(discountCode.toUpperCase(), subtotal);
            const { data } = response.data;
            const val = Number(data.discountAmount) || 0;
            setDiscountAmount(val);
            toast.success(`Áp dụng thành công! ${data.description}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
            setDiscountAmount(0);
        }
    };

    const handleCheckout = async () => {
        if (cartItems.length === 0) { toast.error('Giỏ hàng trống!'); return; }
        if (!customerName.trim()) { toast.error('Vui lòng nhập tên người nhận!'); return; }
        if (!customerPhone.trim()) { toast.error('Vui lòng nhập số điện thoại!'); return; }
        if (!customerAddress.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng!'); return; }
        if (shippingFee === 0) { toast.error('Vui lòng nhập địa chỉ để tính phí vận chuyển!'); return; }

        setLoading(true);
        try {
            const response = await axios.post(
                '/api/payments/create-order',
                {
                    paymentMethod,
                    clientIp: '127.0.0.1',
                    cartItemIds: cartItems.map(item => item.id),
                    customerName,
                    customerPhone,
                    customerAddress,
                    customerNotes,
                    shippingFee,
                    discountAmount
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                if (paymentMethod === 'cod') {
                    toast.success('Đặt hàng thành công!');
                    navigate(`/payment-success?orderId=${response.data.orderId}&method=cod`);
                } else if (paymentMethod === 'vnpay') {
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

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <h1 className="text-3xl font-bold mb-8">Thanh Toán</h1>

                {!token ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <p className="text-gray-500 text-lg mb-6">Vui lòng đăng nhập để thanh toán</p>
                        <button onClick={() => navigate('/login')}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                            Đăng nhập
                        </button>
                    </div>
                ) : cartLoading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <p className="text-gray-400 text-lg">Đang tải giỏ hàng...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cột trái */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Danh sách sản phẩm */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold mb-6">Danh Sách Sản Phẩm</h2>
                                {cartItems.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">Chưa chọn sản phẩm nào</p>
                                ) : (
                                    <div className="space-y-4">
                                        {cartItems.map(item => (
                                            <div key={item.id} className="flex gap-4 border-b pb-4 items-start">
                                                <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                                                    <img src={item.image_url || 'https://via.placeholder.com/100'}
                                                        alt={item.product_name || item.name}
                                                        className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 flex justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{item.product_name || item.name}</h3>
                                                        <p className="text-gray-500 text-sm mt-1">SL: {item.quantity}</p>
                                                        <p className="text-blue-600 font-semibold mt-2">{Number(item.price).toLocaleString('vi-VN')} ₫/cái</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg">{(item.price * item.quantity).toLocaleString('vi-VN')} ₫</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Thông tin giao hàng */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold mb-6">Thông Tin Giao Hàng</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Tên người nhận <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder="Nhập tên người nhận"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Số điện thoại <span className="text-red-500">*</span>
                                        </label>
                                        <input type="tel" value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            placeholder="Nhập số điện thoại"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Địa chỉ giao hàng <span className="text-red-500">*</span>
                                        </label>
                                        <textarea value={customerAddress}
                                            onChange={e => { setCustomerAddress(e.target.value); calculateShippingFee(e.target.value); }}
                                            placeholder="Nhập địa chỉ giao hàng (VD: 123 Lê Lợi, Hà Nội)"
                                            rows="3"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                        {shippingFee > 0 && (
                                            <p className="text-sm text-blue-700 mt-1">
                                                 Phí vận chuyển: <strong>{shippingFee.toLocaleString('vi-VN')} ₫</strong>
                                                {shippingFee === 50000 ? ' (Nội thành Hà Nội)' : ' (Tỉnh thành khác)'}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú đơn hàng</label>
                                        <textarea value={customerNotes}
                                            onChange={e => setCustomerNotes(e.target.value)}
                                            placeholder="Nhập ghi chú (tuỳ chọn)"
                                            rows="2"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải - Tóm tắt thanh toán */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                                <h2 className="text-xl font-bold mb-6">Phương Thức Thanh Toán</h2>

                                {/* Mã giảm giá */}
                                <div className="mb-6 pb-6 border-b border-gray-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mã giảm giá</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={discountCode}
                                            onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                                            placeholder="Nhập mã giảm giá"
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                        <button onClick={handleApplyDiscount}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                                            Áp dụng
                                        </button>
                                    </div>
                                </div>

                                {/* Chi tiết giá */}
                                <div className="mb-6 pb-6 border-b border-gray-200 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tạm tính:</span>
                                        <span className="font-semibold">{subtotal.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Phí vận chuyển:</span>
                                        <span className="font-semibold">
                                            {shippingFee === 0 ? 'Chưa xác định' : `${shippingFee.toLocaleString('vi-VN')} ₫`}
                                        </span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600" >Giảm giá:</span>
                                            <span className="font-semibold">-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                                        <span>Thành tiền:</span>
                                        <span className="text-blue-600">{finalTotal.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                </div>

                                {/* Phương thức */}
                                <div className="space-y-3 mb-6">
                                    <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                                        style={{ borderColor: paymentMethod === 'cod' ? '#3b82f6' : '#e5e7eb', backgroundColor: paymentMethod === 'cod' ? '#eff6ff' : 'transparent' }}>
                                        <input type="radio" name="payment" value="cod"
                                            checked={paymentMethod === 'cod'}
                                            onChange={e => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4" />
                                        <div className="ml-3">
                                            <p className="font-semibold"> Tiền Mặt</p>
                                            <p className="text-sm text-gray-500">Thanh toán khi nhận hàng</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                                        style={{ borderColor: paymentMethod === 'vnpay' ? '#3b82f6' : '#e5e7eb', backgroundColor: paymentMethod === 'vnpay' ? '#eff6ff' : 'transparent' }}>
                                        <input type="radio" name="payment" value="vnpay"
                                            checked={paymentMethod === 'vnpay'}
                                            onChange={e => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4" />
                                        <div className="ml-3">
                                            <p className="font-semibold"> VNPay</p>
                                            <p className="text-sm text-gray-500">Thẻ ngân hàng, ví điện tử</p>
                                        </div>
                                    </label>
                                </div>

                                <button onClick={handleCheckout}
                                    disabled={loading || cartItems.length === 0}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition">
                                    {loading ? 'Đang xử lý...' : 'Thanh Toán Ngay'}
                                </button>
                                <button onClick={() => navigate('/cart')}
                                    className="w-full mt-3 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
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
