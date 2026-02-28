// components/AccountDashboard.jsx - CLEAN & MODERN
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaUser, FaShoppingBag, FaMapMarkerAlt, FaCreditCard,
  FaSignOutAlt, FaLock, FaTimes, FaHome, FaShieldAlt, FaHistory, FaCheckCircle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './AccountDashboard.css';

// Import Tab Components
import OrdersTab from './OrdersTab';
import AddressesTab from './AddressesTab';
import WalletTab from './WalletTab';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';

// Internal Overview Tab
const OverviewTab = ({ user, orders, onNavigate }) => {
  const unpaidOrders = orders.filter(o => o.paymentStatus !== 'paid').length;

  return (
    <div className="overview-tab">
      {!user.twoFactorEnabled && (
        <div className="security-unhealthy-banner">
          <div className="unhealthy-icon-box">
            <FaShieldAlt />
          </div>
          <div className="unhealthy-content">
            <h4 className="unhealthy-title">Security Recommendation</h4>
            <p className="unhealthy-desc">Your account is currently protected by password only. Enable Two-Factor Authentication (2FA) for an extra layer of defense.</p>
          </div>
          <button className="enable-2fa-cta" onClick={() => onNavigate('security')}>
            Secure Account
          </button>
        </div>
      )}

      <div className="overview-stats-grid">
        <div className="overview-stat-card">
          <div className="stat-icon-wrap"><FaShoppingBag /></div>
          <div className="stat-content">
            <span className="stat-value">{orders.length}</span>
            <span className="stat-label">Total Orders</span>
          </div>
        </div>
        <div className="overview-stat-card">
          <div className="stat-icon-wrap"><FaCreditCard /></div>
          <div className="stat-content">
            <span className="stat-value">{unpaidOrders}</span>
            <span className="stat-label">Unpaid Orders</span>
          </div>
        </div>
        <div className={`overview-stat-card ${user.twoFactorEnabled ? 'security-card' : 'at-risk-card'}`}>
          <div className="stat-icon-wrap"><FaShieldAlt /></div>
          <div className="stat-content">
            <span className={`stat-value ${user.twoFactorEnabled ? 'text-success' : 'text-warning'}`}>
              {user.twoFactorEnabled ? 'Secure' : 'At Risk'}
            </span>
            <span className="stat-label">Account Health</span>
          </div>
        </div>
      </div>

      <div className="overview-sections-grid">
        <div className="overview-section-main">
          <h3>Security Overview</h3>
          <div className="security-health-banner">
            <div className="health-info">
              <FaCheckCircle className="text-success" />
              <div>
                <p className="health-title">SSL Encryption Active</p>
                <p className="health-desc">Your connection to Rerendet is end-to-end encrypted.</p>
              </div>
            </div>
          </div>
          <div className="security-features-list">
            <div className="sec-feature-item">
              <FaLock />
              <span>Two-Factor Authentication: <strong>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong></span>
            </div>
            <div className="sec-feature-item">
              <FaHistory />
              <span>Last Login: <strong>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Just now'}</strong></span>
            </div>
          </div>
        </div>

        <div className="overview-section-side">
          <h3>Wallet</h3>
          <div className="wallet-mini-card">
            <div className="mpesa-brand">
              <img src="/M-PESA_LOGO-01.svg.png" alt="M-Pesa" style={{ height: '20px' }} />
            </div>
            {user.wallet?.mpesaPhone || user.phone ? (
              <p className="wallet-number">{user.wallet?.mpesaPhone || user.phone}</p>
            ) : (
              <p className="wallet-number-empty">No number linked</p>
            )}
            <span className="wallet-status">Primary Method</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function AccountDashboard() {
  const {
    user,
    logout,
    fetchUserOrders,
    orderRefreshTrigger
  } = useContext(AppContext);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Real Data State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load orders for Overview and Orders tab
  useEffect(() => {
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      loadOrders(true);
    }
  }, [user, activeTab, orderRefreshTrigger]);

  // LIVE POLLING: Refresh order list every 20 seconds
  useEffect(() => {
    let pollInterval;
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      pollInterval = setInterval(() => {
        loadOrders(false);
      }, 20000);
    }
    return () => clearInterval(pollInterval);
  }, [user, activeTab]);

  const loadOrders = async (showLoading = true) => {
    if (showLoading) setOrdersLoading(true);
    try {
      const payload = await fetchUserOrders(1, 15);
      if (payload?.data?.orders) {
        setOrders(payload.data.orders);
      } else if (payload?.orders) {
        setOrders(payload.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      if (showLoading) setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Tabs Configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaHome /> },
    { id: 'orders', label: 'My Orders', icon: <FaShoppingBag /> },
    { id: 'addresses', label: 'Addresses', icon: <FaMapMarkerAlt /> },
    { id: 'wallet', label: 'Wallet', icon: <FaCreditCard /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'security', label: 'Security', icon: <FaLock /> },
  ];

  if (!user) return null;

  return (
    <div className="modern-account-dashboard">
      <div className="modern-dashboard-container">
        {/* Sidebar */}
        <aside className={`modern-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="user-card-modern">
            <div className="avatar-modern-wrap">
              <div className="avatar-modern">
                {user.firstName?.charAt(0) || <FaUser />}
              </div>
              <div className="avatar-glow" />
            </div>
            <div className="user-info-modern">
              <span className="membership-badge">Rerendet Member</span>
              <h3>{user.firstName} {user.lastName}</h3>
              <p className="user-email">{user.email}</p>
              <div className="user-stats-mini">
                <div className="stat-pill">
                  <span className="stat-label">Member Since</span>
                  <span className="stat-value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'New Member'}</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="modern-sidebar-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`modern-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
            <button className="modern-nav-item logout-btn" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="modern-main-content">
          <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <FaTimes /> : <FaUser />}
          </button>

          <div className="tab-header">
            <p>Member Dashboard</p>
            <h2>
              {activeTab === 'overview' && 'Overview'}
              {activeTab === 'orders' && 'Orders'}
              {activeTab === 'addresses' && 'Addresses'}
              {activeTab === 'wallet' && 'Wallet'}
              {activeTab === 'profile' && 'Profile'}
              {activeTab === 'security' && 'Security'}
            </h2>
          </div>

          <div className="dashboard-view-container">
            {activeTab === 'overview' && <OverviewTab user={user} orders={orders} onNavigate={setActiveTab} />}
            {activeTab === 'orders' && <OrdersTab orders={orders} loading={ordersLoading} />}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AccountDashboard;