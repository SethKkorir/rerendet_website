// src/components/Admin/AdminLayout.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { playNotificationSound } from '../../utils/sound';
// Import FaBullhorn
import {
  FaTachometerAlt, FaShoppingBag, FaBox, FaUsers,
  FaEnvelope, FaChartBar, FaCog, FaSignOutAlt,
  FaBars, FaTimes, FaBell, FaUserCircle,
  FaInfoCircle, FaCheckCircle, FaExclamationCircle,
  FaBullhorn, FaMoneyBillWave
} from 'react-icons/fa';
import './AdminLayout.css';
import CommandPalette from './CommandPalette';

const AdminLayout = ({ children }) => {
  const { user, logout, showNotification, token } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  // Real notifications state
  const [adminNotifications, setAdminNotifications] = useState([
    { id: 1, type: 'system', message: 'System started', time: 'Just now', read: true }
  ]);

  // Polling for new orders
  const lastOrderIdRef = useRef(null);

  useEffect(() => {
    let intervalId;

    const checkNewOrders = async () => {
      if (!token) return;

      try {
        const response = await fetch('/api/admin/orders/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success && data.data.latestOrder) {
          const currentLatestId = data.data.latestOrder.id;

          // If we have a last ID and it's different from current, it's a new order
          if (lastOrderIdRef.current && lastOrderIdRef.current !== currentLatestId) {
            const newOrder = data.data.latestOrder;

            // Play Sound
            playNotificationSound('success');

            // Show Toast
            showNotification(`New Order #${newOrder.orderNumber} Received!`, 'success');

            // Add to dropdown list
            const newNotification = {
              id: Date.now(),
              type: 'order',
              message: `New order #${newOrder.orderNumber} received`,
              time: 'Just now',
              read: false
            };

            setAdminNotifications(prev => [newNotification, ...prev]);
          }

          // Update ref
          lastOrderIdRef.current = currentLatestId;
        }
      } catch (error) {
        console.error('Order polling error:', error);
      }
    };

    // Initial check to set the ref
    checkNewOrders();

    // Poll every 30 seconds
    intervalId = setInterval(checkNewOrders, 30000);

    return () => clearInterval(intervalId);
  }, [token, showNotification]);

  const unreadCount = adminNotifications.filter(n => !n.read).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
    { id: 'orders', label: 'Orders', icon: <FaShoppingBag />, path: '/admin/orders' },
    { id: 'payments', label: 'Payments', icon: <FaMoneyBillWave />, path: '/admin/payments' },
    { id: 'products', label: 'Products', icon: <FaBox />, path: '/admin/products' },
    { id: 'users', label: 'Users', icon: <FaUsers />, path: '/admin/users' },
    { id: 'contacts', label: 'Contacts', icon: <FaEnvelope />, path: '/admin/contacts' },
    { id: 'marketing', label: 'Marketing', icon: <FaBullhorn />, path: '/admin/marketing' },
    { id: 'analytics', label: 'Analytics', icon: <FaChartBar />, path: '/admin/analytics' },
    { id: 'settings', label: 'Settings', icon: <FaCog />, path: '/admin/settings' },
  ];

  // Update active menu based on current location
  useEffect(() => {
    const currentPath = location.pathname;
    const activeItem = menuItems.find(item => currentPath === item.path || currentPath.startsWith(item.path + '/'));
    if (activeItem) {
      setActiveMenu(activeItem.id);
    }
  }, [location.pathname]);

  const handleMenuClick = (item) => {
    setActiveMenu(item.id);
    navigate(item.path);
  };

  const handleLogout = () => {
    logout();
    showNotification('Logged out successfully', 'info');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      {/* Global Command Palette */}
      <CommandPalette />

      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Rerendet Admin</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <FaUserCircle className="profile-avatar" />
            {sidebarOpen && (
              <div className="profile-info">
                <span className="admin-name">{user?.firstName} {user?.lastName}</span>
                <span className="admin-role capitalize">{user?.role}</span>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">
              {menuItems.find(item => item.id === activeMenu)?.label}
            </h1>
          </div>

          <div className="header-right">
            <div className="notification-wrapper">
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <FaBell />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <button className="mark-all-read">Mark all read</button>
                  </div>
                  <div className="notification-list">
                    {adminNotifications.map(notification => (
                      <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
                        <div className={`notification-icon ${notification.type}`}>
                          {notification.type === 'order' && <FaShoppingBag />}
                          {notification.type === 'alert' && <FaExclamationCircle />}
                          {notification.type === 'user' && <FaUsers />}
                          {notification.type === 'system' && <FaInfoCircle />}
                        </div>
                        <div className="notification-content">
                          <p>{notification.message}</p>
                          <span className="notification-time">{notification.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="notification-footer">
                    <button>View All Notifications</button>
                  </div>
                </div>
              )}
            </div>
            <div className="user-menu">
              <span className="welcome-text">Welcome, {user?.firstName}</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;