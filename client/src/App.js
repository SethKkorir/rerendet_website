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
import { FaTools, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import AdminLayout from './components/Admin/AdminLayout';
import AdminRoute from './components/Admin/AdminRoute';
import Notification from './components/Notification/Notification';
import AuthModal from './components/Auth/AuthModal';
import SessionLock from './components/Auth/SessionLock';
import WhatsAppSupport from './components/UI/WhatsAppSupport';
import ProductDetail from './components/Product/ProductDetail';
import Dashboard from './components/Admin/Dashboard';
import OrdersManagement from './components/Admin/OrdersManagement';
import ProductsManagement from './components/Admin/ProductsManagement';
import UsersManagement from './components/Admin/UsersManagement';
import Analytics from './components/Admin/Analytics';
import Settings from './components/Admin/Settings';
import ContactsManagement from './components/Admin/ContactsManagement';
import Marketing from './components/Admin/Marketing';
import CouponManagement from './components/Admin/CouponManagement';
import BlogManagement from './components/Admin/BlogManagement';
import AdsManagement from './components/Admin/AdsManagement';
import AdminLogin from './components/Admin/AdminLogin';
import Checkout from './components/Checkout/Checkout';
import OrderConfirmation from './components/OrderConfirmation/OrderConfirmation';
import AccountDashboard from './components/Account/AccountDashboard';
import Orders from './pages/Orders';
import OrderReceipt from './components/Checkout/OrderReceipt';
import OrderTracking from './components/OrderTracking/OrderTracking';
import AdminOrders from './components/Admin/Orders';
import ActivityLogs from './components/Admin/ActivityLogs';
import Profile from './components/Profile/Profile';
import PolicyPage from './pages/PolicyPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import TrackOrder from './pages/TrackOrder';
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

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      AOS.refresh();
    };
  }, []);

  const {
    publicSettings,
    user,
    userType,
    settingsLoading,
    isAdmin,
    showAuthModal,
    setShowAuthModal,
    authView,
    globalMaintenance
  } = useContext(AppContext);

  // Maintenance & Role checks
  const isSuperAdmin = user?.role === 'super-admin';
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Robust Maintenance Mode check (Static Settings + Real-time 503 detector)
  const maintenanceActive = publicSettings?.maintenance?.enabled === true ||
    publicSettings?.maintenance?.enabled === 'true' ||
    globalMaintenance === true;

  // Decide if this specific user should be blocked by the downtime overlay
  const isLoginPage = location.pathname.includes('/admin/login');
  const isManagementBlocked = maintenanceActive && !isSuperAdmin && !isLoginPage;

  // Always show loader if context is still booting
  if (settingsLoading) {
    return (
      <div className="loading-overlay">
        <div className="loader-spinner"></div>
        <style>{`
          .loading-overlay { position: fixed; inset: 0; background: #0B0F1A; display: flex; align-items: center; justify-content: center; z-index: 20000; }
          .loader-spinner { width: 50px; height: 50px; border: 5px solid rgba(212, 175, 55, 0.1); border-top: 5px solid #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // 1. If System is in DOWNTIME and user is NOT a SUPER ADMIN, LOCK the entire site
  if (isManagementBlocked) {
    return (
      <div className="maintenance-overlay">
        <div className="maintenance-content">
          <div className="maintenance-header">
            <div className="maintenance-logo">
              {publicSettings?.store?.logo ? (
                <img src={publicSettings.store.logo} alt="Rerendet Coffee" />
              ) : (
                <div className="logo-placeholder">☕</div>
              )}
            </div>
          </div>

          <div className="maintenance-body">
            <div className="premium-badge">System Downtime</div>
            <div className="maintenance-icon-wrap">
              <FaTools className="main-icon" />
              <div className="icon-pulse"></div>
            </div>
            <h1>System Offline</h1>
            <div className="maintenance-message">
              <p>
                {publicSettings?.maintenance?.message ||
                  "The system is currently undergoing critical maintenance and is temporary offline. We apologize for the downtime. Please check back later."}
              </p>
            </div>
          </div>

          <div className="maintenance-footer">
            <div className="social-links">
              {publicSettings?.seo?.social?.instagram && (
                <a href={publicSettings.seo.social.instagram} target="_blank" rel="noreferrer"><FaInstagram /></a>
              )}
              {publicSettings?.seo?.social?.whatsapp && (
                <a href={publicSettings.seo.social.whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /></a>
              )}
            </div>
            <p className="signature">— The Rerendet Coffee Team</p>
          </div>
        </div>

        <style>{`
          .maintenance-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #0B0F1A;
            display: flex; align-items: center; justify-content: center;
            z-index: 10000;
            font-family: 'Outfit', sans-serif;
            overflow: hidden;
          }
          .maintenance-content {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(212, 175, 55, 0.2);
            padding: 60px 40px;
            border-radius: 40px;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
            max-width: 600px;
            width: 90%;
            text-align: center;
            position: relative;
            z-index: 2;
          }
          .premium-badge {
            display: inline-block;
            background: rgba(185, 28, 28, 0.1);
            color: #ef4444;
            padding: 8px 20px;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 25px;
            border: 1px solid rgba(185, 28, 28, 0.2);
          }
          .maintenance-logo img { height: 80px; margin-bottom: 40px; filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.3)); }
          .maintenance-icon-wrap { position: relative; width: 110px; height: 110px; margin: 0 auto 35px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6F4E37, #2c1810); border-radius: 50%; color: #D4AF37; font-size: 45px; }
          .icon-pulse { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #D4AF37; opacity: 0.5; animation: ripple 2.5s ease-out infinite; }
          @keyframes ripple { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
          .maintenance-body h1 { color: #FFFFFF; font-family: 'Playfair Display', serif; font-size: 3rem; margin-bottom: 25px; }
          .maintenance-message { background: rgba(0, 0, 0, 0.2); padding: 30px; border-radius: 20px; margin-bottom: 40px; border: 1px solid rgba(255, 255, 255, 0.05); }
          .maintenance-message p { color: #ADB5BD; line-height: 1.8; font-size: 1.15rem; margin: 0; }
          .social-links { display: flex; justify-content: center; gap: 25px; margin-bottom: 30px; }
          .social-links a { color: #D4AF37; font-size: 26px; transition: all 0.3s; opacity: 0.8; }
          .social-links a:hover { opacity: 1; transform: translateY(-5px); }
          .signature { font-weight: 700; color: #6F4E37; margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 3px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`App ${maintenanceActive ? 'maintenance-active' : ''} ${isSuperAdmin ? 'is-super-admin' : ''}`}>
      {/* Global Persistence Banner - Visible to Super Admins bypassing, or anyone if lockdown fails */}
      {maintenanceActive && (
        <div className={`maintenance-banner ${isSuperAdmin ? 'super-admin' : 'critical-downtime'}`}>
          <div className="maintenance-banner-content">
            <span className="pulse-dot"></span>
            <strong>{isSuperAdmin ? '🚧 ADMIN BYPASS:' : '⚠️ SYSTEM STATUS:'}</strong>
            {publicSettings?.maintenance?.message || "Critical maintenance is in progress. System is currently offline for users."}
          </div>
        </div>
      )}

      <Notification />
      <SessionLock />

      {/* Don't show navbar on admin routes */}
      {!isAdminRoute && <Navbar />}

      {/* Main Routes */}
      <Routes>
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

        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Checkout & Orders */}
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        <Route path="/order-tracking/:id" element={<OrderTracking />} />
        <Route path="/orders/:id" element={<OrderReceipt />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />

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
                  <Route path="/coupons" element={<CouponManagement />} />
                  <Route path="/blogs" element={<BlogManagement />} />
                  <Route path="/ads" element={<AdsManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/logs" element={<ActivityLogs />} />
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
          <WhatsAppSupport />
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialView={authView}
          />
        </>
      )}
    </div>
  );
}

export default App;