import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getOrderById } from '../../api/api';
import { FaCheckCircle, FaPrint, FaArrowLeft, FaBoxOpen } from 'react-icons/fa';
import './OrderReceipt.css';

export default function OrderReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await getOrderById(id);
        setOrder(res.data?.data || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div className="receipt-loading">
      <div className="spinner"></div>
      <p>Loading your receipt...</p>
    </div>
  );

  if (!order) return (
    <div className="receipt-error">
      <h2>Order not found</h2>
      <Link to="/account" className="btn-secondary">Go to My Account</Link>
    </div>
  );

  const { shippingAddress = {} } = order;

  return (
    <div className="receipt-page">
      <div className="receipt-card">
        {/* Success Header */}
        <div className="receipt-header">
          <div className="success-icon-wrapper">
            <FaCheckCircle />
          </div>
          <h1>Order Confirmed!</h1>
          <p className="order-number">Order #{order.orderNumber}</p>
          <p className="success-message">
            Thank you for your purchase. A confirmation email has been sent to <strong>{shippingAddress.email}</strong>.
          </p>
        </div>

        {/* Order Details Grid */}
        <div className="receipt-details-grid">
          <div className="detail-group">
            <h3>Date</h3>
            <p>{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="detail-group">
            <h3>Payment Method</h3>
            <p className="payment-method">
              {order.paymentMethod === 'mpesa' ? 'M-Pesa' :
                order.paymentMethod === 'cod' ? 'Cash on Delivery' :
                  order.paymentMethod.toUpperCase()}
            </p>
          </div>
          <div className="detail-group">
            <h3>Total Amount</h3>
            <p className="total-highlight">KES {order.total.toLocaleString()}</p>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="receipt-section">
          <h3>Shipping To</h3>
          <address className="shipping-address">
            <strong>{shippingAddress.firstName} {shippingAddress.lastName}</strong><br />
            {shippingAddress.address}<br />
            {shippingAddress.city}, {shippingAddress.county}<br />
            {shippingAddress.phone}
          </address>
        </div>

        {/* Items List */}
        <div className="receipt-items-section">
          <h3>Order Summary</h3>
          <div className="receipt-items-list">
            {order.items.map((item, i) => (
              <div key={item._id || i} className="receipt-item">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">Size: {item.size} | Qty: {item.quantity}</span>
                </div>
                <div className="item-price">
                  KES {(item.price * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="receipt-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>KES {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="total-row">
              <span>Shipping</span>
              <span>KES {order.shippingCost.toLocaleString()}</span>
            </div>

            <div className="total-row grand-total">
              <span>Total</span>
              <span>KES {order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="receipt-actions">
          <button onClick={() => window.print()} className="btn-outline">
            <FaPrint /> Print Receipt
          </button>
          <button onClick={() => navigate('/account')} className="btn-primary">
            <FaBoxOpen /> Track Order / View History
          </button>
        </div>

        <div className="back-link">
          <Link to="/"><FaArrowLeft /> Return to Shop</Link>
        </div>
      </div>
    </div>
  );
}