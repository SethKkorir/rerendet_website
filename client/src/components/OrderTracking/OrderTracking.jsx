// components/OrderTracking/OrderTracking.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaBox, FaTruck, FaCheckCircle, FaClock, FaMapMarkerAlt, FaCalendarAlt, FaChevronLeft } from 'react-icons/fa';
import './OrderTracking.css';

const OrderTracking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification, token } = useContext(AppContext);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/orders/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Order not found');

            const result = await response.json();
            if (result.success) {
                setOrder(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Fetch order error:', error);
            showNotification('Failed to load tracking details', 'error');
            navigate('/account');
        } finally {
            setLoading(false);
        }
    };

    const downloadInvoice = async () => {
        try {
            const response = await fetch(`/api/orders/${id}/invoice`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to download invoice');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${order.orderNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showNotification('Invoice downloaded successfully', 'success');
        } catch (error) {
            console.error('Invoice download failed:', error);
            showNotification('Failed to download invoice', 'error');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'confirmed': return <FaCheckCircle className="icon confirmed" />;
            case 'processing': return <FaClock className="icon processing" />;
            case 'shipped': return <FaTruck className="icon shipped" />;
            case 'delivered': return <FaBox className="icon delivered" />;
            default: return <FaClock className="icon" />;
        }
    };

    const getStatusLabel = (status) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (loading) {
        return (
            <div className="tracking-loading">
                <div className="loader"></div>
                <p>Fetching your order status...</p>
            </div>
        );
    }

    if (!order) return null;

    const currentStatusIndex = ['confirmed', 'processing', 'shipped', 'delivered'].indexOf(order.status);
    const progressSteps = [
        { id: 'confirmed', label: 'Confirmed', icon: <FaCheckCircle /> },
        { id: 'processing', label: 'Processing', icon: <FaClock /> },
        { id: 'shipped', label: 'Shipped', icon: <FaTruck /> },
        { id: 'delivered', label: 'Delivered', icon: <FaBox /> }
    ];

    return (
        <div className="order-tracking-container">
            <div className="tracking-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <FaChevronLeft /> Back
                </button>
                <h1>Track Your Order</h1>
                <div className="order-number-badge">
                    Order #{order.orderNumber}
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
                        <h3>Tracking History</h3>
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
                                            <div className="timeline-message">{event.note || event.message}</div>
                                            {event.location && (
                                                <div className="timeline-location">
                                                    <FaMapMarkerAlt /> {event.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-history">No tracking history available yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="tracking-info-sidebar">
                        <div className="info-card">
                            <h4>Shipping Details</h4>
                            <div className="info-item">
                                <FaBox />
                                <div>
                                    <label>Status</label>
                                    <span>{getStatusLabel(order.status)}</span>
                                </div>
                            </div>
                            {order.shippingDetails?.courier && (
                                <div className="info-item">
                                    <FaTruck />
                                    <div>
                                        <label>Courier</label>
                                        <span>{order.shippingDetails.courier}</span>
                                    </div>
                                </div>
                            )}
                            {(order.shippingDetails?.trackingNumber || order.trackingNumber) && (
                                <div className="info-item">
                                    <FaBox />
                                    <div>
                                        <label>Tracking Number</label>
                                        <span className="tracking-number">{order.shippingDetails?.trackingNumber || order.trackingNumber}</span>
                                        {order.shippingDetails?.trackingUrl && (
                                            <a href={order.shippingDetails.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '12px', color: '#B45309', marginTop: '4px' }}>
                                                Track on Courier Site &rarr;
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                            {(order.shippingDetails?.estimatedDelivery || order.estimatedDeliveryDate) && (
                                <div className="info-item">
                                    <FaCalendarAlt />
                                    <div>
                                        <label>Estimated Delivery</label>
                                        <span>{new Date(order.shippingDetails?.estimatedDelivery || order.estimatedDeliveryDate).toLocaleDateString('en-US', {
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
                                <p><strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong></p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                                <p>{order.shippingAddress.country}</p>
                                <p>{order.shippingAddress.phone}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button className="btn-receipt" onClick={() => navigate(`/orders/${order._id}`)} style={{ flex: 1 }}>
                                View Full Receipt
                            </button>
                            <button className="btn-receipt" onClick={downloadInvoice} style={{ flex: 1, background: '#6F4E37', color: 'white' }}>
                                Download Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
