import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaLock, FaCreditCard, FaMoneyBillWave, FaPhone,
  FaTruck, FaUser, FaInfoCircle, FaShieldAlt,
  FaArrowRight, FaMapMarkerAlt, FaEnvelope, FaExclamationCircle, FaPercent, FaSync
} from 'react-icons/fa';
import PaymentProcessingModal from '../PaymentProcessingModal/PaymentProcessingModal';
import './Checkout.css';
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
    postalCode: user?.shippingInfo?.zip || ''
  });

  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [loading, setLoading] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [errors, setErrors] = useState({});
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '+254 ');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState('monthly');

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const discount = useMemo(() => {
    let totalDiscount = 0;
    if (couponData) {
      if (couponData.discountType === 'percentage') {
        totalDiscount += subtotal * (couponData.discountAmount / 100);
      } else {
        totalDiscount += couponData.discountAmount;
      }
    }
    if (isSubscription) {
      totalDiscount += subtotal * 0.05;
    }
    return Math.round(totalDiscount);
  }, [subtotal, couponData, isSubscription]);

  const [shippingCost, setShippingCost] = useState(0);
  const total = Math.max(0, subtotal - discount + shippingCost);

  const enabledMethods = useMemo(() => {
    const methods = publicSettings?.payment?.paymentMethods || { mpesa: true, card: true, cashOnDelivery: true };
    return {
      mpesa: methods.mpesa !== false,
      card: methods.card !== false,
      cod: methods.cashOnDelivery !== false
    };
  }, [publicSettings]);

  useEffect(() => {
    if (!isAuthenticated) {
      showNotification('Please log in to checkout', 'info');
      navigate('/login');
    }
  }, [isAuthenticated, navigate, showNotification]);

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
      }));
    }
  }, [user]);

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
      setShippingCost(shippingInfo.county === 'Nairobi' ? 200 : 350);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const response = await fetch('/api/orders/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: couponCode, subtotal })
      });
      const result = await response.json();
      if (result.success) {
        setCouponData(result.data);
        showNotification('Coupon applied!', 'success');
      } else {
        setCouponData(null);
        showNotification(result.message || 'Invalid coupon', 'error');
      }
    } catch (err) {
      showNotification('Failed to validate coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod === 'cod' && total > 10000) {
      showNotification('COD limited to KSh 10k', 'error');
      return;
    }
    if (paymentMethod === 'mpesa' || paymentMethod === 'card') {
      setShowPaymentModal(true);
    } else {
      await processOrder();
    }
  };

  const processOrder = async (paymentData = null) => {
    setLoading(true);
    try {
      const orderData = {
        shippingAddress: shippingInfo,
        paymentMethod,
        items: cart.map(item => ({
          product: item.productId || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.images?.[0]?.url || '/default-product.jpg'
        })),
        subtotal,
        shippingCost,
        totalAmount: total,
        couponCode: couponData?.code,
        isSubscription,
        subscriptionFrequency: isSubscription ? subscriptionFrequency : undefined,
        paymentData
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      if (result.success) {
        clearCart();
        showNotification('Order placed!', 'success');
        navigate(`/order-confirmation/${result.data._id || result.data.id}`);
      } else {
        throw new Error(result.message || 'Order failed');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }));
  };

  if (cart.length === 0) {
    return (
      <div className="empty-checkout-state">
        <h2>Your cart is quiet</h2>
        <button className="btn-luxury" onClick={() => navigate('/')}>Browse Collection</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-forms-column">
          <div className="checkout-header">
            <h1>Fine Selection Checkout</h1>
          </div>

          <PaymentProcessingModal
            isOpen={showPaymentModal}
            paymentMethod={paymentMethod}
            amount={total}
            phone={mpesaPhone}
            onSuccess={(data) => { setShowPaymentModal(false); processOrder(data); }}
            onFailure={(msg) => { setShowPaymentModal(false); showNotification(msg, 'error'); }}
            onCancel={() => setShowPaymentModal(false)}
          />

          <section className="checkout-form-section">
            <div className="section-head"><FaTruck /> <h2>Delivery</h2></div>
            <div className="form-grid">
              <input type="text" placeholder="First Name" value={shippingInfo.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className="premium-input" />
              <input type="text" placeholder="Last Name" value={shippingInfo.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className="premium-input" />
              <input type="email" placeholder="Email" value={shippingInfo.email} onChange={(e) => handleInputChange('email', e.target.value)} className="premium-input full-width" />
              <input type="text" placeholder="Address" value={shippingInfo.address} onChange={(e) => handleInputChange('address', e.target.value)} className="premium-input full-width" />
              <select value={shippingInfo.county} onChange={(e) => handleInputChange('county', e.target.value)} className="premium-input">
                <option value="">County</option>
                {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={shippingInfo.city} onChange={(e) => handleInputChange('city', e.target.value)} className="premium-input" disabled={!shippingInfo.county}>
                <option value="">City</option>
                {shippingInfo.county && KENYA_LOCATIONS[shippingInfo.county]?.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
              <input type="tel" placeholder="Phone" value={shippingInfo.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="premium-input full-width" />
            </div>
          </section>

          <section className="checkout-form-section">
            <div className="section-head"><FaShieldAlt /> <h2>Payment</h2></div>
            <div className="payment-grid">
              <div className={`payment-card ${paymentMethod === 'mpesa' ? 'active' : ''}`} onClick={() => setPaymentMethod('mpesa')}><FaPhone /> <h4>M-Pesa</h4></div>
              <div className={`payment-card ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}><FaCreditCard /> <h4>Card</h4></div>
              <div className={`payment-card ${paymentMethod === 'cod' ? 'active' : ''}`} onClick={() => setPaymentMethod('cod')}><FaMoneyBillWave /> <h4>COD</h4></div>
            </div>
            {paymentMethod === 'mpesa' && (
              <div className="payment-detail-box">
                <input type="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} className="premium-input" placeholder="M-Pesa Number" />
              </div>
            )}
            {paymentMethod === 'cod' && (
              <div className="payment-detail-box">
                <label><input type="checkbox" checked={codConfirmed} onChange={(e) => setCodConfirmed(e.target.checked)} /> Confirm COD</label>
              </div>
            )}
          </section>
        </div>

        <aside className="checkout-summary-sidebar">
          <div className="summary-glass-card">
            <h3>Your Selection <span>{cart.length} items</span></h3>
            <div className="summary-items-list">
              {cart.map((item, i) => (
                <div className="checkout-item" key={i}>
                  <img src={item.images?.[0]?.url || '/default-product.jpg'} alt={item.name} />
                  <div className="item-info">
                    <h5>{item.name}</h5>
                    <p>{item.size} • Qty {item.quantity}</p>
                    <div className="item-total">KSh {(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="subscription-opt-in">
              <label className={`sub-checkbox ${isSubscription ? 'active' : ''}`}>
                <input type="checkbox" checked={isSubscription} onChange={(e) => setIsSubscription(e.target.checked)} />
                <div className="checkbox-content text-sm">
                  <FaSync className={isSubscription ? 'spin-slow' : ''} />
                  <strong>Subscribe & Save 5%</strong>
                </div>
              </label>
              {isSubscription && (
                <select value={subscriptionFrequency} onChange={(e) => setSubscriptionFrequency(e.target.value)} className="premium-select-mini">
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>

            <div className="coupon-section">
              <div className="coupon-input-wrapper">
                <input type="text" placeholder="Promo Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} disabled={!!couponData} />
                <button onClick={couponData ? () => { setCouponData(null); setCouponCode(''); } : handleValidateCoupon}>{couponData ? 'Remove' : 'Apply'}</button>
              </div>
            </div>

            <div className="sidebar-totals">
              <div className="sub-total-row"><span>Subtotal</span><span>KSh {subtotal.toLocaleString()}</span></div>
              {discount > 0 && <div className="sub-total-row discount"><span>Discount</span><span>- KSh {discount.toLocaleString()}</span></div>}
              <div className="sub-total-row"><span>Shipping</span><span>KSh {shippingCost.toLocaleString()}</span></div>
              <div className="grand-total-row"><span>Total</span><div className="total-amount">KSh {total.toLocaleString()}</div></div>
            </div>

            <button className="place-order-trigger" onClick={handlePlaceOrder} disabled={loading}>{loading ? 'Processing...' : 'Place Order'}</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Checkout;