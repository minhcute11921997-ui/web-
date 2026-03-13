import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const ProductCard = ({ product }) => {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = async (e) => {
    e.preventDefault(); // ← ngăn Link bị trigger khi click nút
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addItem(product.id, 1);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (error) {
      console.error('Add to cart error:', error);
      const errorMsg = error?.message || 'Có lỗi xảy ra!';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="border rounded-xl shadow hover:shadow-md transition bg-white overflow-hidden">

      {/* ✅ Toàn bộ phần trên là link */}
      <Link to={`/products/${product.id}`} className="block p-4 cursor-pointer">
        <div className="w-full aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden">
          <img
            src={product.image_url || 'https://placehold.co/300x200?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h3 className="font-semibold text-base mb-1 line-clamp-2 text-gray-900 hover:text-blue-600 transition">
          {product.name}
        </h3>
        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{product.description}</p>
        <p className="text-blue-600 font-bold text-lg">
          {Number(product.price).toLocaleString('vi-VN')}₫
        </p>
        <p className="text-gray-400 text-xs mb-3">Còn {product.stock} sản phẩm</p>
      </Link>

      {/* ✅ Nút nằm ngoài Link */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>

    </div>
  );
};

export default ProductCard;
