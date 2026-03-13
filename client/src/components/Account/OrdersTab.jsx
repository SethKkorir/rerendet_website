import React, { useContext } from 'react';
import { FaBox, FaShoppingBag, FaCheckCircle, FaClock, FaTruck, FaBoxOpen, FaEye, FaRedo } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const OrdersTab = ({ orders, loading }) => {
    const navigate = useNavigate();
    const { addToCart } = useContext(AppContext);

    // Helper to determine active step based on fulfillment and order status
    const getStepStatus = (order, step) => {
        const { fulfillmentStatus, orderStatus } = order;

        if (orderStatus === 'cancelled') return 'cancelled';

        // 1. Confirmed (Active until packed)
        if (step === 'confirmed') {
            if (['packed', 'shipped', 'delivered'].includes(fulfillmentStatus)) return 'completed';
            return 'active';
        }

        // 2. Processing (Active only when packed)
        if (step === 'processing') {
            if (['shipped', 'delivered'].includes(fulfillmentStatus)) return 'completed';
            if (fulfillmentStatus === 'packed') return 'active';
            return 'pending';
        }

        // 3. Shipped
        if (step === 'shipped') {
            if (fulfillmentStatus === 'delivered') return 'completed';
            if (fulfillmentStatus === 'shipped') return 'active';
            return 'pending';
        }

        // 4. Delivered
        if (step === 'delivered') {
            if (fulfillmentStatus === 'delivered') return 'active';
            return 'pending';
        }

        return 'pending';
    };

    return (
        <div className="modern-dashboard-tab">
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
                                    <span className="amount">KES {order.total?.toLocaleString()}</span>
                                    <div className="status-badges">
                                        <span className={`status-badge ${order.status}`}>
                                            {order.status}
                                        </span>
                                        <span className={`status-badge payment ${order.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                                            {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Granular Tracking Stepper */}
                            <div className="order-tracking-preview">
                                <div className={`track-step ${getStepStatus(order, 'confirmed')}`}>
                                    <div className="step-dot"><FaCheckCircle /></div>
                                    <span className="step-label">Confirmed</span>
                                </div>
                                <div className={`track-line ${getStepStatus(order, 'processing') === 'completed' || getStepStatus(order, 'processing') === 'active' ? 'active' : ''}`}></div>

                                <div className={`track-step ${getStepStatus(order, 'processing')}`}>
                                    <div className="step-dot"><FaBoxOpen /></div>
                                    <span className="step-label">Processing</span>
                                </div>
                                <div className={`track-line ${getStepStatus(order, 'shipped') === 'completed' || getStepStatus(order, 'shipped') === 'active' ? 'active' : ''}`}></div>

                                <div className={`track-step ${getStepStatus(order, 'shipped')}`}>
                                    <div className="step-dot"><FaTruck /></div>
                                    <span className="step-label">Shipped</span>
                                </div>
                                <div className={`track-line ${getStepStatus(order, 'delivered') === 'completed' ? 'active' : ''}`}></div>

                                <div className={`track-step ${getStepStatus(order, 'delivered')}`}>
                                    <div className="step-dot"><FaBox /></div>
                                    <span className="step-label">Delivered</span>
                                </div>
                            </div>

                            <div className="order-items-preview">
                                {order.items?.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="item-mini-tag">
                                        <span className="item-name">{item.product?.name || item.name}</span>
                                        <span className="item-qty">x{item.quantity}</span>
                                    </div>
                                ))}
                                {order.items?.length > 3 && <span className="more-items">+{order.items.length - 3} more</span>}
                            </div>

                            <div className="order-actions-modern">
                                <button className="btn-order-outline" onClick={() => navigate(`/order-tracking/${order._id}`)}>
                                    <FaEye /> View Details
                                </button>
                                <button
                                    className="btn-order-primary"
                                    onClick={() => {
                                        order.items.forEach(item => {
                                            if (item.product) {
                                                addToCart(item.product, item.quantity, item.size);
                                            }
                                        });
                                        navigate('/cart');
                                    }}
                                >
                                    <FaRedo /> Buy Again
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon-wrap">
                        <FaShoppingBag className="empty-icon" />
                    </div>
                    <h3>Start your journey</h3>
                    <p>Experience the finest Kenyan single-origin coffee. Your future acquisitions will appear here.</p>
                    <button className="btn-order-primary" onClick={() => (window.location.href = '#coffee-shop')}>
                        Explore Collection
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;
