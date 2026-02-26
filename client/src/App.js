// App.js
import React, { useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppContext } from './context/AppContext';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Features from './components/Features/Features';
import About from './components/About/About';
import CoffeeShop from './components/CoffeeShop/CoffeeShop';
import Testimonials from './components/Testimonials/Testimonials';
import Contact from './components/Contact/Contact';
import Newsletter from './components/Newsletter/Newsletter';
import Footer from './components/Footer/Footer';
import CartSidebar from './components/Cart/CartSidebar';
import { MpesaModal, CardModal } from './components/Modals/PaymentModal';
import BackToTop from './components/BackToTop/BackToTop';
import AdminLayout from './components/Admin/AdminLayout';
import AdminRoute from './components/Admin/AdminRoute';
import Notification from './components/Notification/Notification';
import SessionLock from './components/Auth/SessionLock';
import ProductDetail from './components/Product/ProductDetail';
import Dashboard from './components/Admin/Dashboard';
import OrdersManagement from './components/Admin/OrdersManagement';
import ProductsManagement from './components/Admin/ProductsManagement';
import UsersManagement from './components/Admin/UsersManagement';
import Analytics from './components/Admin/Analytics';
import Settings from './components/Admin/Settings';
import ContactsManagement from './components/Admin/ContactsManagement';
import Marketing from './components/Admin/Marketing';
import AdminLogin from './components/Admin/AdminLogin';
import Checkout from './components/Checkout/Checkout';
import OrderConfirmation from './components/OrderConfirmation/OrderConfirmation';
import AccountDashboard from './components/Account/AccountDashboard';
import Orders from './pages/Orders';
import OrderReceipt from './components/Checkout/OrderReceipt';
import OrderTracking from './components/OrderTracking/OrderTracking';
import AdminOrders from './components/Admin/Orders';
import Profile from './components/Profile/Profile';
import PolicyPage from './pages/PolicyPage';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Initialize AOS animations
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-in-out',
      offset: 100
    });

    // Custom scroll animations
    const handleScroll = () => {
      const fadeElements = document.querySelectorAll('.fade-in');
      fadeElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (elementTop < windowHeight * 0.8) {
          element.classList.add('active');
        }
      });
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);

    // Initial check
    handleScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      AOS.refresh();
    };
  }, []);

  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  const { publicSettings, user, userType, settingsLoading, isAdmin } = useContext(AppContext);

  // Robust Admin check
  const isActualAdmin = user?.role === 'admin' || user?.role === 'super-admin' || userType === 'admin' || isAdmin === true;

  // Robust Maintenance Mode check
  const maintenanceEnabled = publicSettings?.maintenance?.enabled === true ||
    publicSettings?.maintenance?.enabled === 'true';

  // Always show loader if context is still booting
  if (settingsLoading) {
    return (
      <div className="loading-overlay">
        <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #6b4226', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 1. If Maintenance is ON and user is NOT an Admin, SHOW OVERLAY
  // But always allow the Admin Login page to be reachable
  const isLoginPage = location.pathname.includes('/admin/login');

  if (maintenanceEnabled && !isActualAdmin && !isLoginPage) {
    return (
      <div className="maintenance-overlay">
        <div className="maintenance-content">
          <div className="maintenance-icon">🛠️</div>
          <h1>Service Temporarily Offline</h1>
          <p>{publicSettings?.maintenance?.message || "We are currently performing scheduled maintenance to improve our service. We'll be back shortly!"}</p>
          <div className="maintenance-footer">
            <p>Thank you for your patience.</p>
            <p className="maintenance-team">— Rerendet Coffee Maintenance Team</p>
          </div>
        </div>
        <style>{`
          .maintenance-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #faf7f2;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
            text-align: center;
          }
          .maintenance-content {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(111, 78, 55, 0.1);
            max-width: 500px;
            width: 100%;
          }
          .maintenance-icon {
            font-size: 60px;
            margin-bottom: 20px;
          }
          .maintenance-content h1 {
            color: #6F4E37;
            margin-bottom: 15px;
            font-size: 2rem;
          }
          .maintenance-content p {
            color: #6d7280;
            line-height: 1.6;
            margin-bottom: 25px;
          }
          .maintenance-footer {
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .maintenance-team {
            font-weight: 700;
            color: #6F4E37 !important;
            margin-top: 10px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`App ${maintenanceEnabled && isActualAdmin ? 'maintenance-active' : ''}`}>
      {/* Admin Maintenance Banner - ONLY for Admins */}
      {maintenanceEnabled && isActualAdmin && (
        <div className="maintenance-banner">
          ⚠️ Maintenance Mode is Active (Visible to Admins only)
        </div>
      )}

      <Notification />
      <SessionLock />

      {/* Don't show navbar on admin routes */}
      {!isAdminRoute && <Navbar />}


      {/* Main Routes */}
      <Routes>
        {/* Home Page with all sections */}
        <Route
          path="/"
          element={
            <>
              <main>
                <Hero />
                <Features />
                <About />
                <CoffeeShop />
                <Testimonials />
                <Contact />
                <Newsletter />
              </main>
              <Footer />
            </>
          }
        />

        <Route path="/product/:slug" element={<ProductDetail />} />

        {/* Policy Pages */}
        <Route path="/privacy-policy" element={<PolicyPage type="privacyPolicy" title="Privacy Policy" />} />
        <Route path="/terms-conditions" element={<PolicyPage type="termsConditions" title="Terms & Conditions" />} />
        <Route path="/refund-policy" element={<PolicyPage type="refundPolicy" title="Refund Policy" />} />
        <Route path="/shipping-policy" element={<PolicyPage type="shippingPolicy" title="Shipping Policy" />} />

        {/* Redirect old auth routes to home */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Checkout & Orders */}
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        <Route path="/order-tracking/:id" element={<OrderTracking />} />
        <Route path="/orders/:id" element={<OrderReceipt />} />
        <Route path="/orders" element={<Orders />} />

        {/* User Account Routes */}
        <Route path="/account" element={<AccountDashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/orders" element={<OrdersManagement />} />
                  <Route path="/orders-view" element={<AdminOrders />} />
                  <Route path="/products" element={<ProductsManagement />} />
                  <Route path="/users" element={<UsersManagement />} />
                  <Route path="/contacts" element={<ContactsManagement />} />
                  <Route path="/marketing" element={<Marketing />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </AdminLayout>
            </AdminRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Components - Don't show on admin routes */}
      {!isAdminRoute && (
        <>
          <CartSidebar />
          <MpesaModal />
          <CardModal />
          <BackToTop />
        </>
      )}
    </div>
  );
}

export default App;