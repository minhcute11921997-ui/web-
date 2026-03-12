import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sản phẩm
        const res = await fetch(`http://localhost:3000/api/products/${id}`);
        const data = await res.json();
        if (data.success) setProduct(data.data);

        // Fetch thông số kỹ thuật
        const specRes = await fetch(`http://localhost:3000/api/products/${id}/specs`);
        const specData = await specRes.json();
        if (specData.success) setSpecs(specData.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-500">Đang tải...</div>;
  if (!product) return <div className="flex justify-center items-center min-h-screen text-gray-500">Không tìm thấy sản phẩm</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6 flex gap-1 items-center">
        <span className="cursor-pointer hover:text-red-500" onClick={() => navigate('/')}>Trang chủ</span>
        <span>/</span>
        <span className="cursor-pointer hover:text-red-500" onClick={() => navigate(`/?category=${product.category_id}`)}>{product.category_name}</span>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{product.name}</span>
      </div>

      {/* Main */}
      <div className="bg-white rounded-2xl shadow-md p-8 grid grid-cols-1 md:grid-cols-2 gap-10 mb-6">
        {/* Ảnh */}
        <div className="bg-gray-50 rounded-xl overflow-hidden aspect-square">
          <img
            src={product.image_url?.startsWith('http') ? product.image_url : `/images/${product.image_url}`}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.target.src = 'https://placehold.co/400x400?text=No+Image')}
          />
        </div>

        {/* Thông tin */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{product.brand}</span>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
          <div className="text-3xl font-bold text-red-500">{formatPrice(product.price)}</div>

          <span className={`text-sm font-medium px-3 py-1 rounded-full w-fit
            ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
          </span>

          {/* Số lượng */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Số lượng:</span>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-lg transition"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <button className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-lg transition"
                onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-2">
            <button disabled={product.stock === 0}
              className="flex-1 py-3 rounded-xl border-2 border-orange-500 text-orange-500 font-semibold hover:bg-orange-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
              🛒 Thêm vào giỏ
            </button>
            <button disabled={product.stock === 0}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
              Mua ngay
            </button>
          </div>
        </div>
      </div>

      {/* ✅ BẢNG THÔNG SỐ KỸ THUẬT */}
      {specs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Thông số kỹ thuật</h2>
          <table className="w-full text-sm">
            <tbody>
              {specs.map((spec, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-4 font-medium text-gray-600 w-1/3 border-b border-gray-100">
                    {spec.spec_name}
                  </td>
                  <td className="py-3 px-4 text-gray-900 border-b border-gray-100">
                    {spec.spec_value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default ProductDetail;
