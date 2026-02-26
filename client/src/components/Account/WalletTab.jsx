import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaCreditCard, FaMobileAlt, FaWallet, FaPlus } from 'react-icons/fa';

const WalletTab = () => {
    const { user, updateUserProfile, loading, showNotification } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);
    const [mpesaPhone, setMpesaPhone] = useState(user?.wallet?.mpesaPhone || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUserProfile({
                wallet: { mpesaPhone }
            });
            showNotification('Payment method updated successfully', 'success');
            setIsEditing(false);
        } catch (error) {
            showNotification(error.message || 'Failed to update wallet', 'error');
        }
    };

    return (
        <div className="modern-dashboard-tab">
            <div className="tab-header">
                <div>
                    <h2>Wallet & Payment</h2>
                    <p>Manage your saved payment methods.</p>
                </div>
            </div>

            <div className="payment-methods-grid">
                {/* M-Pesa Card */}
                <div className="payment-method-card mpesa-card">
                    <div className="card-top">
                        <div className="method-icon mpesa">
                            <img src="/mpesa-logo.png" alt="M-Pesa" onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }} style={{ height: '24px' }} />
                            <FaMobileAlt style={{ display: 'none', fontSize: '24px' }} />
                        </div>
                        {user?.wallet?.mpesaPhone && <span className="badge-default">Default</span>}
                    </div>

                    <div className="card-details">
                        <h4>M-Pesa Mobile Money</h4>
                        {user?.wallet?.mpesaPhone ? (
                            <p className="method-value">{user.wallet.mpesaPhone}</p>
                        ) : (
                            <p className="method-value text-muted">No number saved</p>
                        )}
                    </div>

                    <div className="card-actions">
                        <button
                            className="btn-outline btn-sm full-width"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {user?.wallet?.mpesaPhone ? 'Edit Number' : 'Add Number'}
                        </button>
                    </div>
                </div>

                {/* Coming Soon / Add New */}
                <div className="payment-method-card add-new-card">
                    <div className="add-content">
                        <div className="icon-circle">
                            <FaCreditCard />
                        </div>
                        <h4>Credit / Debit Card</h4>
                        <p>Coming Soon</p>
                    </div>
                </div>
            </div>

            {/* Editing Form Overlay/Section */}
            {isEditing && (
                <div className="content-card info-card" style={{ marginTop: '2rem' }}>
                    <div className="card-header">
                        <h3>Update M-Pesa Number</h3>
                        <button className="btn-close" onClick={() => setIsEditing(false)}>×</button>
                    </div>
                    <form className="modern-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>M-Pesa Phone Number</label>
                            <div className="input-with-icon">
                                <FaMobileAlt className="input-icon" />
                                <input
                                    type="tel"
                                    value={mpesaPhone}
                                    onChange={(e) => setMpesaPhone(e.target.value)}
                                    placeholder="07XX XXX XXX"
                                    required
                                />
                            </div>
                            <small className="form-text">This number will be pre-filled during checkout.</small>
                        </div>

                        <div className="form-actions right-aligned">
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Phone Number'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default WalletTab;
