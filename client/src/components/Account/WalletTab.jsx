import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaCreditCard, FaMobileAlt, FaEdit, FaEye } from 'react-icons/fa';
import { requestWalletReveal, verifyWalletReveal } from '../../api/api';
import { WalletRevealModal } from '../Modals/SecurityModals';

const WalletTab = () => {
    const { user, updateUserProfile, loading, showSuccess, showError, fetchUserOrders, token, showNotification } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);

    // Wallet Data State
    const [displayedWallet, setDisplayedWallet] = useState(user?.wallet || {});
    const [isRevealed, setIsRevealed] = useState(false);

    // Form State
    const [mpesaPhone, setMpesaPhone] = useState(user?.wallet?.mpesaPhone || '');

    // Modal State
    const [revealModalOpen, setRevealModalOpen] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Sync state with user context updates
    useEffect(() => {
        if (user?.wallet && !isRevealed) {
            setDisplayedWallet(user.wallet);
            setMpesaPhone(user.wallet.mpesaPhone || '');
        }
    }, [user, isRevealed]);

    const isMasked = (value) => value && value.includes('*');

    const handleRevealRequest = async () => {
        try {
            setVerifying(true);
            await requestWalletReveal();
            setRevealModalOpen(true);
            showNotification('Verification code sent to your email', 'info');
        } catch (error) {
            showError('Failed to send verification code');
        } finally {
            setVerifying(false);
        }
    };

    const handleVerifyReveal = async (code) => {
        try {
            setVerifying(true);
            const response = await verifyWalletReveal({ code });

            // Success: Update local state with unmasked data
            if (response.data.data) {
                setDisplayedWallet(response.data.data);
                setMpesaPhone(response.data.data.mpesaPhone);
                setIsRevealed(true);
                setRevealModalOpen(false);
                showSuccess('Identity verified. Wallet details revealed.');
            }
        } catch (error) {
            showError(error.response?.data?.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleEditClick = () => {
        if (isMasked(displayedWallet.mpesaPhone) && !isRevealed) {
            handleRevealRequest();
        } else {
            setIsEditing(!isEditing);
        }
    };

    // ... (keep transactions logic) ...
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(false);
    // Initial Load of Transactions (Orders)
    React.useEffect(() => {
        const loadTransactions = async () => {
            setLoadingTx(true);
            try {
                const data = await fetchUserOrders(1);
                if (data?.data?.orders) {
                    setTransactions(data.data.orders);
                }
            } catch (err) {
                console.error('Error fetching transactions:', err);
            } finally {
                setLoadingTx(false);
            }
        };
        loadTransactions();
    }, []);

    const downloadInvoice = async (orderId, orderNumber) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/invoice`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to download invoice');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${orderNumber}.pdf`;
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUserProfile({
                wallet: { mpesaPhone }
            });
            showSuccess('Wallet updated successfully');
            setIsEditing(false);
            // Assuming the profile update returns masked data, we might effectively "re-mask" here unless we handle it
            // Ideally, we'd keep it revealed, but re-fetch might overwrite. 
            // For now, accept re-masking as a security feature (session closed).
            setIsRevealed(false);
        } catch (error) {
            showError(error.message || 'Failed to update wallet');
        }
    };

    return (
        <div className="modern-dashboard-tab">
            <div className="tab-header">
                <h2>Wallet & Payment Methods</h2>
            </div>

            <WalletRevealModal
                isOpen={revealModalOpen}
                onClose={() => setRevealModalOpen(false)}
                onVerify={handleVerifyReveal}
                loading={verifying}
            />

            <div className="content-card">
                <div className="payment-method-item">
                    <div className="pm-icon mpesa">
                        <FaMobileAlt />
                    </div>
                    <div className="pm-details">
                        <h3>M-Pesa</h3>
                        <p className="text-muted">
                            {displayedWallet?.mpesaPhone ? (
                                <span className="wallet-value">
                                    Phone: {displayedWallet.mpesaPhone}
                                    {isMasked(displayedWallet.mpesaPhone) && (
                                        <button className="icon-btn-small ml-2" onClick={handleRevealRequest} title="Reveal Details">
                                            <FaEye />
                                        </button>
                                    )}
                                </span>
                            ) : 'No default M-Pesa number saved'}
                        </p>
                    </div>
                    <div className="pm-actions">
                        <button
                            className="btn-outline btn-sm"
                            onClick={handleEditClick}
                        >
                            {isEditing ? 'Cancel' : (displayedWallet?.mpesaPhone ? 'Edit' : 'Add')}
                        </button>
                    </div>
                </div>

                {isEditing && (
                    <form className="modern-form mt-4" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>M-Pesa Phone Number</label>
                            <input
                                type="tel"
                                value={mpesaPhone}
                                onChange={(e) => setMpesaPhone(e.target.value)}
                                placeholder="e.g., 0712345678"
                                required
                            />
                            <small className="form-text text-muted">This number will be used as the default for M-Pesa payments.</small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Phone Number'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="info-box mt-4">
                <FaCreditCard className="info-icon" />
                <p>Currently we only support M-Pesa payments. More payment methods coming soon.</p>
            </div>

            {/* Transaction History Section */}
            <div className="modern-section mt-5">
                <div className="section-header">
                    <h2>Transaction History</h2>
                </div>

                {loadingTx ? (
                    <div className="text-center p-4">Loading transactions...</div>
                ) : transactions.length > 0 ? (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Order ID</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx._id}>
                                        <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        <td>#{tx.orderNumber}</td>
                                        <td>KES {tx.total.toLocaleString()}</td>
                                        <td>
                                            <span className={`status-badge ${tx.status}`}>{tx.status}</span>
                                        </td>
                                        <td>
                                            <button className="btn-link" onClick={() => downloadInvoice(tx._id, tx.orderNumber)}>
                                                Download Invoice
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state-small">
                        <p>No transactions found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalletTab;
