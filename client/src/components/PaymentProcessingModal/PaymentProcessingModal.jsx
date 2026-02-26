// components/PaymentProcessingModal/PaymentProcessingModal.jsx
import React, { useEffect, useState } from 'react';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaPhone, FaCreditCard, FaLock } from 'react-icons/fa';
import './PaymentProcessingModal.css';

const PaymentProcessingModal = ({
    isOpen,
    paymentMethod,
    amount,
    phone,
    onSuccess,
    onFailure,
    onCancel
}) => {
    const [status, setStatus] = useState('processing'); // processing, success, failed
    const [message, setMessage] = useState('');
    const [transactionId, setTransactionId] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setStatus('processing');
            setMessage('');
            setTransactionId('');
            return;
        }

        if (paymentMethod === 'mpesa') {
            simulateMpesaPayment();
        } else if (paymentMethod === 'card') {
            simulateCardPayment();
        }
    }, [isOpen, paymentMethod]);

    const simulateMpesaPayment = async () => {
        setStatus('processing');
        setMessage(`Sending Secure STK Push to ${phone}...`);

        await new Promise(resolve => setTimeout(resolve, 1500));
        setMessage('Awaiting M-Pesa pin authorization...');

        await new Promise(resolve => setTimeout(resolve, 1500));

        // 90% success rate for realism
        const success = Math.random() > 0.1;

        if (success) {
            const txId = `MPE${Date.now()}${Math.floor(Math.random() * 1000)}`;
            setTransactionId(txId);
            setStatus('success');
            setMessage('Payment Authorized Successfully!');

            setTimeout(() => {
                onSuccess({ transactionId: txId, method: 'mpesa' });
            }, 1500);
        } else {
            setStatus('failed');
            setMessage('M-Pesa authorization failed or timed out');
            setTimeout(() => {
                onFailure('Payment was cancelled or failed by user');
            }, 2500);
        }
    };

    const simulateCardPayment = async () => {
        setStatus('processing');
        setMessage('Authorizing secured card payment...');

        await new Promise(resolve => setTimeout(resolve, 2000));
        setMessage('Verifying with bank gateway...');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const success = Math.random() > 0.05;

        if (success) {
            const txId = `CRD${Date.now()}${Math.floor(Math.random() * 1000)}`;
            setTransactionId(txId);
            setStatus('success');
            setMessage('Payment Processed Successfully!');

            setTimeout(() => {
                onSuccess({ transactionId: txId, method: 'card' });
            }, 1500);
        } else {
            setStatus('failed');
            setMessage('Card was declined by the issuer.');
            setTimeout(() => {
                onFailure('Card payment failed');
            }, 2500);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay">
            <div className="payment-modal">
                <div className="payment-modal-content">
                    {/* Icon */}
                    <div className={`payment-icon-container ${status}`}>
                        {status === 'processing' && (
                            <FaSpinner className="spinner" />
                        )}
                        {status === 'success' && (
                            <FaCheckCircle className="success-icon" />
                        )}
                        {status === 'failed' && (
                            <FaTimesCircle className="error-icon" />
                        )}
                    </div>

                    {/* Payment Method Badge */}
                    <div className="payment-method-badge">
                        {paymentMethod === 'mpesa' ? (
                            <><FaPhone /> M-Pesa Express</>
                        ) : (
                            <><FaCreditCard /> Secured Card Payment</>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="payment-amount">
                        KSh {amount.toLocaleString()}
                    </div>

                    {/* Message */}
                    <div className={`payment-message ${status}`}>
                        {message}
                    </div>

                    {/* Transaction ID */}
                    {transactionId && (
                        <div className="transaction-id">
                            <span className="label">Reference ID</span>
                            <span className="value">{transactionId}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="payment-actions">
                        {status === 'processing' && (
                            <button className="btn-modal btn-cancel" onClick={onCancel}>
                                Cancel Transaction
                            </button>
                        )}
                        {status === 'failed' && (
                            <button className="btn-modal btn-retry" onClick={onCancel}>
                                Try Different Method
                            </button>
                        )}
                    </div>

                    {/* Premium Instructions */}
                    {status === 'processing' && paymentMethod === 'mpesa' && (
                        <div className="payment-instructions">
                            <p><span className="step-num">1</span> 📱 Unlock your phone now</p>
                            <p><span className="step-num">2</span> 🔢 Enter M-Pesa PIN in the pop-up</p>
                            <p><span className="step-num">3</span> ☕ Your coffee will be ready soon!</p>
                        </div>
                    )}

                    {status === 'processing' && paymentMethod === 'card' && (
                        <div className="payment-instructions" style={{ textAlign: 'center', background: '#F0F9FF', border: 'none' }}>
                            <p style={{ justifyContent: 'center', color: '#0369A1' }}>
                                <FaLock /> Your financial data is protected by AES-256 bank-level security.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentProcessingModal;
