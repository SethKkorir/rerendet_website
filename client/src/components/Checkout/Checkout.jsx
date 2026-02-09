// components/Checkout/Checkout.jsx - WITH PAYMENT MODAL INTEGRATION
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaLock, FaCreditCard, FaMoneyBillWave, FaPhone, FaTruck, FaUser, FaInfoCircle } from 'react-icons/fa';
import PaymentProcessingModal from '../PaymentProcessingModal/PaymentProcessingModal';
import './Checkout.css';
import './payment-sections.css';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';

const KENYAN_COUNTIES = Object.keys(KENYA_LOCATIONS);

function Checkout() {
  const {
    user,
    cart = [],
    showNotification,
    clearCart,
    token,
    isAuthenticated,
    publicSettings
  } = useContext(AppContext);

  const navigate = useNavigate();

  const [shippingInfo, setShippingInfo] = useState({
    firstName: user?.shippingInfo?.firstName || user?.firstName || '',
    lastName: user?.shippingInfo?.lastName || user?.lastName || '',
    email: user?.email || '',
    phone: user?.shippingInfo?.phone || user?.phone || '+254 ',
    address: user?.shippingInfo?.address || '',
    county: user?.shippingInfo?.county || '',
    city: user?.shippingInfo?.city || '',
    country: user?.shippingInfo?.country || 'Kenya',
    postalCode: user?.shippingInfo?.zip || '' // Map zip from profile to postalCode
  });

  // Update form when user data is loaded, but don't overwrite existing entries
  useEffect(() => {
    if (user) {
      setShippingInfo(prev => ({
        ...prev,
        firstName: prev.firstName || user.shippingInfo?.firstName || user.firstName || '',
        lastName: prev.lastName || user.shippingInfo?.lastName || user.lastName || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.shippingInfo?.phone || user.phone || '+254 ',
        address: prev.address || user.shippingInfo?.address || '',
        city: prev.city || user.shippingInfo?.city || '',
        county: prev.county || user.shippingInfo?.county || '',
        postalCode: prev.postalCode || user.shippingInfo?.zip || '',
        country: prev.country || user.shippingInfo?.country || 'Kenya'
      }));
    }
  }, [user]);

  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [loading, setLoading] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [errors, setErrors] = useState({});

  // Payment-specific state
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '+254 ');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Calculate totals
  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);


  const [shippingCost, setShippingCost] = useState(0);
  const tax = subtotal * 0.16;
  const total = subtotal + shippingCost + tax;

  // Determine enabled payment methods from settings (default to all true if loading/undefined)
  const enabledMethods = useMemo(() => {
    const methods = publicSettings?.payment?.paymentMethods || { mpesa: true, card: true, cashOnDelivery: true };
    return {
      mpesa: methods.mpesa !== false,
      card: methods.card !== false,
      cod: methods.cashOnDelivery !== false
    };
  }, [publicSettings]);

  // Auto-select valid payment method if current is disabled
  useEffect(() => {
    if (!enabledMethods[paymentMethod] && paymentMethod !== 'cod') {
      // Note: 'cod' in state maps to 'cashOnDelivery' in settings, handled below
    }

    // Check if current selected method is disabled
    const isCurrentDisabled =
      (paymentMethod === 'mpesa' && !enabledMethods.mpesa) ||
      (paymentMethod === 'card' && !enabledMethods.card) ||
      (paymentMethod === 'cod' && !enabledMethods.cod);

    if (isCurrentDisabled) {
      if (enabledMethods.mpesa) setPaymentMethod('mpesa');
      else if (enabledMethods.card) setPaymentMethod('card');
      else if (enabledMethods.cod) setPaymentMethod('cod');
    }
  }, [enabledMethods, paymentMethod]);

  // Calculate shipping when county changes
  useEffect(() => {
    if (shippingInfo.county) {
      calculateShipping();
    }
  }, [shippingInfo.county]);

  const calculateShipping = async () => {
    if (!shippingInfo.county) {
      setShippingCost(0);
      return;
    }

    setCalculatingShipping(true);
    try {
      const response = await fetch('/api/orders/shipping-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          country: shippingInfo.country,
          county: shippingInfo.county
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShippingCost(result.data.shippingCost);
        }
      }
    } catch (error) {
      console.error('Shipping calculation error:', error);
      const defaultCost = shippingInfo.county === 'Nairobi' ? 200 : 350;
      setShippingCost(defaultCost);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!shippingInfo.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!shippingInfo.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!shippingInfo.email?.trim()) newErrors.email = 'Email is required';
    if (!shippingInfo.phone?.trim() || shippingInfo.phone.trim().length < 10) newErrors.phone = 'Please enter a full phone number';
    if (!shippingInfo.address?.trim()) newErrors.address = 'Address is required';
    if (!shippingInfo.county?.trim()) newErrors.county = 'County is required';
    if (!shippingInfo.city?.trim()) newErrors.city = 'City/Town is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (shippingInfo.email && !emailRegex.test(shippingInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCartItems = () => {
    if (cart.length === 0) {
      throw new Error('Your cart is empty');
    }

    for (const item of cart) {
      const productId = item.productId || item._id;
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;

      if (!productId || !objectIdRegex.test(productId)) {
        throw new Error(`Invalid product: ${item.name}`);
      }
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`Invalid quantity for: ${item.name}`);
      }
      if (!item.price || item.price < 0) {
        throw new Error(`Invalid price for: ${item.name}`);
      }
      if (!item.size) {
        throw new Error(`Size selection required for: ${item.name}`);
      }
    }
  };

  const prepareCartItems = () => {
    return cart.map(item => {
      const productId = item.productId || item._id;
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;

      if (!objectIdRegex.test(productId)) {
        throw new Error(`Invalid product ID for "${item.name}"`);
      }

      return {
        product: productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        image: item.images?.[0]?.url || '/default-product.jpg'
      };
    });
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      showNotification('Please log in to place an order', 'error');
      navigate('/login');
      return;
    }

    if (!validateForm()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    // COD-specific validation
    if (paymentMethod === 'cod') {
      if (total > 10000) {
        showNotification('COD is only available for orders under KSh 10,000', 'error');
        return;
      }
      if (!codConfirmed) {
        showNotification('Please confirm you have cash available for COD', 'error');
        return;
      }
    }

    // M-Pesa validation
    if (paymentMethod === 'mpesa') {
      if (!mpesaPhone || mpesaPhone === '+254 ') {
        showNotification('Please enter your M-Pesa phone number', 'error');
        return;
      }
    }

    // Card validation
    if (paymentMethod === 'card') {
      if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv || !cardDetails.cardholderName) {
        showNotification('Please fill in all card details', 'error');
        return;
      }
    }

    try {
      validateCartItems();
    } catch (error) {
      showNotification(error.message, 'error');
      return;
    }

    // Show payment modal for M-Pesa and Card
    if (paymentMethod === 'mpesa' || paymentMethod === 'card') {
      setShowPaymentModal(true);
    } else {
      // Process COD directly
      await processOrder();
    }
  };

  // Process order after payment success or for COD
  const processOrder = async (paymentData = null) => {
    setLoading(true);

    try {
      const preparedCartItems = prepareCartItems();

      const orderData = {
        shippingAddress: shippingInfo,
        paymentMethod: paymentMethod,
        items: preparedCartItems,
        subtotal: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        totalAmount: total,
        notes: '',
        paymentData: paymentData
      };

      console.log('📦 Sending order data:', orderData);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Server error' }));
        console.error('❌ Order failed:', errorData);
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Order placed successfully:', result);

      if (result.success) {
        clearCart();
        showNotification('Order placed successfully!', 'success');

        // Ensure we have a valid ID before navigating
        const orderId = result.data._id || result.data.id;
        if (orderId) {
          navigate(`/order-confirmation/${orderId}`, {
            state: { order: result.data }
          });
        } else {
          showNotification('Order placed, but redirection failed. Please check your account.', 'warning');
          navigate('/account/orders');
        }
      } else {
        throw new Error(result.message || 'Order failed');
      }

    } catch (error) {
      console.error('❌ Order error:', error);
      showNotification(error.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'county') {
      setShippingInfo(prev => ({
        ...prev,
        county: value,
        city: '' // Clear city when county changes
      }));
    } else {
      setShippingInfo(prev => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Payment input handlers
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16) {
      const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
      setCardDetails(prev => ({ ...prev, cardNumber: formatted }));
    }
  };

  const handleExpiryChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    let formatted = value;
    if (value.length >= 2) {
      formatted = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    setCardDetails(prev => ({ ...prev, expiryDate: formatted }));
  };

  const handleCVVChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCardDetails(prev => ({ ...prev, cvv: value }));
    }
  };

  const handleMpesaPhoneChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith('+254')) {
      value = '+254 ';
    }
    const digits = value.slice(4).replace(/\D/g, '');
    if (digits.length <= 9) {
      setMpesaPhone('+254 ' + digits);
    }
  };

  // Payment modal handlers
  const handlePaymentSuccess = async (paymentData) => {
    setShowPaymentModal(false);
    await processOrder(paymentData);
  };

  const handlePaymentFailure = (message) => {
    setShowPaymentModal(false);
    showNotification(message || 'Payment failed. Please try again.', 'error');
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      showNotification('Please log in to checkout', 'info');
      navigate('/login');
    } else if (user && (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin')) {
      showNotification('Administrators cannot access the checkout page.', 'warning');
      navigate('/admin');
    }
  }, [isAuthenticated, user, navigate, showNotification]);

  if (cart.length === 0) {
    return (
      <div className="checkout-empty">
        <div className="empty-container">
          <h2>Your cart is empty</h2>
          <p>Add some delicious coffee to get started!</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Payment Processing Modal */}
        <PaymentProcessingModal
          isOpen={showPaymentModal}
          paymentMethod={paymentMethod}
          amount={total}
          phone={mpesaPhone}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onCancel={handlePaymentCancel}
        />

        <div className="checkout-header">
          <h1>Checkout</h1>
        </div>

        <div className="checkout-content">
          <div className="checkout-forms">
            <div className="form-section">
              <div className="section-header">
                <FaUser className="section-icon" />
                <h2>Shipping Information</h2>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={shippingInfo.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={shippingInfo.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'error' : ''}
                    placeholder="your@email.com"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={errors.phone ? 'error' : ''}
                    placeholder="+254 712 345 678"
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    value={shippingInfo.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={errors.address ? 'error' : ''}
                    placeholder="Street address, apartment, suite, etc."
                  />
                  {errors.address && <span className="error-message">{errors.address}</span>}
                </div>

                <div className="form-group">
                  <label>County *</label>
                  <select
                    value={shippingInfo.county}
                    onChange={(e) => handleInputChange('county', e.target.value)}
                    className={errors.county ? 'error' : ''}
                  >
                    <option value="">Select County</option>
                    {KENYAN_COUNTIES.map((county, index) => (
                      <option key={`${county}-${index}`} value={county}>{county}</option>
                    ))}
                  </select>
                  {errors.county && <span className="error-message">{errors.county}</span>}
                </div>

                <div className="form-group">
                  <label>City/Town *</label>
                  <select
                    value={shippingInfo.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={errors.city ? 'error' : ''}
                    disabled={!shippingInfo.county}
                  >
                    <option value="">Select City/Town</option>
                    {shippingInfo.county && KENYA_LOCATIONS[shippingInfo.county]?.map((city, index) => (
                      <option key={`${city}-${index}`} value={city}>{city}</option>
                    ))}
                    {shippingInfo.county && <option value="Other">Other (Manual Entry)</option>}
                  </select>
                  {errors.city && <span className="error-message">{errors.city}</span>}
                </div>

                {shippingInfo.city === 'Other' && (
                  <div className="form-group">
                    <label>Specify City/Town *</label>
                    <input
                      type="text"
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, manualCity: e.target.value }))}
                      placeholder="Enter town name"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Country</label>
                  <select
                    value={shippingInfo.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  >
                    <option value="Kenya">Kenya</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <FaLock className="section-icon" />
                <h2>Payment Method</h2>
              </div>

              <div className="payment-options">
                {enabledMethods.mpesa && (
                  <div
                    className={`payment-option ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('mpesa')}
                  >
                    <div className="payment-icon">
                      <FaPhone />
                    </div>
                    <div className="payment-info">
                      <h4>M-Pesa</h4>
                      <p>Pay securely with M-Pesa</p>
                    </div>
                    <div className="payment-radio">
                      <div className={`radio-dot ${paymentMethod === 'mpesa' ? 'active' : ''}`}></div>
                    </div>
                  </div>
                )}

                {enabledMethods.card && (
                  <div
                    className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="payment-icon">
                      <FaCreditCard />
                    </div>
                    <div className="payment-info">
                      <h4>Credit/Debit Card</h4>
                      <p>Pay with Visa, Mastercard</p>
                    </div>
                    <div className="payment-radio">
                      <div className={`radio-dot ${paymentMethod === 'card' ? 'active' : ''}`}></div>
                    </div>
                  </div>
                )}

                {enabledMethods.cod && (
                  <div
                    className={`payment-option ${paymentMethod === 'cod' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    <div className="payment-icon">
                      <FaMoneyBillWave />
                    </div>
                    <div className="payment-info">
                      <h4>Cash on Delivery</h4>
                      <p>Pay when you receive your order</p>
                    </div>
                    <div className="payment-radio">
                      <div className={`radio-dot ${paymentMethod === 'cod' ? 'active' : ''}`}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Payment Inputs */}
              {paymentMethod === 'mpesa' && (
                <div className="payment-details-section mpesa-section">
                  <div className="form-group">
                    <label>M-Pesa Phone Number *</label>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={handleMpesaPhoneChange}
                      placeholder="+254 712 345 678"
                      maxLength="14"
                    />
                    <p className="payment-note">
                      <FaPhone className="note-icon" />
                      You will receive an STK push on this number to complete payment
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="payment-details-section card-section">
                  <div className="form-group">
                    <label>Cardholder Name *</label>
                    <input
                      type="text"
                      value={cardDetails.cardholderName}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, cardholderName: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="form-group">
                    <label>Card Number *</label>
                    <input
                      type="text"
                      value={cardDetails.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                    />
                  </div>

                  <div className="card-row">
                    <div className="form-group">
                      <label>Expiry Date *</label>
                      <input
                        type="text"
                        value={cardDetails.expiryDate}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        maxLength="5"
                      />
                    </div>
                    <div className="form-group">
                      <label>CVV *</label>
                      <input
                        type="text"
                        value={cardDetails.cvv}
                        onChange={handleCVVChange}
                        placeholder="123"
                        maxLength="4"
                      />
                    </div>
                  </div>

                  <p className="payment-note">
                    <FaLock className="note-icon" />
                    Your card details are secure and encrypted
                  </p>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="payment-details-section cod-section">
                  <div className="cod-notice">
                    <FaInfoCircle className="info-icon" />
                    <div className="notice-content">
                      <h4>Cash on Delivery</h4>
                      <p>Pay KSh {total.toLocaleString()} when you receive your order</p>
                    </div>
                  </div>

                  {total > 10000 && (
                    <div className="cod-limit-warning">
                      <FaInfoCircle />
                      <p>⚠️ COD is only available for orders under KSh 10,000. Please choose another payment method.</p>
                    </div>
                  )}

                  <label className="cod-confirmation">
                    <input
                      type="checkbox"
                      checked={codConfirmed}
                      onChange={(e) => setCodConfirmed(e.target.checked)}
                    />
                    <span>I confirm I have cash available for payment on delivery</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="order-summary">
            <div className="summary-header">
              <h3>Order Summary</h3>
              <span>{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
            </div>

            <div className="summary-items">
              {cart.map((item, index) => (
                <div key={index} className="summary-item">
                  <div className="item-image">
                    <img
                      src={item.images?.[0]?.url || '/default-product.jpg'}
                      alt={item.name}
                    />
                  </div>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      <span className="item-size">Size: {item.size}</span>
                      <span className="item-quantity">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-price">
                      KSh {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>
                  Shipping
                  {calculatingShipping && <span className="calculating">Calculating...</span>}
                </span>
                <span>KSh {shippingCost.toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>Tax (16% VAT)</span>
                <span>KSh {tax.toLocaleString()}</span>
              </div>
              <div className="total-row grand-total">
                <span>Total Amount</span>
                <span>KSh {total.toLocaleString()}</span>
              </div>
            </div>

            <button
              className="btn-primary place-order-btn"
              onClick={handlePlaceOrder}
              disabled={loading || calculatingShipping}
            >
              {loading ? 'Processing Your Order...' : `Place Order - KSh ${total.toLocaleString()}`}
            </button>

            <div className="security-notice">
              <FaLock />
              <span>Your payment information is secure and encrypted.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;