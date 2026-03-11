import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

const ITEMS_PER_PAGE = 12;
const MIN_PRICE = 0;
const MAX_PRICE = 50000000;
const PRICE_STEP = 500000;

const SORT_OPTIONS = [
  { label: 'Mới nhất', value: 'id-DESC' },
  { label: 'Giá thấp → cao', value: 'price-ASC' },
  { label: 'Giá cao → thấp', value: 'price-DESC' },
  { label: 'Tên A → Z', value: 'name-ASC' },
  { label: 'Tên Z → A', value: 'name-DESC' },
];

const SLIDES = [
  {
    id: 1,
    title: '🔥 Siêu sale linh kiện PC',
    subtitle: 'Giảm đến 30% cho CPU & VGA',
    bg: 'from-blue-600 to-blue-800',
    accent: '💻',
  },
  {
    id: 2,
    title: '⚡ RAM DDR5 giá sốc',
    subtitle: 'Nâng cấp hiệu năng vượt trội',
    bg: 'from-purple-600 to-indigo-800',
    accent: '🚀',
  },
  {
    id: 3,
    title: '🎮 VGA RTX 40 Series',
    subtitle: 'Trải nghiệm gaming đỉnh cao',
    bg: 'from-green-600 to-teal-800',
    accent: '🎯',
  },
  {
    id: 4,
    title: '💾 SSD NVMe Gen4/Gen5',
    subtitle: 'Tốc độ đọc ghi siêu nhanh',
    bg: 'from-orange-500 to-red-700',
    accent: '⚡',
  },
  {
    id: 5,
    title: '🛒 Miễn phí vận chuyển',
    subtitle: 'Cho đơn hàng từ 500K toàn quốc',
    bg: 'from-pink-500 to-rose-700',
    accent: '🚚',
  },
];

const formatPrice = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + ' tr';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
  return v.toString();
};

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeBrand, setActiveBrand] = useState('all');
  const [priceMin, setPriceMin] = useState(MIN_PRICE);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  const [sortOption, setSortOption] = useState('id-DESC');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryBrandsMap, setCategoryBrandsMap] = useState({});
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [activeSubFilters, setActiveSubFilters] = useState({});
  const [slideIndex, setSlideIndex] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const slideInterval = useRef(null);

  // Auto-slide banner
  useEffect(() => {
    if (slidePaused) return;
    slideInterval.current = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(slideInterval.current);
  }, [slidePaused]); // { series: 'Core i5', socket: 'LGA1700' }

  // Lấy danh mục
  useEffect(() => {
    fetch('http://localhost:3000/api/categories')
      .then(res => res.json())
      .then(data => { if (data.success) setCategories(data.data); });
  }, []);

  // Fetch filter data cho 1 category (brands + specs, có cache)
  const [categoryFiltersMap, setCategoryFiltersMap] = useState({}); // { catId: { brands: [], specs: {} } }
  const fetchCategoryData = (catId) => {
    const key = catId || 'all';
    if (categoryBrandsMap[key]) return;
    if (key === 'all') {
      // 'Tất cả' - chỉ lấy brands từ products
      fetch('http://localhost:3000/api/products?sortBy=id&sortOrder=DESC')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const uniqueBrands = [...new Set(data.data.map(p => p.brand).filter(Boolean))].sort();
            setCategoryBrandsMap(prev => ({ ...prev, all: uniqueBrands }));
          }
        });
    } else {
      // Danh mục cụ thể - lấy brands + specs từ API filters
      fetch(`http://localhost:3000/api/products/filters/${catId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCategoryBrandsMap(prev => ({ ...prev, [catId]: data.data.brands }));
            setCategoryFiltersMap(prev => ({ ...prev, [catId]: data.data.specs }));
          }
        });
    }
  };

  // Hover handlers
  const handleCategoryMouseEnter = (catId) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredCategory(catId);
    fetchCategoryData(catId);
  };
  const handleCategoryMouseLeave = () => {
    const t = setTimeout(() => setHoveredCategory(null), 200);
    setHoverTimeout(t);
  };
  const handleDropdownMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
  };
  const handleDropdownMouseLeave = () => {
    setHoveredCategory(null);
  };

  const handleSelectBrand = (catId, brand) => {
    setActiveCategory(catId);
    setActiveBrand(brand);
    setActiveSubFilters({});
    setHoveredCategory(null);
  };
  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setActiveBrand('all');
    setActiveSubFilters({});
    setHoveredCategory(null);
  };

  // Toggle sub-filter (chọn từ dropdown)
  const toggleSubFilter = (catId, key, value) => {
    setActiveCategory(catId);
    setActiveSubFilters(prev => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setCurrentPage(1);
    setHoveredCategory(null);
  };

  // Debounce cho thanh trượt giá
  const [debouncedMin, setDebouncedMin] = useState(MIN_PRICE);
  const [debouncedMax, setDebouncedMax] = useState(MAX_PRICE);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMin(priceMin);
      setDebouncedMax(priceMax);
    }, 400);
    return () => clearTimeout(timer);
  }, [priceMin, priceMax]);

  // Fetch sản phẩm
  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);

    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.append('category', activeCategory);
    if (activeBrand !== 'all') params.append('brand', activeBrand);
    if (debouncedMin > MIN_PRICE) params.append('minPrice', debouncedMin);
    if (debouncedMax < MAX_PRICE) params.append('maxPrice', debouncedMax);

    // Gửi specs filter lên server
    if (Object.keys(activeSubFilters).length > 0) {
      params.append('specs', JSON.stringify(activeSubFilters));
    }

    const [sortBy, sortOrder] = sortOption.split('-');
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    fetch(`http://localhost:3000/api/products?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory, activeBrand, debouncedMin, debouncedMax, sortOption, activeSubFilters]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4">
      {/* Tabs danh mục với dropdown hãng */}
      <div className="flex gap-2 flex-wrap mb-4 relative sticky top-0 z-40 bg-white py-3 -mx-4 px-4 shadow-sm">
        {/* Nút Tất cả */}
        <div
          className="relative"
          onMouseEnter={() => handleCategoryMouseEnter('all')}
          onMouseLeave={handleCategoryMouseLeave}
        >
          <button
            onClick={() => handleSelectCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ▾
          </button>
          {hoveredCategory === 'all' && (
            <div
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
              className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 min-w-[200px] max-h-[400px] overflow-y-auto animate-fadeIn"
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hãng sản xuất</div>
              <button
                onClick={() => handleSelectBrand('all', 'all')}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  activeCategory === 'all' && activeBrand === 'all'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                Tất cả hãng
              </button>
              {(categoryBrandsMap['all'] || []).map(brand => (
                <button
                  key={brand}
                  onClick={() => handleSelectBrand('all', brand)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeCategory === 'all' && activeBrand === brand
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {brand}
                </button>
              ))}
              {!categoryBrandsMap['all'] && (
                <div className="px-4 py-2 text-xs text-gray-400">Đang tải...</div>
              )}
            </div>
          )}
        </div>

        {/* Các nút danh mục */}
        {categories.map(cat => (
          <div
            key={cat.id}
            className="relative"
            onMouseEnter={() => handleCategoryMouseEnter(cat.id)}
            onMouseLeave={handleCategoryMouseLeave}
          >
            <button
              onClick={() => handleSelectCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name} ▾
            </button>
            {hoveredCategory === cat.id && (
              <div
                onMouseEnter={handleDropdownMouseEnter}
                onMouseLeave={handleDropdownMouseLeave}
                className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 min-w-[220px] max-h-[450px] overflow-y-auto animate-fadeIn"
              >
                {/* Hãng sản xuất */}
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hãng sản xuất</div>
                <button
                  onClick={() => handleSelectBrand(cat.id, 'all')}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeCategory === cat.id && activeBrand === 'all'
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  Tất cả {cat.name}
                </button>
                {(categoryBrandsMap[cat.id] || []).map(brand => (
                  <button
                    key={brand}
                    onClick={() => handleSelectBrand(cat.id, brand)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeCategory === cat.id && activeBrand === brand
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {brand}
                  </button>
                ))}

                {/* Sub-filters từ DB (dynamic) */}
                {(() => {
                  const specs = categoryFiltersMap[cat.id];
                  if (!specs) return null;
                  return Object.entries(specs).map(([specName, values]) => (
                    <div key={specName}>
                      <div className="border-t border-gray-100 my-1" />
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{specName}</div>
                      {values.map(v => (
                        <button
                          key={v.value}
                          onClick={() => toggleSubFilter(cat.id, specName, v.value)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            activeCategory === cat.id && activeSubFilters[specName] === v.value
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          {v.value} <span className="text-gray-400 text-xs">({v.count})</span>
                        </button>
                      ))}
                    </div>
                  ));
                })()}

                {!categoryBrandsMap[cat.id] && (
                  <div className="px-4 py-2 text-xs text-gray-400">Đang tải...</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Banner Slider */}
      <div
        className="relative mb-5 rounded-2xl overflow-hidden select-none"
        onMouseEnter={() => setSlidePaused(true)}
        onMouseLeave={() => setSlidePaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          {SLIDES.map(slide => (
            <div
              key={slide.id}
              className={`w-full flex-shrink-0 bg-gradient-to-r ${slide.bg} px-8 py-10 md:py-14 flex items-center justify-between`}
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow">
                  {slide.title}
                </h2>
                <p className="text-white/80 text-sm md:text-base">{slide.subtitle}</p>
              </div>
              <span className="text-5xl md:text-7xl opacity-80 drop-shadow-lg">{slide.accent}</span>
            </div>
          ))}
        </div>

        {/* Nút prev/next */}
        <button
          onClick={() => setSlideIndex(prev => (prev - 1 + SLIDES.length) % SLIDES.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          ‹
        </button>
        <button
          onClick={() => setSlideIndex(prev => (prev + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          ›
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slideIndex
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bộ lọc giá (thanh trượt) + Sắp xếp */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        {/* Thanh trượt giá */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Khoảng giá:</span>
            <span className="text-sm font-semibold text-blue-600">
              {formatPrice(priceMin)} — {formatPrice(priceMax)}
            </span>
          </div>
          <div className="relative h-6 flex items-center">
            {/* Track background */}
            <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
            {/* Active range */}
            <div
              className="absolute h-1.5 bg-blue-500 rounded-full"
              style={{
                left: `${((priceMin - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
                right: `${100 - ((priceMax - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
              }}
            />
            {/* Min slider */}
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={PRICE_STEP}
              value={priceMin}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val <= priceMax - PRICE_STEP) setPriceMin(val);
              }}
              className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
            />
            {/* Max slider */}
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={PRICE_STEP}
              value={priceMax}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= priceMin + PRICE_STEP) setPriceMax(val);
              }}
              className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
            />
          </div>
          {/* Nút giá nhanh */}
          <div className="flex gap-1.5 mt-2">
            {[
              { label: 'Tất cả', min: MIN_PRICE, max: MAX_PRICE },
              { label: '< 2tr', min: MIN_PRICE, max: 2000000 },
              { label: '2-5tr', min: 2000000, max: 5000000 },
              { label: '5-10tr', min: 5000000, max: 10000000 },
              { label: '10-20tr', min: 10000000, max: 20000000 },
              { label: '> 20tr', min: 20000000, max: MAX_PRICE },
            ].map((r, i) => (
              <button
                key={i}
                onClick={() => { setPriceMin(r.min); setPriceMax(r.max); }}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  priceMin === r.min && priceMax === r.max
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-blue-50 border border-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sắp xếp */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">🔽 Sắp xếp:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
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
                  <button className="w-full bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700">
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
