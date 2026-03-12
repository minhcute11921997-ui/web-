import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllProducts } from '../api/productApi';
import { getAllCategories } from '../api/categoryApi';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const ITEMS_PER_PAGE = 12;

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const addItem = useCartStore(state => state.addItem);
  const token = useAuthStore(state => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    getAllCategories()
      .then(res => { if (res.data.success) setCategories(res.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    const params = activeCategory === 'all' ? {} : { category: activeCategory };

    getAllProducts(params)
      .then(res => {
        if (res.data.success) setProducts(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory]);

  const handleAddToCart = async (product) => {
    if (!token) {
      toast.warning('Vui lòng đăng nhập để thêm giỏ hàng!');
      navigate('/login');
      return;
    }
    try {
      await addItem(product.id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch {
      toast.error('Thêm giỏ hàng thất bại!');
    }
  };

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4">
      {/* Tabs danh mục */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tất cả
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📦</div>
          <p>Không có sản phẩm nào</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {currentProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition">
                
                {/* ✅ Bọc ảnh + tên + giá trong Link */}
                <Link to={`/products/${product.id}`} className="block p-3">
                  <img
                    src={product.image_url || 'https://via.placeholder.com/200'}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg mb-2 hover:opacity-90 transition"
                  />
                  <h3 className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition">
                    {product.name}
                  </h3>
                  <p className="text-blue-600 font-bold mt-1">
                    {Number(product.price).toLocaleString('vi-VN')}₫
                  </p>
                </Link>

                {/* ✅ Nút nằm ngoài Link */}
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700"
                  >
                    Thêm giỏ hàng
                  </button>
                </div>

              </div>
            ))}

          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sau →
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-2">
            Trang {currentPage}/{totalPages} • {products.length} sản phẩm
          </p>
        </>
      )}
    </div>
  );
}
