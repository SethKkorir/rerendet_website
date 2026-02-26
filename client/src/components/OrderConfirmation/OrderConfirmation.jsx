// components/OrderConfirmation/OrderConfirmation.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
    FaCheckCircle, FaBox, FaCalendar, FaCreditCard,
    FaTruck, FaDownload, FaHome, FaReceipt, FaCoffee,
    FaEnvelope, FaStar, FaLeaf, FaMagic, FaArrowRight
} from 'react-icons/fa';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showNotification, token, refreshOrders } = useContext(AppContext);

    const [order, setOrder] = useState(location.state?.order || null);
    const [loading, setLoading] = useState(!location.state?.order);
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        refreshOrders();
        if (!order && id) {
            fetchOrder();
        }
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
    }, [id, order, refreshOrders]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/orders/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                setOrder(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Fetch order error:', error);
            showNotification('Failed to load order details', 'error');
            navigate('/account/orders');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async () => {
        try {
            showNotification('Preparing your premium invoice...', 'info');
            const response = await fetch(`/api/orders/${id}/invoice`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to download invoice');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${order.orderNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showNotification('Invoice downloaded successfully', 'success');
        } catch (error) {
            showNotification('Failed to download invoice', 'error');
        }
    };

    const getEstimatedDelivery = () => {
        const orderDate = new Date(order.createdAt);
        const deliveryDate = new Date(orderDate);
        deliveryDate.setDate(orderDate.getDate() + 3); // Faster estimate for premium feel
        return deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="order-confirmation-loading">
                <div className="loading-spinner"></div>
                <p>Curating your order details...</p>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="order-confirmation">
            {showConfetti && (
                <div className="confetti-container">
                    {[...Array(50)].map((_, i) => (
                        <div key={i} className="confetti" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            backgroundColor: ['#6F4E37', '#D4AF37', '#A67C52', '#FFFFFF'][Math.floor(Math.random() * 4)]
                        }}></div>
                    ))}
                </div>
            )}

            <div className="confirmation-header">
                <div className="success-icon">
                    <FaCheckCircle />
                </div>
                <h1>Excellence Confirmed.</h1>
                <p className="confirmation-message">
                    Your artisanal journey has begun. We've received your order and our master roasters are already preparing your selection.
                </p>
            </div>

            <div className="order-number-box">
                <FaReceipt className="receipt-icon" />
                <div className="order-number-content">
                    <span className="order-label">Order Signature</span>
                    <span className="order-number">#{order.orderNumber}</span>
                </div>
            </div>

            {/* WHAT'S NEXT ROADMAP */}
            <div className="roadmap-section">
                <h3 className="roadmap-title">The Coffee's Journey</h3>
                <div className="roadmap-container">
                    <div className="roadmap-step active">
                        <div className="step-point"><FaCheckCircle /></div>
                        <div className="step-info">
                            <h4>Order Confirmed</h4>
                            <p>We've received your request and secured your small-batch beans.</p>
                        </div>
                    </div>
                    <div className="roadmap-line"></div>
                    <div className="roadmap-step">
                        <div className="step-point"><FaMagic /></div>
                        <div className="step-info">
                            <h4>Artisanal Preparation</h4>
                            <p>Our roasters are hand-selecting and preparing your fresh coffee batches.</p>
                        </div>
                    </div>
                    <div className="roadmap-line"></div>
                    <div className="roadmap-step">
                        <div className="step-point"><FaTruck /></div>
                        <div className="step-info">
                            <h4>Premium Dispatch</h4>
                            <p>Estimated Arrival: <strong>{getEstimatedDelivery()}</strong></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="order-details-grid">
                <div className="info-card">
                    <div className="card-header">
                        <FaEnvelope />
                        <h3>Stay Informed</h3>
                    </div>
                    <div className="card-content">
                        <p className="notice-text">A confirmation receipt has been dispatched to <strong>{order.shippingAddress?.email}</strong>. Check your inbox for brewing secrets and real-time updates.</p>
                    </div>
                </div>

                <div className="info-card">
                    <div className="card-header">
                        <FaCreditCard />
                        <h3>Payment Status</h3>
                    </div>
                    <div className="card-content">
                        <div className="info-row">
                            <span className="info-label">Method:</span>
                            <span className="info-value">{order.paymentMethod.toUpperCase()}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Status:</span>
                            <span className={`status-badge ${order.paymentStatus}`}>
                                {order.paymentStatus === 'paid' ? 'Secured' : 'Pending'}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Total:</span>
                            <span className="info-value amount">KSh {order.total?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="order-items-section">
                <h3>The Selection</h3>
                <div className="items-list">
                    {order.items?.map((item, index) => (
                        <div key={index} className="order-item">
                            <div className="item-image">
                                <img src={item.image || '/default-product.jpg'} alt={item.name} />
                            </div>
                            <div className="item-details">
                                <h4>{item.name}</h4>
                                <p className="item-meta">{item.size} • Hand-picked selection</p>
                                <p className="item-qty">Quantity: {item.quantity}</p>
                            </div>
                            <div className="item-price">
                                <span>KSh {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="confirmation-actions">
                <button className="btn-primary" onClick={() => navigate(`/order-tracking/${order._id}`)}>
                    <FaTruck /> Live Tracking
                </button>
                <button className="btn-outline" onClick={handleDownloadInvoice}>
                    <FaDownload /> Digital Invoice
                </button>
                <button className="btn-secondary" onClick={() => navigate('/')}>
                    <FaHome /> Return Home
                </button>
            </div>

            {/* CURATED SECTION */}
            <div className="curated-footer">
                <div className="footer-card">
                    <FaLeaf />
                    <h4>Freshness Guarantee</h4>
                    <p>Every bean is roasted within 24 hours of dispatch to ensure peak aromatic profile.</p>
                </div>
                <div className="footer-card">
                    <FaStar />
                    <h4>Join the Circle</h4>
                    <p>Rate your brew once it arrives and unlock exclusive artisanal rewards.</p>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
