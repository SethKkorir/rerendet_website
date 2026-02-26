// src/components/Admin/OrdersManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaSearch, FaFilter, FaEye, FaEdit, FaShippingFast, FaSync, FaCheckCircle, FaTimesCircle, FaBoxOpen } from 'react-icons/fa';
import './OrdersManagement.css';

const StatusBadge = ({ status, type }) => {
  const colors = {
    // Payment
    paid: 'green',
    pending: 'orange',
    failed: 'red',
    refunded: 'gray',

    // Fulfillment
    unfulfilled: 'gray',
    packed: 'blue',
    shipped: 'purple',
    delivered: 'green',
    returned: 'red',

    // Order
    open: 'blue',
    completed: 'green',
    cancelled: 'red'
  };

  return (
    <span className={`status-badge ${colors[status] || 'gray'}`}>
      {status}
    </span>
  );
};

const OrdersManagement = () => {
  const { showNotification, token } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: Granular filters
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    fulfillmentStatus: 'all',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10
  });

  const [pagination, setPagination] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`/api/admin/orders?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();

      if (data.success) {
        setOrders(data.data.orders || []);
        setPagination(data.data.pagination || {});
      } else {
        throw new Error(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Orders fetch error:', error);
      showNotification(error.message || 'Failed to load orders', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, updates) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          notifyCustomer: true
        })
      });

      if (!response.ok) throw new Error('Failed to update order status');

      const data = await response.json();

      if (data.success) {
        showNotification('Order status updated successfully', 'success');
        setShowStatusModal(false);
        setSelectedOrder(null);
        fetchOrders(); // Refresh orders
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Update order status error:', error);
      showNotification(error.message || 'Failed to update order status', 'error');
    }
  };


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(orders.map(order => order._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (id) => {
    setSelectedOrders(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // TODO: Update bulk Action to support granular status if needed (skipping for now to focus on individual)
  const handleBulkAction = async () => {
    // Placeholder
    alert("Bulk actions temporarily disabled for upgrade.");
  };




  const OrderRow = ({ order }) => (
    <tr className={`order-row ${selectedOrders.includes(order._id) ? 'selected' : ''}`}>
      <td>
        <input
          type="checkbox"
          checked={selectedOrders.includes(order._id)}
          onChange={() => handleSelectOrder(order._id)}
        />
      </td>
      <td>
        <strong>#{order.orderNumber}</strong>
        <br />
        <small style={{ color: '#666' }}>
          {new Date(order.createdAt).toLocaleDateString()}
        </small>
      </td>
      <td>
        {order.user ? (
          <>
            {order.user.firstName} {order.user.lastName}
            <br />
            <small>{order.user.email}</small>
          </>
        ) : (
          <span style={{ color: '#999' }}>Guest Order</span>
        )}
      </td>
      <td>
        KES {order.total?.toLocaleString()}
        <br />
        <small style={{ fontSize: '0.8em', color: '#666' }}>
          {order.paymentMethod}
        </small>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <small>Payment:</small>
          <StatusBadge status={order.paymentStatus} />
          <small style={{ marginTop: '4px' }}>Fulfillment:</small>
          <StatusBadge status={order.fulfillmentStatus} />
        </div>
      </td>
      <td>
        <div className="order-actions">
          <button
            className="btn-icon info"
            onClick={() => {
              setSelectedOrder(order);
              setShowOrderModal(true);
            }}
            title="View Details"
          >
            <FaEye />
          </button>
          <button
            className="btn-icon warning"
            onClick={() => {
              setSelectedOrder(order);
              setShowStatusModal(true);
            }}
            title="Update Status"
          >
            <FaEdit />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="orders-management">
      <div className="page-header">
        <h1>Orders Management</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={fetchOrders}
            disabled={loading}
          >
            <FaSync className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>

        {/* Payment Filter */}
        <select
          value={filters.paymentStatus}
          onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value, page: 1 }))}
          className="filter-select"
        >
          <option value="all">Payment: All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Fulfillment Filter */}
        <select
          value={filters.fulfillmentStatus}
          onChange={(e) => setFilters(prev => ({ ...prev, fulfillmentStatus: e.target.value, page: 1 }))}
          className="filter-select"
        >
          <option value="all">Fulfillment: All</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="returned">Returned</option>
        </select>

        <div className="date-filters">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
          />
          <span className="date-separator">-</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : (
          <>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                    />
                  </th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment & Fulfillment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <OrderRow key={order._id} order={order} />
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="empty-state">
                <p>No orders found</p>
                <button
                  className="btn-outline"
                  onClick={fetchOrders}
                >
                  Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {
        pagination.pages > 1 && (
          <div className="pagination">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              className="btn-outline"
            >
              Previous
            </button>

            <span className="page-info">
              Page {filters.page} of {pagination.pages} ({pagination.total} total orders)
            </span>

            <button
              disabled={filters.page === pagination.pages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              className="btn-outline"
            >
              Next
            </button>
          </div>
        )
      }

      {/* Order Details Modal */}
      {
        showOrderModal && selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrder(null);
            }}
          />
        )
      }

      {/* Status Update Modal */}
      {
        showStatusModal && selectedOrder && (
          <StatusUpdateModal
            order={selectedOrder}
            onUpdate={updateOrderStatus}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedOrder(null);
            }}
          />
        )
      }
    </div >
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            <h3>Order Details</h3>
            <span className="order-tag">#{order.orderNumber}</span>
          </div>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <div className="order-details-body">
          {/* MAIN CONTENT Area */}
          <div className="order-main-scroll">
            {/* 1. Status Overview */}
            <div className="status-overview-card">
              <div className="overview-item">
                <span className="label">Payment Status</span>
                <StatusBadge status={order.paymentStatus} />
                <span className="sub-label">{order.paymentMethod}</span>
              </div>
              <div className="overview-item">
                <span className="label">Fulfillment Status</span>
                <StatusBadge status={order.fulfillmentStatus} />
                <span className="sub-label">{order.shippingMethod || 'Standard Delivery'}</span>
              </div>
              <div className="overview-item">
                <span className="label">Order Date</span>
                <span className="value">{new Date(order.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>

            {/* 2. Order Items Table-like List */}
            <div className="detail-section">
              <div className="section-header-row">
                <h4>Items Ordered ({order.items?.length || 0})</h4>
              </div>
              <div className="order-items-list">
                {order.items?.map((item, index) => (
                  <div key={index} className="order-item-row">
                    <div className="item-thumbnail">
                      <img src={item.image || item.product?.images?.[0]?.url || '/placeholder-coffee.jpg'} alt={item.name} />
                    </div>
                    <div className="item-info">
                      <div className="name">{item.name}</div>
                      <div className="meta">
                        {item.size && <span className="tag">Size: {item.size}</span>}
                        {item.grind && <span className="tag">Grind: {item.grind}</span>}
                      </div>
                    </div>
                    <div className="item-pricing">
                      <div className="qty-price">{item.quantity} × KES {item.price?.toLocaleString()}</div>
                      <div className="total">KES {(item.price * item.quantity)?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Event History Timeline */}
            <div className="detail-section no-border">
              <h4>System Activity & Events</h4>
              <div className="admin-timeline">
                {order.orderEvents && order.orderEvents.length > 0 ? (
                  order.orderEvents.slice().reverse().map((event, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="time">{new Date(event.timestamp).toLocaleString()}</div>
                        <div className="status-text">
                          <StatusBadge status={event.status} />
                        </div>
                        <div className="note">{event.note}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-events">
                    <FaSync className="icon" />
                    <p>No event history recorded for this order yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR Area */}
          <div className="order-sidebar-sticky">
            {/* Customer Card */}
            <div className="sidebar-card">
              <h4>Customer Info</h4>
              <div className="customer-info-box">
                <div className="customer-main">
                  <div className="avatar">{order.user?.firstName?.[0] || 'G'}</div>
                  <div className="details">
                    <strong>{order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest Customer'}</strong>
                    <span>{order.user?.email || order.email}</span>
                  </div>
                </div>
                {order.shippingAddress && (
                  <div className="contact-details">
                    <div className="info-row">
                      <span className="icon">📍</span>
                      <p>{order.shippingAddress.address}, {order.shippingAddress.city}</p>
                    </div>
                    <div className="info-row">
                      <span className="icon">📞</span>
                      <p>{order.shippingAddress.phone || 'No phone provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Card */}
            <div className="sidebar-card summary">
              <h4>Payment Summary</h4>
              <div className="summary-list">
                <div className="line-item">
                  <span>Subtotal</span>
                  <span>KES {order.subtotal?.toLocaleString()}</span>
                </div>
                <div className="line-item">
                  <span>Shipping Fee</span>
                  <span>KES {order.shippingCost?.toLocaleString()}</span>
                </div>
                {order.tax > 0 && (
                  <div className="line-item">
                    <span>Tax</span>
                    <span>KES {order.tax?.toLocaleString()}</span>
                  </div>
                )}
                <div className="total-line">
                  <span>Total Amount</span>
                  <span>KES {order.total?.toLocaleString()}</span>
                </div>
              </div>
              <div className="payment-indicator">
                <div className={`indicator ${order.paymentStatus}`}></div>
                <span>Paid via {order.paymentMethod}</span>
              </div>
            </div>

            {/* Admin Notes / Internal Info */}
            <div className="sidebar-card notes">
              <h4>Internal Notes</h4>
              <textarea placeholder="Add a private note for staff..." rows="4"></textarea>
              <button className="btn-save-note">Save internal note</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Update Modal Component
const StatusUpdateModal = ({ order, onUpdate, onClose }) => {
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'pending');
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus || 'unfulfilled');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    await onUpdate(order._id, {
      paymentStatus,
      fulfillmentStatus,
      trackingNumber,
      message
    });
    setUpdating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Order: #{order.orderNumber}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="status-form">
          <div className="form-group">
            <label>Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="form-group">
            <label>Fulfillment Status</label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value)}
            >
              <option value="unfulfilled">Unfulfilled</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          {(fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered') && (
            <div className="form-group">
              <label>Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={fulfillmentStatus === 'shipped' ? "Enter tracking number (Required)" : "Enter tracking number"}
                required={fulfillmentStatus === 'shipped'}
              />
            </div>
          )}

          <div className="form-group">
            <label>Note / Message to Customer</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={updating}>
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrdersManagement;