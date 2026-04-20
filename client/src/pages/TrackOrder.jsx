// src/pages/TrackOrder.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaTruck, FaCoffee, FaArrowRight, FaBoxOpen } from 'react-icons/fa';
import { AppContext } from '../context/AppContext';
import './TrackOrder.css';

const TrackOrder = () => {
    const [orderId, setOrderId] = useState('');
    const [loading, setLoading] = useState(false);
    const { showNotification } = useContext(AppContext);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!orderId.trim()) {
            showNotification('Please enter a valid Order ID or Number', 'warning');
            return;
        }

        setLoading(true);
        // We just navigate to the tracking result page. 
        // The tracking page itself will handle the validation/fetch.
        setTimeout(() => {
            navigate(`/order-tracking/${orderId.trim()}`);
        }, 500);
    };

    return (
        <div className="track-order-page">
            <div className="track-hero">
                <div className="track-container">
                    <motion.div
                        className="track-card"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <div className="track-card-header">
                            <div className="track-icon-badge">
                                <FaTruck />
                            </div>
                            <h1>Track Your Premium Coffee</h1>
                            <p>Enter your Order Number or ID found in your confirmation email to see real-time updates on your shipment.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="track-form">
                            <div className="track-input-group">
                                <div className="track-input-wrapper">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="ORD-XXXXX-XXXX"
                                        value={orderId}
                                        onChange={(e) => setOrderId(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="track-btn">
                                    {loading ? (
                                        <div className="track-spinner"></div>
                                    ) : (
                                        <>
                                            <span>Locate Order</span>
                                            <FaArrowRight />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="track-features">
                            <div className="track-feat">
                                <div className="feat-icon"><FaCoffee /></div>
                                <span>Roast Stats</span>
                            </div>
                            <div className="track-feat">
                                <div className="feat-icon"><FaBoxOpen /></div>
                                <span>Packing Live</span>
                            </div>
                            <div className="track-feat">
                                <div className="feat-icon"><FaTruck /></div>
                                <span>Path to Peak</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Decorative Orbs */}
            <div className="track-orb track-orb-1"></div>
            <div className="track-orb track-orb-2"></div>
        </div>
    );
};

export default TrackOrder;
