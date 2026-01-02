import React from 'react';
import { FaBox, FaShoppingBag } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const OrdersTab = ({ orders, loading }) => {
    const navigate = useNavigate();

    return (
        <div className="modern-dashboard-tab">
            <div className="tab-header">
                <h2>My Orders</h2>
                <p>Track and manage your recent purchases</p>
            </div>

            {loading ? (
                <div className="loading-spinner-container">
                    <div className="loading-spinner"></div>
                </div>
            ) : orders.length > 0 ? (
                <div className="orders-grid">
                    {orders.map(order => (
                        <div key={order._id} className="modern-order-card">
                            <div className="order-header">
                                <div className="order-meta">
                                    <h4>Order #{order.orderNumber}</h4>
                                    <p className="order-date">{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="order-amount">
                                    <span className="amount">KES {order.totalAmount?.toLocaleString()}</span>
                                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                                </div>
                            </div>

                            {/* Tracking Stepper */}
                            <div className="order-tracking-preview">
                                <div className={`track-step ${['pending', 'confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'completed' : ''}`}>
                                    <div className="step-dot"></div>
                                    <span className="step-label">Placed</span>
                                </div>
                                <div className={`track-line ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}></div>
                                <div className={`track-step ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'completed' : ''}`}>
                                    <div className="step-dot"></div>
                                    <span className="step-label">Processing</span>
                                </div>
                                <div className={`track-line ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}></div>
                                <div className={`track-step ${['shipped', 'delivered'].includes(order.status) ? 'completed' : ''}`}>
                                    <div className="step-dot"></div>
                                    <span className="step-label">Shipped</span>
                                </div>
                                <div className={`track-line ${['delivered'].includes(order.status) ? 'active' : ''}`}></div>
                                <div className={`track-step ${['delivered'].includes(order.status) ? 'completed' : ''}`}>
                                    <div className="step-dot"></div>
                                    <span className="step-label">Delivered</span>
                                </div>
                            </div>

                            <div className="order-actions">
                                <button className="btn-outline btn-sm" onClick={() => navigate(`/order-tracking/${order._id}`)}>Track Order</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <FaBox className="empty-icon" />
                    <h3>No orders yet</h3>
                    <p>Once you make a purchase, it will appear here.</p>
                    <button className="btn-primary" onClick={() => navigate('/shop')}>Start Shopping</button>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;
