import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaMapMarkerAlt, FaPlus, FaEdit, FaCheck } from 'react-icons/fa';

const AddressesTab = () => {
    const { user, updateUserProfile, loading, showSuccess, showNotification } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);

    // Initial state from user object
    const [formData, setFormData] = useState({
        firstName: user?.shippingInfo?.firstName || user?.firstName || '',
        lastName: user?.shippingInfo?.lastName || user?.lastName || '',
        phone: user?.shippingInfo?.phone || user?.phone || '',
        address: user?.shippingInfo?.address || '',
        city: user?.shippingInfo?.city || '',
        country: user?.shippingInfo?.country || 'Kenya',
        zip: user?.shippingInfo?.zip || ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUserProfile({
                shippingInfo: formData
            });
            showNotification('Address updated successfully', 'success');
            setIsEditing(false);
        } catch (error) {
            showNotification(error.message || 'Failed to update address', 'error');
        }
    };

    return (
        <div className="modern-dashboard-tab">
            {!isEditing ? (
                <div className="addresses-grid">
                    {/* Add New Trigger Card */}
                    <div className="modern-address-card add-new-trigger" onClick={() => setIsEditing(true)} style={{ cursor: 'pointer', borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <FaPlus style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-primary)' }} />
                            <h4 style={{ color: 'white' }}>{user?.shippingInfo?.address ? 'Update Address' : 'Add New Address'}</h4>
                        </div>
                    </div>

                    {user?.shippingInfo?.address ? (
                        <div className="modern-address-card default">
                            <div className="address-card-header">
                                <h4>Default Shipping Address</h4>
                                <span className="badge-default"><FaCheck /> Default</span>
                            </div>
                            <div className="address-card-body">
                                <p className="name">{user.shippingInfo.firstName} {user.shippingInfo.lastName}</p>
                                <p>{user.shippingInfo.address}</p>
                                <p>{user.shippingInfo.city}, {user.shippingInfo.zip}</p>
                                <p>{user.shippingInfo.country}</p>
                                <p className="phone">Tel: {user.shippingInfo.phone}</p>
                            </div>
                            <div className="address-card-actions">
                                <button className="btn-text" onClick={() => setIsEditing(true)}>
                                    <FaEdit /> Edit
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon-wrapper">
                                <FaMapMarkerAlt />
                            </div>
                            <h3>No Addresses Saved</h3>
                            <p>Save a shipping address to speed up your checkout process.</p>
                            <button className="btn-primary" onClick={() => setIsEditing(true)}>
                                Add Address
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="content-card editing-mode">
                    <div className="card-header">
                        <h3>{user?.shippingInfo?.address ? 'Edit Address' : 'Add New Address'}</h3>
                    </div>
                    <form className="modern-form" onSubmit={handleSubmit}>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Street Address / Apartment</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="e.g. 123 KICC Road, Apt 4B"
                                required
                            />
                        </div>

                        <div className="form-grid-3">
                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Zip / Postal Code</label>
                                <input
                                    type="text"
                                    name="zip"
                                    value={formData.zip}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Country</label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions right-aligned">
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() => setIsEditing(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Address'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AddressesTab;
