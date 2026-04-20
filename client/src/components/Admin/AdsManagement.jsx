import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaPlus, FaTrash, FaEdit, FaPause, FaPlay, FaImage, FaChartLine } from 'react-icons/fa';
import './AdsManagement.css';

const AdsManagement = () => {
    const { user, token, showNotification } = useContext(AppContext);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'banner',
        placements: ['homepage'],
        mediaUrl: '',
        targetUrl: '',
        content: {
            headline: '',
            subText: '',
            ctaText: 'Shop Now'
        },
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
        priority: 0,
        status: 'Draft'
    });

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        try {
            const response = await fetch('/api/promotions', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setAds(data.data);
            }
        } catch (error) {
            showNotification('Failed to fetch ads', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('content.')) {
            const contentField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                content: {
                    ...prev.content,
                    [contentField]: value
                }
            }));
        } else if (name === 'placements') {
            const values = Array.from(e.target.selectedOptions, option => option.value);
            setFormData(prev => ({ ...prev, placements: values }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'banner',
            placements: ['homepage'],
            mediaUrl: '',
            targetUrl: '',
            content: { headline: '', subText: '', ctaText: 'Shop Now' },
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 0,
            status: 'Draft'
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (ad) => {
        setFormData({
            ...ad,
            startDate: new Date(ad.startDate).toISOString().split('T')[0],
            endDate: new Date(ad.endDate).toISOString().split('T')[0]
        });
        setEditingId(ad._id);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId ? `/api/promotions/${editingId}` : '/api/promotions';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                showNotification(`Ad ${editingId ? 'updated' : 'created'} successfully`, 'success');
                fetchAds();
                resetForm();
            } else {
                showNotification(data.message || 'Error occurred', 'error');
            }
        } catch (error) {
            showNotification('Server Error', 'error');
        }
    };

    const handleToggleStatus = async (ad) => {
        const newStatus = ad.status === 'Active' ? 'Paused' : 'Active';
        try {
            const response = await fetch(`/api/promotions/${ad._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (data.success) {
                showNotification(`Ad ${newStatus}`, 'info');
                fetchAds();
            }
        } catch (error) {
            showNotification('Error toggling status', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this ad?')) {
            try {
                const response = await fetch(`/api/promotions/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Ad deleted', 'success');
                    fetchAds();
                }
            } catch (error) {
                showNotification('Error deleting ad', 'error');
            }
        }
    };

    // Calculate CTR safely
    const calculateCTR = (clicks, impressions) => {
        if (!impressions) return '0.00%';
        return ((clicks / impressions) * 100).toFixed(2) + '%';
    };

    if (loading) return <div className="loading-spinner">Loading Ad Engine...</div>;

    return (
        <div className="admin-content-inner ads-management">
            <div className="ads-header">
                <div>
                    <h2 className="admin-page-title">Marketing & Promotions</h2>
                    <p className="admin-page-subtitle">Manage native platform advertisements, banners, and featured listings.</p>
                </div>
                <button className="btn-primary ads-create-btn" onClick={() => setShowForm(!showForm)}>
                    <FaPlus /> {showForm ? 'Cancel' : 'Create Campaign'}
                </button>
            </div>

            {showForm && (
                <form className="admin-form-card fade-in" onSubmit={handleSubmit}>
                    <h3>{editingId ? 'Edit Campaign' : 'New Campaign'}</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Campaign Title (Internal)</label>
                            <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
                        </div>

                        <div className="form-group">
                            <label>Ad Format</label>
                            <select name="type" value={formData.type} onChange={handleInputChange}>
                                <option value="banner">Hero Banner</option>
                                <option value="featured_product">Featured Product</option>
                                <option value="sponsored_listing">Sponsored Listing</option>
                                <option value="flash_deal">Flash Deal</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Target Placements (Multi-select)</label>
                            <select name="placements" multiple value={formData.placements} onChange={handleInputChange} style={{ height: '100px' }}>
                                <option value="homepage">Homepage Banner</option>
                                <option value="cart">Cart Upsell</option>
                                <option value="dashboard">Customer Dashboard</option>
                                <option value="search_sidebar">Search Sidebar</option>
                                <option value="products_list">Mid-Products List</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Target URL (Where clicks go)</label>
                            <input type="text" name="targetUrl" value={formData.targetUrl} onChange={handleInputChange} placeholder="/product/slug or /category" required />
                        </div>

                        <div className="form-group">
                            <label>Media / Image URL</label>
                            <input type="text" name="mediaUrl" value={formData.mediaUrl} onChange={handleInputChange} placeholder="https://..." />
                        </div>

                        <div className="form-group">
                            <label>Display Headline</label>
                            <input type="text" name="content.headline" value={formData.content.headline} onChange={handleInputChange} placeholder="E.g., Summer Coffee Sale!" />
                        </div>

                        <div className="form-group">
                            <label>Display Subtext</label>
                            <input type="text" name="content.subText" value={formData.content.subText} onChange={handleInputChange} />
                        </div>

                        <div className="form-group">
                            <label>CTA Button Text</label>
                            <input type="text" name="content.ctaText" value={formData.content.ctaText} onChange={handleInputChange} />
                        </div>

                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required />
                        </div>

                        <div className="form-group">
                            <label>End Date</label>
                            <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required />
                        </div>

                        <div className="form-group">
                            <label>Priority Weight (Higher overrides lower)</label>
                            <input type="number" name="priority" value={formData.priority} onChange={handleInputChange} min="0" />
                        </div>

                        <div className="form-group">
                            <label>Initial Status</label>
                            <select name="status" value={formData.status} onChange={handleInputChange}>
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Paused">Paused</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-primary">Save Campaign <FaChartLine /></button>
                    </div>
                </form>
            )}

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Campaign</th>
                            <th>Format & Zone</th>
                            <th>Status</th>
                            <th>Timeframe</th>
                            <th>Metrics (Imp / Clicks / CTR)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ads.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center" style={{ padding: '3rem 1rem' }}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>No active campaigns</h3>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't created any promotional campaigns yet.</p>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <FaPlus /> Create Your First Campaign
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            ads.map(ad => (
                                <tr key={ad._id}>
                                    <td>
                                        <strong>{ad.title}</strong>
                                        <div className="text-xs text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.targetUrl}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-outline">{ad.type}</span>
                                        <div className="mt-1 text-xs">{ad.placements.join(', ')}</div>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${ad.status === 'Active' ? 'success' : ad.status === 'Paused' ? 'warning' : 'draft'}`}>
                                            {ad.status}
                                        </span>
                                    </td>
                                    <td className="text-sm">
                                        {new Date(ad.startDate).toLocaleDateString()} - <br />{new Date(ad.endDate).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="metrics-cell">
                                            <span>👁️ {ad.metrics?.impressions || 0}</span>
                                            <span>👆 {ad.metrics?.clicks || 0}</span>
                                            <strong className="text-primary">{calculateCTR(ad.metrics?.clicks, ad.metrics?.impressions)}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn"
                                                title="Toggle Auto/Pause"
                                                onClick={() => handleToggleStatus(ad)}
                                            >
                                                {ad.status === 'Active' ? <FaPause className="text-warning" /> : <FaPlay className="text-success" />}
                                            </button>
                                            <button className="action-btn" title="Edit" onClick={() => handleEdit(ad)}>
                                                <FaEdit />
                                            </button>
                                            <button className="action-btn text-danger" title="Delete" onClick={() => handleDelete(ad._id)}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdsManagement;
