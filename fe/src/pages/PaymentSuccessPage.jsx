import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('checking');

    const orderId = searchParams.get('orderId');
    const paymentMethod = searchParams.get('method') || 'cod';

    useEffect(() => {
        if (!orderId) {
            setStatus('failed');
            setLoading(false);
            return;
        }

        const fetchOrderStatus = async () => {
            try {
                const response = await axios.get(`/api/payments/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    setOrder(response.data.data);
                    
                    // Kiểm tra trạng thái thanh toán
                    if (response.data.data.paymentStatus === 'completed') {
                        setStatus('success');
                        toast.success('✅ Thanh toán thành công!');
                    } else if (response.data.data.paymentStatus === 'failed') {
                        setStatus('failed');
                        toast.error('❌ Thanh toán thất bại');
                    } else if (paymentMethod === 'cod') {
                        // COD được xác nhận rồi
                        setStatus('success');
                        toast.success('✅ Đơn hàng đã được tạo!');
                    }
                } else {
                    setStatus('failed');
                }
            } catch (error) {
                console.error('Lỗi lấy thông tin đơn hàng:', error);
                setStatus('failed');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderStatus();
    }, [orderId, token, paymentMethod]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Đang xử lý thông tin...</p>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
                    <div className="mb-4">
                        <svg className="w-16 h-16 text-red-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">❌ Thanh Toán Thất Bại</h1>
                    <p className="text-gray-600 mb-6">
                        Có lỗi trong quá trình thanh toán. Vui lòng thử lại.
                    </p>
                    
                    <div className="space-y-3">
                        <Link 
                            to="/checkout"
                            className="block bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                        >
                            Thử Lại
                        </Link>
                        <Link 
                            to="/cart"
                            className="block border border-blue-600 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50"
                        >
                            Quay Lại Giỏ Hàng
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mb-4">
                        <svg className="w-16 h-16 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">✅ Thanh Toán Thành Công!</h1>
                    <p className="text-gray-600">Cảm ơn bạn đã mua hàng</p>
                </div>

                {/* Thông tin đơn hàng */}
                {order && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-500 text-sm">Mã Đơn Hàng</p>
                                <p className="text-xl font-bold text-gray-900">#{order.orderId}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Tổng Tiền</p>
                                <p className="text-xl font-bold text-blue-600">
                                    {order.totalPrice.toLocaleString('vi-VN')} ₫
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Phương Thức Thanh Toán</p>
                                <p className="text-lg font-semibold">
                                    {order.paymentMethod === 'cod' ? '💵 Tiền Mặt' : '🏦 VNPay'}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Trạng Thái Thanh Toán</p>
                                <p className="text-lg font-semibold text-green-600">✓ Hoàn Tất</p>
                            </div>
                        </div>

                        {order.transactionId && (
                            <div className="border-t pt-4">
                                <p className="text-gray-500 text-sm">Mã Giao Dịch</p>
                                <p className="font-mono text-sm text-gray-900">{order.transactionId}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Thông báo tiếp theo */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                    <p className="text-blue-900">
                        📧 Chúng tôi sẽ gửi email xác nhận đơn hàng đến hộp thư của bạn.
                    </p>
                    <p className="text-blue-900 text-sm mt-2">
                        📞 Đội ngũ hỗ trợ sẽ liên hệ với bạn sớm để xác nhận giao hàng.
                    </p>
                </div>

                {/* Nút hành động */}
                <div className="space-y-3">
                    <Link 
                        to="/orders"
                        className="block bg-blue-600 text-white py-3 rounded-lg font-bold text-center hover:bg-blue-700 transition"
                    >
                        📋 Xem Lịch Sử Đơn Hàng
                    </Link>
                    <Link 
                        to="/products"
                        className="block border border-blue-600 text-blue-600 py-3 rounded-lg font-bold text-center hover:bg-blue-50 transition"
                    >
                        🛍️ Tiếp Tục Mua Sắm
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
