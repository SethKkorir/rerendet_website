// Checkout.js - Main Checkout Component
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { createOrder, processMpesaPayment, downloadInvoice, getMpesaStatus } from '../../api/api';
import { countries } from '../../utils/countries';
import {
  FaShoppingBag,
  FaMapMarkerAlt,
  FaCreditCard,
  FaPhone,
  FaLock,
  FaArrowLeft,
  FaCheckCircle,
  FaTruck,
  FaWallet,
  FaStripe,
  FaDownload
} from 'react-icons/fa';
import './Checkout.css';

function Checkout() {
  const { cart, cartCount, clearCart, user, showSuccess, showError, publicSettings, userLocation } = useContext(AppContext);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPaymentId, setMpesaPaymentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Polling for M-Pesa Status
  React.useEffect(() => {
    let interval;
    if (showMpesaModal && mpesaPaymentId && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const { data } = await getMpesaStatus(mpesaPaymentId);
          if (data.data.status === 'SUCCESS') {
            setPaymentStatus('success');
            clearInterval(interval);
            setTimeout(() => {
              setShowMpesaModal(false);
              setOrderSuccess(true);
              clearCart();
            }, 2000);
          } else if (data.data.status === 'FAILED') {
            setPaymentStatus('failed');
            clearInterval(interval);
            if (showError) showError('Payment Failed: ' + (data.data.metadata?.failureReason || 'Transaction declined'));
          }
        } catch (err) {
          console.error('Polling Error:', err);
        }
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [showMpesaModal, mpesaPaymentId, paymentStatus, clearCart, showError]);

  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Kenya',
    postalCode: ''
  });

  // Pre-fill user data or detected location
  React.useEffect(() => {
    if (user) {
      setShippingInfo(prev => ({
        ...prev,
        firstName: user.shippingInfo?.firstName || user.firstName || prev.firstName,
        lastName: user.shippingInfo?.lastName || user.lastName || prev.lastName,
        email: user.shippingInfo?.email || user.email || prev.email,
        phone: user.shippingInfo?.phone || user.phone || prev.phone || '',
        address: user.shippingInfo?.address || prev.address,
        city: user.shippingInfo?.city || prev.city,
        // Map 'zip' from DB to 'postalCode' in state
        postalCode: user.shippingInfo?.zip || user.shippingInfo?.postalCode || prev.postalCode,
        country: user.shippingInfo?.country || prev.country
      }));

      // Auto-fill M-Pesa number if available
      if (user.wallet?.mpesaPhone || user.phone) {
        setMpesaNumber(prev => (prev ? prev : (user.wallet?.mpesaPhone || user.phone || '')));
      }
    } else if (userLocation) {
      // GUEST: Use detected IP location if available
      setShippingInfo(prev => ({ ...prev, country: userLocation }));
    }
  }, [user, userLocation]);

  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: ''
  });

  const steps = [
    { id: 1, label: 'Shipping', icon: <FaTruck /> },
    { id: 2, label: 'Payment', icon: <FaCreditCard /> },
    { id: 3, label: 'Confirm', icon: <FaLock /> }
  ];

  // Currency & Payment Logic
  const isKenya = shippingInfo.country === 'Kenya';
  const currency = isKenya ? 'KES' : 'USD';
  const exchangeRate = 130; // 1 USD = 130 KES approx.

  const convertPrice = (priceInKes) => {
    if (isKenya) return priceInKes;
    return priceInKes / exchangeRate;
  };

  const formatPrice = (amount) => {
    const value = convertPrice(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  // Calculate totals
  // Calculate totals

  const taxRate = publicSettings?.payment?.taxRate || 0;
  const shippingPrice = publicSettings?.payment?.shippingPrice || 0;
  const freeShippingThreshold = publicSettings?.payment?.freeShippingThreshold || 0;

  const subtotalRaw = (cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Logic: if threshold is 0, it means always free? Or if subtotal > threshold?
  // Let's assume if threshold > 0 and subtotal > threshold, then free.
  // If threshold is 0, effectively free shipping based on previous logic? 
  // Actually, let's stick to the settings:
  // If shippingPrice is 0, it's 0.
  let shippingFeeRaw = shippingPrice;
  if (freeShippingThreshold > 0 && subtotalRaw >= freeShippingThreshold) {
    shippingFeeRaw = 0;
  }

  const taxRaw = subtotalRaw * taxRate;
  const totalRaw = subtotalRaw + shippingFeeRaw + taxRaw;
  console.log('Checkout Totals:', { subtotalRaw, taxRaw, shippingFeeRaw, totalRaw, settings: publicSettings?.payment });

  // Update payment method if country changes (e.g. remove M-Pesa if not Kenya)
  React.useEffect(() => {
    if (!isKenya && paymentMethod === 'mpesa') {
      setPaymentMethod('card');
    }
  }, [isKenya, paymentMethod]);

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // OPTIMISTIC UI: Show modal immediately for M-Pesa
    if (paymentMethod === 'mpesa') {
      setPaymentStatus('processing');
      setShowMpesaModal(true);
    } else {
      setLoading(true);
    }

    try {
      // Construct Order Payload
      const orderPayload = {
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: item.price,
          product: item._id || item.product,
          size: item.size
        })),
        shippingAddress: {
          address: shippingInfo.address,
          city: shippingInfo.city,
          county: shippingInfo.city,
          postalCode: '',
          country: shippingInfo.country,
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          phone: shippingInfo.phone,
          email: shippingInfo.email
        },
        paymentMethod,
        subtotal: subtotalRaw,
        shippingCost: shippingFeeRaw,
        tax: taxRaw,
        totalAmount: totalRaw,
        currency: currency,
        notes: ''
      };

      // Create Order
      const { data: responseData } = await createOrder(orderPayload);
      const order = responseData.data;
      setLastOrderId(order._id);

      // Handle M-Pesa Payment
      if (paymentMethod === 'mpesa') {
        const phoneToUse = mpesaNumber || shippingInfo.phone;

        try {
          const mpesaRes = await processMpesaPayment({
            orderId: order._id,
            phoneNumber: phoneToUse
          });

          setMpesaPaymentId(mpesaRes.data.data.paymentId);
          setPaymentStatus('pending'); // Updates Modal to "Check your phone"

        } catch (mpesaError) {
          console.error("M-Pesa STK Error:", mpesaError);
          setPaymentStatus('failed'); // Show error in modal
        }

      } else {
        setOrderSuccess(true);
        clearCart();
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment/Order failed:', error);
      if (paymentMethod === 'mpesa') {
        setPaymentStatus('failed');
      } else {
        if (showError) {
          showError(error.response?.data?.message || 'Failed to place order');
        }
        setLoading(false);
      }
    }
  };

  const handleDownloadInvoice = async () => {
    if (!lastOrderId) return;
    try {
      setLoading(true);
      const response = await downloadInvoice(lastOrderId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${lastOrderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Invoice download failed:', error);
      if (showError) showError('Failed to download invoice');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethod = () => {
    switch (paymentMethod) {
      case 'mpesa':
        return (
          <div className="mpesa-section">
            <h3>M-Pesa Payment</h3>
            <div className="mpesa-form">
              <div className="form-group full-width">
                <label>Phone Number <span className="required">*</span></label>
                <div className="mpesa-input-group">
                  <span className="country-code">+254</span>
                  <input
                    type="tel"
                    value={mpesaNumber}
                    onChange={(e) => setMpesaNumber(e.target.value)}
                    placeholder="7XX... or 07XX..."
                    maxLength="15"
                    required
                  />
                </div>
                <p className="mpesa-note">
                  You'll receive a payment request on this number. Please confirm the transaction.
                </p>
              </div>
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="card-section">
            <h3>Card Details</h3>
            <div className="card-form">
              <div className="form-group full-width">
                <label>Card Number <span className="required">*</span></label>
                <div className="card-element-wrapper">
                  <input
                    type="text"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    required
                  />
                </div>
              </div>

              <div className="card-row">
                <div className="form-group">
                  <label>Expiry Date <span className="required">*</span></label>
                  <input
                    type="text"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    placeholder="MM/YY"
                    maxLength="5"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>CVC <span className="required">*</span></label>
                  <input
                    type="text"
                    value={cardDetails.cvc}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                    placeholder="123"
                    maxLength="3"
                    required
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Cardholder Name <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (orderSuccess) {
    return (
      <div
        className="checkout-page"
        style={{
          backgroundImage: "url('/images/coffee/dark-forest.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="checkout-container">
          <div className="success-wrapper">
            <div className="success-card">
              <div className="success-icon-wrapper">
                <div className="success-icon-circle">
                  <FaCheckCircle />
                </div>
              </div>
              <h2>Order Confirmed!</h2>
              <p>Thank you for your purchase. We have received your order and attached the invoice to your confirmation email.</p>

              {/* Display Order ID if available (needs state or grab from recent context) */}
              <div className="order-id-pill">
                Order #{Math.floor(Math.random() * 1000000)} {/* Simplified for now unless we store exact ID */}
              </div>

              <div className="checkout-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
                <button
                  className="back-btn"
                  onClick={handleDownloadInvoice}
                  style={{ width: '100%' }}
                >
                  <FaDownload /> Download Invoice
                </button>
                <button
                  className="place-order-btn"
                  onClick={() => window.location.href = '/shop'} /* Force reload/clean state */
                  style={{ width: '100%' }}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="checkout-page"
      style={{
        backgroundImage: "url('/images/coffee/dark-forest.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {showMpesaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '380px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'slideUp 0.3s ease-out',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {/* Header Section */}
            <div style={{
              backgroundColor: paymentStatus === 'success' ? '#10B981' :
                paymentStatus === 'failed' ? '#EF4444' : '#ffffff',
              padding: '2.5rem 1.5rem 2rem',
              textAlign: 'center',
              color: (paymentStatus === 'pending' || paymentStatus === 'processing') ? '#111827' : '#ffffff',
              transition: 'all 0.3s ease',
              borderBottom: (paymentStatus === 'pending' || paymentStatus === 'processing') ? '1px solid #f3f4f6' : 'none'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                backgroundColor: (paymentStatus === 'pending' || paymentStatus === 'processing') ? '#ffffff' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: paymentStatus === 'success' ? '#10B981' :
                  paymentStatus === 'failed' ? '#EF4444' : '#111827'
              }}>
                {(paymentStatus === 'pending' || paymentStatus === 'processing') ? (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '3px solid #f3f4f6',
                    borderTopColor: '#10B981',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <FaCheckCircle style={{ fontSize: '3rem' }} />
                )}
              </div>

              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                {paymentStatus === 'processing' ? 'Sending Request...' :
                  paymentStatus === 'pending' ? 'Check your phone' :
                    paymentStatus === 'success' ? 'Payment Successful!' : 'Payment Failed'}
              </h3>

              {paymentStatus === 'success' && (
                <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '1.125rem', fontWeight: 500 }}>
                  {formatPrice(totalRaw)}
                </p>
              )}
            </div>

            {/* Content Section */}
            <div style={{ padding: '1.5rem 2rem 2rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
              {(paymentStatus === 'pending' || paymentStatus === 'processing') && (
                <>
                  <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                    {paymentStatus === 'processing'
                      ? 'Please wait whilst we initiate the secure payment connection...'
                      : <span>A request has been sent to your phone number <strong>{mpesaNumber}</strong>. Please enter your M-Pesa PIN to complete the transaction.</span>
                    }
                  </p>
                  <button
                    onClick={() => {
                      setShowMpesaModal(false);
                      setOrderSuccess(true);
                      clearCart();
                      if (showSuccess) showSuccess('Order placed! We will verify payment shortly.');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)',
                      marginBottom: '1rem'
                    }}
                  >
                    I have paid
                  </button>
                  <button
                    onClick={() => setShowMpesaModal(false)}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#6b7280',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancel Payment
                  </button>
                </>
              )}

              {paymentStatus === 'success' && (
                <>
                  <div style={{ margin: '0 0 1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      <span>Transaction ID</span>
                      <span style={{ color: '#111827', fontWeight: 500, fontFamily: 'monospace' }}>
                        {mpesaPaymentId ? mpesaPaymentId.split('-')[0].toUpperCase() : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span>Ref ID</span>
                      <span style={{ color: '#111827', fontWeight: 500, fontFamily: 'monospace' }}>
                        {lastOrderId ? lastOrderId.substring(lastOrderId.length - 8).toUpperCase() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowMpesaModal(false); setOrderSuccess(true); clearCart(); }}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    OK
                  </button>
                </>
              )}

              {paymentStatus === 'failed' && (
                <>
                  <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                    We couldn't process your payment. Please try again or use a different payment method.
                  </p>
                  <button
                    onClick={() => setShowMpesaModal(false)}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: '#EF4444',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
          <style>{`
            @keyframes slideUp { 
              from { transform: translateY(20px); opacity: 0; } 
              to { transform: translateY(0); opacity: 1; } 
            } 
            @keyframes spin { 
              0% { transform: rotate(0deg); } 
              100% { transform: rotate(360deg); } 
            }
          `}</style>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="checkout-container">
        <div className="checkout-header">
          <h1>Checkout</h1>
          <p>Complete your order in a few simple steps</p>
        </div>

        {/* Progress Steps */}
        <div className="checkout-steps">
          {steps.map(step => (
            <div key={step.id} className="checkout-step">
              <div className={`step-icon ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                {step.icon}
              </div>
              <span className={`step-label ${currentStep >= step.id ? 'active' : ''}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="checkout-content">
          {/* Main Checkout Area */}
          <div className="checkout-main">
            {currentStep === 1 && (
              <div className="checkout-section">
                <div className="section-header">
                  <h2><FaMapMarkerAlt /> Shipping Information</h2>
                </div>

                <form onSubmit={handleShippingSubmit} className="checkout-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Last Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email <span className="required">*</span></label>
                      <input
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone Number <span className="required">*</span></label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Address <span className="required">*</span></label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Country <span className="required">*</span></label>
                      <select
                        value={shippingInfo.country}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                        required
                      >
                        {countries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>City <span className="required">*</span></label>
                      <input
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        required
                      />
                    </div>
                  </div>



                  <div className="checkout-actions">
                    <button
                      type="button"
                      className="back-btn"
                      onClick={() => navigate('/cart')}
                    >
                      <FaArrowLeft /> Back to Cart
                    </button>

                    <button
                      type="submit"
                      className="place-order-btn"
                    >
                      Continue to Payment <FaCreditCard />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="checkout-section">
                <div className="section-header">
                  <h2><FaCreditCard /> Payment Method</h2>
                </div>

                <div className="payment-methods">
                  {isKenya && (
                    <div
                      className={`payment-method ${paymentMethod === 'mpesa' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('mpesa')}
                    >
                      <div className="payment-radio"></div>
                      <div className="payment-icon">
                        <FaWallet />
                      </div>
                      <div className="payment-info">
                        <h3>M-Pesa</h3>
                        <p>Pay instantly with M-Pesa</p>
                      </div>
                    </div>
                  )}

                  <div
                    className={`payment-method ${paymentMethod === 'card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="payment-radio"></div>
                    <div className="payment-icon">
                      <FaStripe />
                    </div>
                    <div className="payment-info">
                      <h3>Credit/Debit Card</h3>
                      <p>Pay with Visa, MasterCard, or American Express</p>
                    </div>
                  </div>
                </div>

                {renderPaymentMethod()}

                <div className="checkout-actions">
                  <button
                    type="button"
                    className="back-btn"
                    onClick={() => setCurrentStep(1)}
                  >
                    <FaArrowLeft /> Back to Shipping
                  </button>

                  <button
                    type="submit"
                    className="place-order-btn"
                    onClick={handlePaymentSubmit}
                    disabled={!paymentMethod}
                  >
                    Place Order <FaLock />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h2>Order Summary</h2>

              <div className="order-items">
                {(cart || []).map(item => (
                  <div key={item.id} className="order-item">
                    <img
                      src={item.image ? (item.image.startsWith('http') ? item.image : `http://localhost:5004${item.image.startsWith('/') ? '' : '/'}${item.image}`) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2UzZTNlMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjEyIj5Db2ZmZWU8L3RleHQ+PC9zdmc+'}
                      alt={item.name}
                      className="item-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2MzYzRjNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZmZmIiBmb250LXNpemU9IjEyIj5Db2ZmZWU8L3RleHQ+PC9zdmc+';
                      }}
                    />
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      <div className="item-meta">
                        {item.size && `Size: ${item.size}`} • Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="item-price">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-totals">
                <div className="total-row">
                  <span className="total-label">Subtotal</span>
                  <span className="total-value">{formatPrice(subtotalRaw)}</span>
                </div>

                <div className="total-row">
                  <span className="total-label">Tax (16%)</span>
                  <span className="total-value">{formatPrice(taxRaw)}</span>
                </div>

                <div className="total-row">
                  <span className="total-label">Shipping</span>
                  <span className="total-value">
                    {shippingFeeRaw === 0 ? 'FREE' : formatPrice(shippingFeeRaw)}
                  </span>
                </div>

                <div className="total-row">
                  <span className="total-label">Total</span>
                  <span className="total-value">{formatPrice(totalRaw)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;