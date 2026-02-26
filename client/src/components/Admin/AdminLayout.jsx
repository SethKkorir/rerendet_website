// src/components/Admin/AdminLayout.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { playNotificationSound } from '../../utils/sound';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt, FaShoppingBag, FaBox, FaUsers,
  FaEnvelope, FaChartBar, FaCog, FaSignOutAlt,
  FaBars, FaTimes, FaBell, FaUserCircle,
  FaInfoCircle, FaExclamationCircle,
  FaBullhorn
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
    { id: 1, type: 'system', message: 'Admin System Initialized', time: 'Just now', read: true }
  ]);

  const lastOrderIdRef = useRef(null);

  useEffect(() => {
    let intervalId;
    const checkNewOrders = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/admin/orders/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.data.latestOrder) {
          const currentLatestId = data.data.latestOrder.id;
          if (lastOrderIdRef.current && lastOrderIdRef.current !== currentLatestId) {
            const newOrder = data.data.latestOrder;
            playNotificationSound('success');
            showNotification(`New Order #${newOrder.orderNumber} Received!`, 'success');
            const newNotification = {
              id: Date.now(),
              type: 'order',
              message: `New order #${newOrder.orderNumber} received`,
              time: 'Just now',
              read: false
            };
            setAdminNotifications(prev => [newNotification, ...prev]);
          }
          lastOrderIdRef.current = currentLatestId;
        }
      } catch (error) {
        console.error('Order polling error:', error);
      }
    };
    checkNewOrders();
    intervalId = setInterval(checkNewOrders, 30000);
    return () => clearInterval(intervalId);
  }, [token, showNotification]);

  const unreadCount = adminNotifications.filter(n => !n.read).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
    { id: 'orders', label: 'Orders', icon: <FaShoppingBag />, path: '/admin/orders' },
    { id: 'products', label: 'Products', icon: <FaBox />, path: '/admin/products' },
    { id: 'users', label: 'Users', icon: <FaUsers />, path: '/admin/users' },
    { id: 'contacts', label: 'Contacts', icon: <FaEnvelope />, path: '/admin/contacts' },
    { id: 'marketing', label: 'Marketing', icon: <FaBullhorn />, path: '/admin/marketing' },
    { id: 'analytics', label: 'Analytics', icon: <FaChartBar />, path: '/admin/analytics' },
    { id: 'settings', label: 'Settings', icon: <FaCog />, path: '/admin/settings' },
  ];

  useEffect(() => {
    const currentPath = location.pathname;
    const navItems = menuItems.filter(item => item.path !== '/admin');
    const specificItem = navItems.find(item => currentPath.startsWith(item.path));
    if (specificItem) {
      setActiveMenu(specificItem.id);
    } else if (currentPath === '/admin' || currentPath === '/admin/') {
      setActiveMenu('dashboard');
    }
  }, [location.pathname]);

  const handleMenuClick = (item) => {
    setActiveMenu(item.id);
    navigate(item.path);
    if (window.innerWidth <= 1024) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      showNotification('Logged out successfully', 'info');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/admin/login');
    }
  };

  return (
    <div className="admin-layout">
      <CommandPalette />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Rerendet Admin
          </motion.h2>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <FaUserCircle className="profile-avatar" />
            <div className="profile-info">
              <span className="admin-name">{user?.firstName} {user?.lastName}</span>
              <span className="admin-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <FaBars />
            </button>
            <h1 className="page-title">
              {menuItems.find(item => item.id === activeMenu)?.label || 'Admin Panel'}
            </h1>
          </div>

          <div className="header-right">
            <div className="notification-wrapper">
              <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
                <FaBell />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    className="notification-panel"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  >
                    <div className="notification-header">
                      <h3>Activity Dashboard</h3>
                      <button className="mark-all-read">Clear All</button>
                    </div>
                    <div className="notification-list">
                      {adminNotifications.map(notification => (
                        <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
                          <div className={`notification-icon ${notification.type}`}>
                            {notification.type === 'order' && <FaShoppingBag />}
                            {notification.type === 'alert' && <FaExclamationCircle />}
                            {notification.type === 'system' && <FaInfoCircle />}
                          </div>
                          <div className="notification-content">
                            <p>{notification.message}</p>
                            <span className="notification-time">{notification.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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