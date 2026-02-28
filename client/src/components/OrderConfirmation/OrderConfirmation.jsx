// components/OrderConfirmation/OrderConfirmation.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaCheckCircle, FaCoffee, FaTruck, FaDownload,
    FaHome, FaReceipt, FaStar, FaLeaf, FaMagic,
    FaEnvelope, FaShieldAlt, FaCreditCard, FaMapMarkerAlt,
    FaClock, FaGift, FaArrowRight, FaUser, FaList
} from 'react-icons/fa';
import './OrderConfirmation.css';

/* ── Confetti particle ── */
const Particle = ({ style }) => <div className="oc-particle" style={style} />;

const generateParticles = (count = 60) =>
    Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2.5}s`,
        duration: `${2.5 + Math.random() * 2}s`,
        color: ['#D4AF37', '#6F4E37', '#A07828', '#ffffff', '#10B981'][i % 5],
        size: `${6 + Math.random() * 8}px`,
        rotate: `${Math.random() * 360}deg`,
    }));

const STEPS = [
    { icon: FaCheckCircle, label: 'Confirmed', desc: 'Secured in our system', color: '#10B981' },
    { icon: FaMagic, label: 'Processing', desc: 'Roasters crafting your batch', color: '#D4AF37' },
    { icon: FaTruck, label: 'Shipped', desc: 'En route to your door', color: '#3b82f6' },
    { icon: FaGift, label: 'Delivered', desc: 'Enjoy your brew!', color: '#8b5cf6' },
];

const OrderConfirmation = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showNotification, token, refreshOrders } = useContext(AppContext);

    const [order, setOrder] = useState(location.state?.order || null);
    const [loading, setLoading] = useState(!location.state?.order);
    const [showBurst, setShowBurst] = useState(true);
    const [particles] = useState(() => generateParticles(60));
    const [activeStep, setActiveStep] = useState(0);
    const headerRef = useRef(null);

    useEffect(() => {
        refreshOrders?.();
        if (!order && id) fetchOrder();
        const t1 = setTimeout(() => setShowBurst(false), 3500);
        // Animate steps sequentially
        const t2 = setTimeout(() => setActiveStep(1), 800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/orders/${id}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.success) setOrder(result.data);
            else throw new Error(result.message);
        } catch (err) {
            showNotification('Failed to load order details', 'error');
            navigate('/account/orders');
        } finally { setLoading(false); }
    };

    const handleDownloadInvoice = async () => {
        try {
            showNotification('Opening digital invoice…', 'info');
            const res = await fetch(`/api/orders/${id}/invoice`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            // We don't revoke immediately so the new tab can load it
        } catch { showNotification('Failed to open invoice', 'error'); }
    };

    const getEstimatedDelivery = () => {
        const d = new Date(order.createdAt);
        d.setDate(d.getDate() + 3);
        return d.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const getPaymentLabel = (method) => {
        const map = { mpesa: 'M-Pesa', card: 'Card', cod: 'Cash on Delivery' };
        return map[method?.toLowerCase()] || method?.toUpperCase() || '—';
    };

    /* ── Loading ── */
    if (loading) return (
        <div className="oc-loading">
            <div className="oc-spinner" />
            <p>Curating your order details…</p>
        </div>
    );
    if (!order) return null;

    /* ── Render ── */
    return (
        <div className="oc-page">

            {/* Confetti burst */}
            <AnimatePresence>
                {showBurst && (
                    <motion.div
                        className="oc-confetti-wrap"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {particles.map(p => (
                            <Particle key={p.id} style={{
                                left: p.left,
                                animationDelay: p.delay,
                                animationDuration: p.duration,
                                background: p.color,
                                width: p.size,
                                height: p.size,
                                transform: `rotate(${p.rotate})`,
                            }} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="oc-container">

                {/* ══ HERO HEADER ══ */}
                <motion.div
                    className="oc-hero"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    ref={headerRef}
                >
                    <div className="oc-hero-glow" />

                    <motion.div
                        className="oc-check-ring"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
                    >
                        <FaCheckCircle className="oc-check-icon" />
                        <div className="oc-ring oc-ring-1" />
                        <div className="oc-ring oc-ring-2" />
                    </motion.div>

                    <motion.h1
                        className="oc-headline"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        Excellence Confirmed
                    </motion.h1>

                    <motion.p
                        className="oc-subline"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        Your order is confirmed. Our roasters are already preparing your fresh coffee selection.
                    </motion.p>

                    {/* Order number pill */}
                    <motion.div
                        className="oc-order-pill"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <FaReceipt className="oc-pill-icon" />
                        <div>
                            <span className="oc-pill-label">Order Signature</span>
                            <span className="oc-pill-number">#{order.orderNumber}</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* ══ JOURNEY STEPPER ══ */}
                <motion.div
                    className="oc-stepper-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <h2 className="oc-section-title">The Coffee's Journey</h2>
                    <div className="oc-stepper">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isDone = idx <= activeStep;
                            const isCurrent = idx === activeStep;
                            return (
                                <React.Fragment key={idx}>
                                    <div className={`oc-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                        <motion.div
                                            className="oc-step-bubble"
                                            style={isDone ? { background: step.color, borderColor: step.color } : {}}
                                            animate={isCurrent ? { scale: [1, 1.12, 1] } : {}}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        >
                                            <Icon />
                                        </motion.div>
                                        <div className="oc-step-text">
                                            <span className="oc-step-label">{step.label}</span>
                                            <span className="oc-step-desc">
                                                {idx === 2 ? `Est. ${getEstimatedDelivery()}` : step.desc}
                                            </span>
                                        </div>
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div className={`oc-step-connector ${idx < activeStep ? 'filled' : ''}`}>
                                            <div className="oc-step-line" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </motion.div>

                {/* ══ INFO CARDS ROW ══ */}
                <div className="oc-cards-row">

                    {/* Email notice */}
                    <motion.div
                        className="oc-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <div className="oc-card-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                            <FaEnvelope />
                        </div>
                        <div>
                            <h3 className="oc-card-title">Stay Informed</h3>
                            <p className="oc-card-text">
                                A confirmation receipt has been sent to{' '}
                                <strong>{order.shippingAddress?.email}</strong>.
                                Check your inbox for updates.
                            </p>
                        </div>
                    </motion.div>

                    {/* Payment */}
                    <motion.div
                        className="oc-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.62 }}
                    >
                        <div className="oc-card-icon-wrap" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                            <FaCreditCard />
                        </div>
                        <div className="oc-card-body">
                            <h3 className="oc-card-title">Payment</h3>
                            <div className="oc-info-rows">
                                <div className="oc-info-row">
                                    <span>Method</span>
                                    <strong>{getPaymentLabel(order.paymentMethod)}</strong>
                                </div>
                                <div className="oc-info-row">
                                    <span>Status</span>
                                    <span className={`oc-badge ${order.paymentStatus}`}>
                                        {order.paymentStatus === 'paid' ? '✓ Secured' : '⏳ Pending'}
                                    </span>
                                </div>
                                <div className="oc-info-row total-row">
                                    <span>Total</span>
                                    <strong className="oc-total-amt">KSh {order.total?.toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Delivery */}
                    <motion.div
                        className="oc-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.68 }}
                    >
                        <div className="oc-card-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                            <FaMapMarkerAlt />
                        </div>
                        <div>
                            <h3 className="oc-card-title">Delivery</h3>
                            <p className="oc-card-addr">
                                {order.shippingAddress?.address}<br />
                                {order.shippingAddress?.city}, {order.shippingAddress?.county}<br />
                                {order.shippingAddress?.country}
                            </p>
                            <div className="oc-eta-pill">
                                <FaClock /> Est. {getEstimatedDelivery()}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ══ ORDER ITEMS ══ */}
                <motion.div
                    className="oc-items-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.72 }}
                >
                    <div className="oc-items-header">
                        <h2 className="oc-section-title">The Selection</h2>
                        <span className="oc-items-count">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="oc-items-list">
                        {order.items?.map((item, i) => (
                            <motion.div
                                key={i}
                                className="oc-item"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.75 + i * 0.08 }}
                            >
                                <div className="oc-item-img-wrap">
                                    <img src={item.image || '/default-product.jpg'} alt={item.name} />
                                </div>
                                <div className="oc-item-info">
                                    <h4 className="oc-item-name">{item.name}</h4>
                                    <div className="oc-item-meta-row">
                                        <span className="oc-item-tag">{item.size}</span>
                                        <span className="oc-item-tag">Qty: {item.quantity}</span>
                                        <span className="oc-item-tag">Hand-picked</span>
                                    </div>
                                </div>
                                <div className="oc-item-price">
                                    <span className="oc-item-unit">KSh {item.price?.toLocaleString()} × {item.quantity}</span>
                                    <strong className="oc-item-total">KSh {(item.price * item.quantity).toLocaleString()}</strong>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Summary strip */}
                    <div className="oc-summary-strip">
                        <div className="oc-sum-row">
                            <span>Subtotal</span>
                            <span>KSh {order.subtotal?.toLocaleString()}</span>
                        </div>
                        {order.shippingCost > 0 && (
                            <div className="oc-sum-row">
                                <span>Shipping</span>
                                <span>KSh {order.shippingCost?.toLocaleString()}</span>
                            </div>
                        )}
                        {order.discountAmount > 0 && (
                            <div className="oc-sum-row discount">
                                <span>Discount</span>
                                <span>− KSh {order.discountAmount?.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="oc-sum-row grand-total">
                            <span>Total</span>
                            <strong>KSh {order.total?.toLocaleString()}</strong>
                        </div>
                    </div>
                </motion.div>

                {/* ══ CTA BUTTONS ══ */}
                <motion.div
                    className="oc-actions"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                >
                    <button className="oc-btn primary" onClick={() => navigate(`/order-tracking/${id || order?._id}`)}>
                        <FaTruck /> Live Tracking
                    </button>
                    <button className="oc-btn outline" onClick={() => navigate('/account')}>
                        <FaUser /> Go to Dashboard
                    </button>
                    <button className="oc-btn outline" onClick={handleDownloadInvoice}>
                        <FaReceipt /> Digital Invoice
                    </button>
                    <button className="oc-btn ghost" onClick={() => navigate('/')}>
                        <FaHome /> Return Home
                    </button>
                </motion.div>

                {/* ══ FOOTER TRUST CARDS ══ */}
                <motion.div
                    className="oc-trust-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    <div className="oc-trust-card">
                        <div className="oc-trust-icon"><FaLeaf /></div>
                        <h4>Freshness Guarantee</h4>
                        <p>Every bean roasted within 24 hours of dispatch for peak aromatic profile.</p>
                    </div>
                    <div className="oc-trust-card">
                        <div className="oc-trust-icon"><FaStar /></div>
                        <h4>Join the Circle</h4>
                        <p>Rate your brew once it arrives and unlock exclusive member rewards.</p>
                    </div>
                    <div className="oc-trust-card">
                        <div className="oc-trust-icon"><FaShieldAlt /></div>
                        <h4>Secure Purchase</h4>
                        <p>Your payment and personal data are protected with bank-grade encryption.</p>
                    </div>
                </motion.div>

            </div>{/* /oc-container */}
        </div>
    );
};

export default OrderConfirmation;
