import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import OrdersPage from "./pages/OrdersPage";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import ProfilePage from "./pages/ProfilePage";
import ProductDetail from "./pages/ProductDetail";

// Component banner placeholder tái sử dụng
const BannerPlaceholder = ({ title, to }) => (
  <a
    href={to || "#"}
    className="block w-full shadow overflow-hidden cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
  >
    <div className="w-full h-80 bg-gray-200 flex flex-col items-center justify-center text-gray-400 text-center p-4 border border-dashed border-gray-300">
      <span className="text-3xl mb-2">🎬</span>
      <p className="text-xs">{title || "Video khuyến mãi"}</p>
    </div>
  </a>
);

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div className="min-h-screen bg-gray-50">
        <div className="flex gap-3 px-4 py-6 max-w-screen-2xl mx-auto">
          {/* Banner trái */}
          <div className="w-32 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 space-y-3">
              <BannerPlaceholder title="Video khuyến mãi 1" to="/products" />
              <BannerPlaceholder title="Video khuyến mãi 2" to="/products" />
            </div>
          </div>

          {/* Nội dung chính */}
          <main className="flex-1 min-w-0">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />

              {/* Cần đăng nhập */}
              <Route
                path="/cart"
                element={
                  <PrivateRoute>
                    <CartPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <PrivateRoute>
                    <CheckoutPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/payment-success"
                element={
                  <PrivateRoute>
                    <PaymentSuccessPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/payment-callback"
                element={
                  <PrivateRoute>
                    <PaymentSuccessPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <PrivateRoute>
                    <OrdersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                }
              />

              {/* Chỉ admin */}
              <Route
                path="/admin/products"
                element={
                  <PrivateRoute adminOnly={true}>
                    <AdminProducts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <PrivateRoute adminOnly={true}>
                    <AdminOrders />
                  </PrivateRoute>
                }
              />
            </Routes>
          </main>

          {/* Banner phải */}
          <div className="w-32 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 space-y-3">
              <BannerPlaceholder title="Video khuyến mãi 3" to="/products" />
              <BannerPlaceholder title="Video khuyến mãi 4" to="/products" />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;
