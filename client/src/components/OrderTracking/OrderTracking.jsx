// components/OrderTracking/OrderTracking.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
    FaBox, FaTruck, FaCheckCircle, FaClock, FaMapMarkerAlt,
    FaCalendarAlt, FaChevronLeft, FaPhoneAlt, FaFileAlt,
    FaHistory, FaSync
} from 'react-icons/fa';
import './OrderTracking.css';

const OrderTracking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification, token } = useContext(AppContext);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Initial fetch
    useEffect(() => {
        fetchOrderDetails(true);
    }, [id]);

    // REAL-TIME POLLING: Fetch every 10 seconds for "Live" experience
    useEffect(() => {
        const pollInterval = setInterval(() => {
            fetchOrderDetails(false);
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [id]);

    const fetchOrderDetails = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const response = await fetch(`/api/orders/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Order not found');

            const result = await response.json();
            if (result.success) {
                // Only update state if data changed to prevent unnecessary re-renders
                setOrder(result.data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Fetch order error:', error);
            if (isInitial) {
                showNotification('Failed to load tracking details', 'error');
                navigate('/account');
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase();
        if (s === 'confirmed' || s === 'unfulfilled') return <FaCheckCircle className="icon confirmed" />;
        if (s === 'processing' || s === 'packed') return <FaClock className="icon processing" />;
        if (s === 'shipped') return <FaTruck className="icon shipped" />;
        if (s === 'delivered') return <FaBox className="icon delivered" />;
        if (s === 'returned') return <FaHistory className="icon returned" />;
        return <FaClock className="icon" />;
    };

    const getStatusLabel = (status) => {
        const s = status?.toLowerCase();
        if (s === 'unfulfilled') return 'Confirmed';
        if (s === 'packed') return 'Processing';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    if (loading) {
        return (
            <div className="tracking-loading">
                <div className="loader"></div>
                <p>Establishing live connection...</p>
            </div>
        );
    }

    if (!order) return null;

    // Map the new granular fulfillmentStatus to progress bar
    const fStatus = order.fulfillmentStatus;
    const currentStatusIndex = fStatus === 'delivered' ? 3 : fStatus === 'shipped' ? 2 : fStatus === 'packed' ? 1 : 0;

    const progressSteps = [
        { id: 'unfulfilled', label: 'Confirmed', icon: <FaCheckCircle /> },
        { id: 'packed', label: 'Packed & Ready', icon: <FaClock /> },
        { id: 'shipped', label: 'On its Way', icon: <FaTruck /> },
        { id: 'delivered', label: 'Arrived', icon: <FaBox /> }
    ];

    return (
        <div className="order-tracking-container fade-in">
            <div className="tracking-header">
                <div className="header-top">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <FaChevronLeft /> <span>Account</span>
                    </button>
                    <div className="live-status-indicator">
                        <span className="pulse-dot"></span>
                        Live Tracking Active
                    </div>
                </div>
                <div className="header-main">
                    <h1>Order #{order.orderNumber}</h1>
                    <div className="last-update">
                        Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>
            </div>

            <div className="tracking-content">
                {/* Progress Bar */}
                <div className="tracking-progress-section">
                    <div className="progress-steps-container">
                        {progressSteps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`progress-step ${index <= currentStatusIndex ? 'active' : ''} ${index < currentStatusIndex ? 'completed' : ''}`}
                            >
                                <div className="step-icon">
                                    {step.icon}
                                </div>
                                <div className="step-label">{step.label}</div>
                            </div>
                        ))}
                        <div className="progress-line">
                            <div
                                className="progress-line-fill"
                                style={{ width: `${(currentStatusIndex / (progressSteps.length - 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="tracking-details-grid">
                    {/* Timeline Section */}
                    <div className="timeline-section">
                        <div className="section-title-wrap">
                            <h3>Tracking History</h3>
                            <button className="btn-refresh-mini" onClick={() => fetchOrderDetails(false)} title="Force Refresh">
                                <FaSync />
                            </button>
                        </div>
                        <div className="tracking-timeline">
                            {order.trackingHistory && order.trackingHistory.length > 0 ? (
                                order.trackingHistory.slice().reverse().map((event, index) => (
                                    <div key={index} className="timeline-item">
                                        <div className="timeline-icon-container">
                                            {getStatusIcon(event.status)}
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-status">
                                                {getStatusLabel(event.status)}
                                                <span className="timeline-time">
                                                    {new Date(event.timestamp).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="timeline-message">{event.message}</div>
                                            {event.location && (
                                                <div className="timeline-location">
                                                    <FaMapMarkerAlt /> {event.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-history">
                                    <FaClock />
                                    <p>We're preparing your shipment. History events will appear here once processed.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="tracking-info-sidebar">
                        <div className="info-card premium">
                            <h4>Current Parcel Status</h4>
                            <div className="info-item highlight">
                                <div className={`status-pill ${order.fulfillmentStatus}`}>
                                    {getStatusLabel(order.fulfillmentStatus)}
                                </div>
                            </div>
                            {order.trackingNumber && (
                                <div className="info-item courier-box">
                                    <div className="courier-icon"><FaTruck /></div>
                                    <div>
                                        <label>Tracking ID</label>
                                        <span className="tracking-number">{order.trackingNumber}</span>
                                    </div>
                                </div>
                            )}
                            {order.estimatedDeliveryDate && (
                                <div className="info-item">
                                    <FaCalendarAlt />
                                    <div>
                                        <label>Expected Arrival</label>
                                        <span>{new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="info-card">
                            <h4>Delivery Address</h4>
                            <div className="address-display">
                                <p className="customer-name">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                                <p className="address-line">{order.shippingAddress.address}</p>
                                <p className="address-line">{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                                <p className="phone-line"><FaPhoneAlt /> {order.shippingAddress.phone}</p>
                            </div>
                        </div>

                        <button className="btn-receipt-modern" onClick={() => navigate(`/orders/${order._id}`)}>
                            <FaFileAlt /> Download Receipt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
