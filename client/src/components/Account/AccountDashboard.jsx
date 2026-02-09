// components/AccountDashboard.jsx - CLEAN & MODERN
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaUser, FaShoppingBag, FaMapMarkerAlt, FaCreditCard,
  FaSignOutAlt, FaLock
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './AccountDashboard.css';

// Import Tab Components
import OrdersTab from './OrdersTab';
import AddressesTab from './AddressesTab';
import WalletTab from './WalletTab';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';

function AccountDashboard() {
  const {
    user,
    logout,
    fetchUserOrders
  } = useContext(AppContext);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders'); // Default to orders for utility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (user && (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin')) {
      console.log('🛡️ Admin detected on account page. Redirecting to Admin Dashboard...');
      navigate('/admin');
    }
  }, [user, navigate]);

  // Real Data State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load orders only when Orders tab is active or on mount if active
  useEffect(() => {
    if (user && activeTab === 'orders') {
      loadOrders();
    }
  }, [user, activeTab]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await fetchUserOrders(1);
      if (data?.data?.orders) {
        setOrders(data.data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Tabs Configuration
  const tabs = [
    { id: 'orders', label: 'My Orders', icon: <FaShoppingBag /> },
    { id: 'addresses', label: 'Addresses', icon: <FaMapMarkerAlt /> },
    { id: 'wallet', label: 'Wallet', icon: <FaCreditCard /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'security', label: 'Security', icon: <FaLock /> },
  ];

  if (!user) return null; // Or redirect

  return (
    <div className="modern-account-dashboard">
      <div className="modern-dashboard-container">
        {/* Sidebar */}
        <aside className={`modern-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="user-card-modern">
            <div className="avatar-modern">
              <FaUser />
            </div>
            <div className="user-info-modern">
              <h3>{user.firstName}</h3>
              <p>{user.email}</p>
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
            <FaUser />
          </button>

          {activeTab === 'orders' && <OrdersTab orders={orders} loading={ordersLoading} />}
          {activeTab === 'addresses' && <AddressesTab />}
          {activeTab === 'wallet' && <WalletTab />}
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <SecurityTab />}
        </main>
      </div>
    </div>
  );
}

export default AccountDashboard;