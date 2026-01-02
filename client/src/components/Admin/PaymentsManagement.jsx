// src/components/Admin/PaymentsManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaSearch, FaSync, FaEye, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import './OrdersManagement.css'; // Reusing Orders CSS for consistency

const PaymentsManagement = () => {
    const { showNotification, token } = useContext(AppContext);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        search: '',
        startDate: '',
        endDate: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({});
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, [filters]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== 'all') {
                    queryParams.append(key, filters[key]);
                }
            });

            const response = await fetch(`/api/admin/payments?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch payments');
            }

            const data = await response.json();

            if (data.success) {
                setPayments(data.data.payments || []);
                setPagination(data.data.pagination || {});
            }
        } catch (error) {
            console.error('Payments fetch error:', error);
            showNotification('Failed to load payments', 'error');
        } finally {
            setLoading(false);
        }
    };

    const PaymentStatusBadge = ({ status }) => {
        const statusColors = {
            PENDING: 'orange',
            SUCCESS: 'green',
            FAILED: 'red',
            CANCELLED: 'gray'
        };

        const icons = {
            PENDING: <FaClock />,
            SUCCESS: <FaCheckCircle />,
            FAILED: <FaTimesCircle />,
            CANCELLED: <FaTimesCircle />
        };

        return (
            <span className={`status-badge ${statusColors[status] || 'gray'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {icons[status]} {status}
            </span>
        );
    };

    return (
        <div className="orders-management">
            <div className="page-header">
                <h1>Payments Management</h1>
                <div className="header-actions">
                    <button
                        className="btn-primary"
                        onClick={fetchPayments}
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
                        placeholder="Search by Payment ID, Phone, Receipt..."
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
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                </select>

                <div className="date-filters">
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                        className="date-input"
                    />
                    <span className="date-separator">-</span>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                        className="date-input"
                    />
                </div>
            </div>

            {/* Payments Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading payments...</p>
                    </div>
                ) : (
                    <>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Payment ID</th>
                                    <th>Provider</th>
                                    <th>Amount</th>
                                    <th>Phone / Payer</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(payment => (
                                    <tr key={payment._id}>
                                        <td>
                                            {new Date(payment.createdAt).toLocaleDateString()}<br />
                                            <small style={{ color: '#888' }}>{new Date(payment.createdAt).toLocaleTimeString()}</small>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{payment.transactionId?.substring(0, 16) || payment._id}</span>
                                            {payment.order && (
                                                <div><small>Ord: {payment.order.orderNumber || 'N/A'}</small></div>
                                            )}
                                        </td>
                                        <td>
                                            {payment.provider}
                                            {payment.metadata?.mpesaReceiptNumber && (
                                                <div><small style={{ color: '#10B981' }}>{payment.metadata.mpesaReceiptNumber}</small></div>
                                            )}
                                        </td>
                                        <td>
                                            <strong>{payment.currency} {payment.amount?.toLocaleString()}</strong>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{payment.metadata?.phoneNumber || 'N/A'}</div>
                                            {payment.order?.user ? (
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    {payment.order.user.firstName} {payment.order.user.lastName}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: '#999' }}>Guest / Unknown</div>
                                            )}
                                        </td>
                                        <td>
                                            <PaymentStatusBadge status={payment.status} />
                                            {payment.metadata?.failureReason && (
                                                <div style={{ fontSize: '11px', color: 'red', maxWidth: '150px' }}>{payment.metadata.failureReason}</div>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon info"
                                                onClick={() => { setSelectedPayment(payment); setShowDetailModal(true); }}
                                                title="View Details"
                                            >
                                                <FaEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {payments.length === 0 && (
                            <div className="empty-state">
                                <p>No transactions found</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    <button
                        disabled={filters.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="btn-outline"
                    >
                        Previous
                    </button>
                    <span className="page-info">
                        Page {filters.page} of {pagination.pages}
                    </span>
                    <button
                        disabled={filters.page === pagination.pages}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="btn-outline"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedPayment && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Transaction Details</h3>
                            <button className="close-modal" onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div className="detail-row" style={{ marginBottom: '10px' }}>
                                <strong>ID:</strong> {selectedPayment.paymentId}
                            </div>
                            <div className="detail-row" style={{ marginBottom: '10px' }}>
                                <strong>Status:</strong> <span style={{ fontWeight: 'bold' }}>{selectedPayment.status}</span>
                            </div>
                            <div className="detail-row" style={{ marginBottom: '10px' }}>
                                <strong>Amount:</strong> {selectedPayment.currency} {selectedPayment.amount}
                            </div>
                            <div className="detail-row" style={{ marginBottom: '10px' }}>
                                <strong>Full Metadata:</strong>
                                <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '4px', overflowX: 'auto', fontSize: '12px' }}>
                                    {JSON.stringify(selectedPayment.metadata, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-primary" onClick={() => setShowDetailModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentsManagement;
