import React from 'react';
import { FaBox, FaShoppingBag, FaMapMarkerAlt, FaCreditCard, FaUserEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const OverviewTab = ({ user, orders, setActiveTab }) => {
    const navigate = useNavigate();

    // Calculate Stats
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => ['processing', 'confirmed', 'shipped'].includes(o.status)).length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;

    // Get recent 3 orders
    const recentOrders = orders.slice(0, 3);

    return (
        <div className="modern-dashboard-tab fadeIn">
            {/* Welcome Section */}
            <div className="overview-welcome">
                <h1>Welcome back, {user.firstName}!</h1>
                <p>Here's what's happening with your account today.</p>
            </div>

            {/* Stats Grid */}
            <div className="overview-stats-grid">
                <div className="stat-card" onClick={() => setActiveTab('orders')}>
                    <div className="stat-icon orange">
                        <FaShoppingBag />
                    </div>
                    <div className="stat-info">
                        <h3>{totalOrders}</h3>
                        <p>Total Orders</p>
                    </div>
                </div>
                <div className="stat-card" onClick={() => setActiveTab('orders')}>
                    <div className="stat-icon blue">
                        <FaBox />
                    </div>
                    <div className="stat-info">
                        <h3>{activeOrders}</h3>
                        <p>Active Orders</p>
                    </div>
                </div>
                {/* Could add more stats like "Loyalty Points" later */}
            </div>

            {/* Recent Orders Section */}
            <div className="overview-section">
                <div className="section-header">
                    <h2>Recent Orders</h2>
                    <button className="btn-link" onClick={() => setActiveTab('orders')}>View All</button>
                </div>

                {recentOrders.length > 0 ? (
                    <div className="recent-orders-list">
                        {recentOrders.map(order => (
                            <div key={order._id} className="recent-order-item" onClick={() => navigate(`/account/orders/${order._id}`)}>
                                <div className="order-info-group">
                                    <span className="order-id">#{order.orderNumber}</span>
                                    <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="order-status-group">
                                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                                    <span className="order-total">KES {order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-mini-state">
                        <p>No recent orders found.</p>
                        <button className="btn-sm btn-primary" onClick={() => navigate('/shop')}>Shop Now</button>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="overview-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions-grid">
                    <button className="action-card" onClick={() => setActiveTab('addresses')}>
                        <FaMapMarkerAlt />
                        <span>Manage Addresses</span>
                    </button>
                    <button className="action-card" onClick={() => setActiveTab('wallet')}>
                        <FaCreditCard />
                        <span>Payment History</span>
                    </button>
                    <button className="action-card" onClick={() => setActiveTab('profile')}>
                        <FaUserEdit />
                        <span>Edit Profile</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
