// src/components/Admin/OrdersManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaSearch, FaFilter, FaEye, FaEdit, FaShippingFast, FaSync } from 'react-icons/fa';
import './OrdersManagement.css';

const OrdersManagement = () => {
  const { showNotification, token } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    paymentStatus: 'all',
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

  const updateOrderStatus = async (orderId, newStatus, trackingNumber = '', location = '', message = '', shippingDetails = null) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          trackingNumber,
          location,
          note: message, // Backend expects 'note'
          shippingDetails,
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

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) return;

    if (!window.confirm(`Are you sure you want to update ${selectedOrders.length} orders to ${bulkAction}?`)) return;

    try {
      setLoading(true);
      await Promise.all(selectedOrders.map(id =>
        fetch(`/api/admin/orders/${id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: bulkAction, notifyCustomer: true })
        })
      ));

      showNotification(`Successfully updated ${selectedOrders.length} orders`, 'success');
      setSelectedOrders([]);
      setBulkAction('');
      fetchOrders();
    } catch (error) {
      console.error('Bulk action error:', error);
      showNotification('Failed to perform bulk action', 'error');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ order }) => {
    const status = order.status;
    const paymentStatus = order.paymentStatus;

    let displayStatus = status;
    let color = 'gray';

    // Combined Status Logic
    if (status === 'pending') {
      if (paymentStatus === 'paid') {
        displayStatus = 'Paid (Pending)';
        color = 'blue';
      } else if (paymentStatus === 'failed') {
        displayStatus = 'Payment Failed';
        color = 'red';
      } else {
        displayStatus = 'Pending Payment';
        color = 'orange';
      }
    } else {
      const statusColors = {
        confirmed: 'blue',
        processing: 'purple',
        shipped: 'teal',
        delivered: 'green',
        cancelled: 'red'
      };
      color = statusColors[status] || 'gray';

      // Capitalize first letter
      displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
    }

    return (
      <span className={`status-badge ${color}`}>
        {displayStatus}
      </span>
    );
  };

  const PaymentStatusBadge = ({ status }) => {
    const statusColors = {
      pending: 'orange',
      paid: 'green',
      failed: 'red',
      refunded: 'gray'
    };

    return (
      <span className={`status-badge ${statusColors[status] || 'gray'}`}>
        {status}
      </span>
    );
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
        <div>
          {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
          <br />
          <small>{order.shippingAddress?.city}, {order.shippingAddress?.country}</small>
        </div>
      </td>
      <td>
        KES {order.total?.toLocaleString()}
        <br />
        <small style={{ fontSize: '0.8em', color: '#666' }}>
          {order.paymentMethod}
        </small>
      </td>
      <td>
        <StatusBadge order={order} />
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
            placeholder="Search by order number, customer name..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.paymentStatus}
          onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value, page: 1 }))}
          className="filter-select"
          style={{ marginLeft: '10px' }}
        >
          <option value="all">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <div className="date-filters">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
            className="date-input"
            title="Start Date"
          />
          <span className="date-separator">-</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
            className="date-input"
            title="End Date"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {
        selectedOrders.length > 0 && (
          <div className="bulk-actions-bar">
            <span>{selectedOrders.length} orders selected</span>
            <div className="bulk-controls">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="bulk-select"
              >
                <option value="">Select Action</option>
                <option value="confirmed">Mark as Confirmed</option>
                <option value="processing">Mark as Processing</option>
                <option value="shipped">Mark as Shipped</option>
                <option value="delivered">Mark as Delivered</option>
                <option value="cancelled">Mark as Cancelled</option>
              </select>
              <button
                className="btn-secondary"
                onClick={handleBulkAction}
                disabled={!bulkAction}
              >
                Apply
              </button>
            </div>
          </div>
        )
      }

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
                  <th>Shipping Address</th>
                  <th>Amount</th>
                  <th>Status</th>
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
          <h3>Order Details - #{order.orderNumber}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <div className="order-details">
          {/* LEFT COLUMN: Order Items & Timeline */}
          <div className="order-main-content">
            {/* Status Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block' }}>Order Status</span>
                <span className={`status-badge ${order.status}`} style={{ marginTop: '4px' }}>{order.status}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block' }}>Payment Status</span>
                <span className={`status-badge ${order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus === 'failed' ? 'failed' : 'pending'}`} style={{ marginTop: '4px' }}>
                  {order.paymentStatus}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block' }}>Date Placed</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="detail-section">
              <h4>Items Ordered</h4>
              <div className="order-items">
                {order.items?.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-image">
                      <img src={item.image || item.product?.images?.[0]?.url || '/placeholder-coffee.jpg'} alt={item.name} />
                    </div>
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      <div className="item-meta">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.grind && <span>Grind: {item.grind}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>{item.quantity} x KES {item.price?.toLocaleString()}</div>
                      <div className="item-total">KES {(item.price * item.quantity)?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking History Timeline */}
            <div className="detail-section">
              <h4>Tracking History</h4>
              <div className="tracking-timeline-admin">
                {order.trackingHistory && order.trackingHistory.length > 0 ? (
                  order.trackingHistory.slice().reverse().map((event, index) => (
                    <div key={index} className="timeline-event-admin">
                      <div className="event-marker"></div>
                      <div className="event-content">
                        <div className="event-header">
                          <span className={`status-badge ${event.status}`} style={{ fontSize: '10px' }}>{event.status}</span>
                          <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="event-message">{event.message}</div>
                        {event.location && (
                          <div className="event-location" style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-data" style={{ fontStyle: 'italic', color: '#94a3b8' }}>No tracking updates yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Customer, Shipping, Summary) */}
          <div className="order-sidebar">

            {/* Customer Info */}
            <div className="user-info-card">
              <h4>Customer</h4>
              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-value">{order.user?.firstName} {order.user?.lastName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value" style={{ wordBreak: 'break-all' }}>{order.user?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{order.shippingAddress?.phone || 'N/A'}</span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="user-info-card">
              <h4>Shipping To</h4>
              <div className="address-value">
                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br />
                {order.shippingAddress?.address}<br />
                {order.shippingAddress?.city}, {order.shippingAddress?.country}<br />
                {order.shippingAddress?.postalCode && <span>{order.shippingAddress.postalCode}</span>}
              </div>
            </div>

            {/* Order Summary */}
            <div className="order-summary-card">
              <h4>Payment Summary</h4>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>KES {order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>KES {order.shippingCost?.toLocaleString()}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>KES {order.total?.toLocaleString()}</span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', textAlign: 'right' }}>
                Paid via {order.paymentMethod}
              </div>
            </div>

          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Status Update Modal Component (keep the existing one)
const StatusUpdateModal = ({ order, onUpdate, onClose }) => {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.shippingDetails?.trackingNumber || order.trackingNumber || '');
  const [courier, setCourier] = useState(order.shippingDetails?.courier || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(order.shippingDetails?.estimatedDelivery ? new Date(order.shippingDetails.estimatedDelivery).toISOString().split('T')[0] : '');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    let shippingDetails = null;
    if (status === 'shipped') {
      shippingDetails = {
        courier,
        trackingNumber,
        estimatedDelivery
      };
    }

    await onUpdate(order._id, status, trackingNumber, location, message, shippingDetails);
    setUpdating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Order Status</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="status-form">
          <div className="form-group">
            <label>Order #</label>
            <input type="text" value={order.orderNumber} disabled />
          </div>

          <div className="form-group">
            <label>Customer</label>
            <input
              type="text"
              value={`${order.user?.firstName} ${order.user?.lastName}`}
              disabled
            />
          </div>

          <div className="form-group">
            <label>New Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(status === 'shipped' || status === 'delivered' || status === 'processing') && (
            <div className="shipping-fields p-3 bg-gray-50 rounded mb-3">
              <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>Shipping Details</h4>

              <div className="form-group">
                <label>Courier Service</label>
                <input
                  type="text"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="e.g. DHL, G4S, Wells Fargo"
                  required={status === 'shipped'}
                />
              </div>

              <div className="form-group">
                <label>Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={status === 'shipped' ? "Enter tracking number (Required)" : "Enter tracking number"}
                  required={status === 'shipped'}
                />
              </div>

              {status === 'shipped' && (
                <div className="form-group">
                  <label>Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Current Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Warehouse 1, Shipped from Port"
            />
          </div>

          <div className="form-group">
            <label>Status Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message for the customer"
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