import React from 'react';
import { FaBox, FaShoppingBag, FaCheckCircle, FaClock, FaTruck, FaBoxOpen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const OrdersTab = ({ orders, loading }) => {
    const navigate = useNavigate();

    // Helper to determine active step based on fulfillment and order status
    const getStepStatus = (order, step) => {
        const { fulfillmentStatus, paymentStatus, orderStatus } = order;

        // Handle cancelled orders
        if (orderStatus === 'cancelled') return 'cancelled';

        // 1. Placed (Always active if not cancelled)
        if (step === 'placed') return 'completed';

        // 2. Processing (Payment Paid OR Packed)
        if (step === 'processing') {
            if (fulfillmentStatus === 'packed' || fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered') return 'completed';
            if (paymentStatus === 'paid') return 'active'; // Processing starts when paid
            return 'pending';
        }

        // 3. Shipped
        if (step === 'shipped') {
            if (fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered') return 'completed';
            if (fulfillmentStatus === 'packed') return 'pending'; // Ready to ship
            return 'pending';
        }

        // 4. Delivered
        if (step === 'delivered') {
            if (fulfillmentStatus === 'delivered') return 'completed';
            if (fulfillmentStatus === 'shipped') return 'active'; // On the way
            return 'pending';
        }

        return 'pending';
    };

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
                                    <span className="amount">KES {order.total?.toLocaleString()}</span>
                                    <div className="status-badges">
                                        <span className={`status-badge ${order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus === 'failed' ? 'failed' : 'pending'}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Granular Tracking Stepper */}
                            <div className="order-tracking-preview">
                                {/* Step 1: Placed */}
                                <div className={`track-step ${getStepStatus(order, 'placed')}`}>
                                    <div className="step-dot"><FaCheckCircle /></div>
                                    <span className="step-label">Placed</span>
                                </div>
                                <div className={`track-line ${getStepStatus(order, 'processing') === 'completed' || getStepStatus(order, 'processing') === 'active' ? 'active' : ''}`}></div>

                                {/* Step 2: Processing */}
                                <div className={`track-step ${getStepStatus(order, 'processing')}`}>
                                    <div className="step-dot"><FaBoxOpen /></div>
                                    <span className="step-label">Processing</span>
                                </div>
                                <div className={`track-line ${getStepStatus(order, 'shipped') === 'completed' || getStepStatus(order, 'shipped') === 'active' ? 'active' : ''}`}></div>

                                {/* Step 3: Shipped */}
                                <div className={`track-step ${getStepStatus(order, 'shipped')}`}>
                                    <div className="step-dot"><FaTruck /></div>
                                    <span className="step-label">Shipped</span>
                                </div>
                                <div className={`track-line ${getStepStatus(order, 'delivered') === 'completed' ? 'active' : ''}`}></div>

                                {/* Step 4: Delivered */}
                                <div className={`track-step ${getStepStatus(order, 'delivered')}`}>
                                    <div className="step-dot"><FaBox /></div>
                                    <span className="step-label">Delivered</span>
                                </div>
                            </div>

                            <div className="order-actions">
                                <button className="btn-outline btn-sm" onClick={() => navigate(`/order-tracking/${order._id}`)}>
                                    View Details & Tracking
                                </button>
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
