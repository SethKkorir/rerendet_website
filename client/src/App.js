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
import BlogManagement from './components/Admin/BlogManagement';
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

  const { publicSettings, user, userType, settingsLoading, isAdmin, showAuthModal, setShowAuthModal, authView } = useContext(AppContext);

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
  // Visitors (unauthenticated) and Customers (authenticated non-admins) will both see this.
  const isLoginPage = location.pathname.includes('/admin/login');
  const isMaintenanceRoute = maintenanceEnabled && !isActualAdmin && !isLoginPage;

  if (isMaintenanceRoute) {
    return (
      <div className="maintenance-overlay">
        <div className="maintenance-content" data-aos="zoom-in">
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
            <div className="premium-badge">Digital Estate Refresh</div>
            <div className="maintenance-icon-wrap">
              <FaTools className="main-icon" />
              <div className="icon-pulse"></div>
            </div>
            <h1>Polishing the Peak</h1>
            <div className="maintenance-message">
              <p>{publicSettings?.maintenance?.message || "We're currently roasting some fresh updates for you! Our storefront is temporarily offline while we prepare something special. We'll be back online shortly."}</p>
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
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0B0F1A; /* Deep Estate Blue */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Outfit', sans-serif;
            overflow: hidden;
          }
          .maintenance-overlay::before {
            content: '';
            position: absolute;
            width: 200%;
            height: 200%;
            background: url('https://www.transparenttextures.com/patterns/dust.png');
            opacity: 0.1;
            animation: drift 60s linear infinite;
          }
          @keyframes drift {
            from { transform: translate(-25%, -25%); }
            to { transform: translate(0, 0); }
          }
          .maintenance-content {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
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
            background: rgba(212, 175, 55, 0.1);
            color: #D4AF37;
            padding: 8px 20px;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 25px;
            border: 1px solid rgba(212, 175, 55, 0.2);
          }
          .maintenance-logo img {
            height: 80px;
            margin-bottom: 40px;
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.3));
          }
          .logo-placeholder {
            font-size: 60px;
            margin-bottom: 30px;
          }
          .maintenance-icon-wrap {
            position: relative;
            width: 110px;
            height: 110px;
            margin: 0 auto 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #6F4E37, #2c1810);
            border-radius: 50%;
            color: #D4AF37;
            font-size: 45px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          }
          .icon-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #D4AF37;
            opacity: 0.5;
            animation: ripple 2.5s ease-out infinite;
          }
          @keyframes ripple {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .maintenance-body h1 {
            color: #FFFFFF;
            font-family: 'Playfair Display', serif;
            font-size: 3rem;
            font-weight: 400;
            margin-bottom: 25px;
            letter-spacing: -1px;
          }
          .maintenance-message {
            background: rgba(0, 0, 0, 0.2);
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 40px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .maintenance-message p {
            color: #ADB5BD;
            line-height: 1.8;
            font-size: 1.15rem;
            margin: 0;
            font-weight: 300;
          }
          .social-links {
            display: flex;
            justify-content: center;
            gap: 25px;
            margin-bottom: 30px;
          }
          .social-links a {
            color: #D4AF37;
            font-size: 26px;
            transition: all 0.3s;
            opacity: 0.8;
          }
          .social-links a:hover {
            opacity: 1;
            transform: translateY(-5px);
            text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
          }
          .signature {
            font-weight: 700;
            color: #6F4E37;
            margin: 0;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 3px;
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
          <div className="maintenance-banner-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🚧</span>
            <strong>LIVE PREVIEW:</strong> Maintenance Mode is ON. Visitors & customers are currently seeing the 'Offline' screen. You are bypassing it because you are logged in as an Admin.
          </div>
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
                  <Route path="/blogs" element={<BlogManagement />} />
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