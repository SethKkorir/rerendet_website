import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { getActivityLogs } from '../../api/api';
import { FaHistory, FaUserShield, FaDesktop, FaInfoCircle } from 'react-icons/fa';
import './ActivityLogs.css';

const ActivityLogs = () => {
    const { token, showAlert } = useContext(AppContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await getActivityLogs({ pageNumber: page });
            if (res.data.success) {
                setLogs(res.data.data);
                setTotalPages(res.data.pages);
            }
        } catch (error) {
            console.error('Fetch logs error:', error);
            showAlert('Failed to fetch activity logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const getActionColor = (action) => {
        if (action.includes('DELETE')) return 'red';
        if (action.includes('UPDATE')) return 'orange';
        if (action.includes('CREATE')) return 'green';
        return 'blue';
    };

    return (
        <div className="activity-logs">
            <div className="logs-header">
                <h3><FaUserShield /> Security Audit Logs</h3>
                <button className="btn-refresh" onClick={fetchLogs}>
                    <FaHistory /> Refresh
                </button>
            </div>

            <div className="logs-container">
                {loading ? (
                    <div className="loading-spinner"></div>
                ) : (
                    <table className="logs-table">
                        <thead>
                            <tr>
                                <th>Admin</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>Details</th>
                                <th>IP Address</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log._id}>
                                    <td className="admin-cell">
                                        <div className="admin-info">
                                            <span className="admin-name">
                                                {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'Unknown'}
                                            </span>
                                            <span className="admin-role">{log.admin?.role}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`action-badge ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="entity-name">{log.entityName || '-'}</span>
                                    </td>
                                    <td className="details-cell">
                                        <div className="details-json">
                                            {JSON.stringify(log.details)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="ip-info">
                                            <FaDesktop className="ip-icon" /> {log.ipAddress}
                                        </div>
                                    </td>
                                    <td className="time-cell">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-state">No activity recorded yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="pagination">
                <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                >
                    Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default ActivityLogs;
