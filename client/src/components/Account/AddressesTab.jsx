import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaMapMarkerAlt, FaPlus, FaEdit, FaCheckCircle, FaGlobe, FaHome, FaPhone } from 'react-icons/fa';

const AddressesTab = () => {
    const { user, updateUserProfile, loading, showSuccess, showError } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);

    // Initialize form with existing data or defaults
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
            showSuccess('Address updated successfully');
            setIsEditing(false);
        } catch (error) {
            showError(error.message || 'Failed to update address');
        }
    };

    return (
        <div className="modern-dashboard-tab">
            <div className="tab-header">
                <div>
                    <h2>Address Book</h2>
                    <p>Manage your shipping addresses for faster checkout.</p>
                </div>
                {!isEditing && user?.shippingInfo?.address && (
                    <button
                        className="btn-primary btn-sm"
                        onClick={() => setIsEditing(true)}
                    >
                        <FaEdit /> Edit Default
                    </button>
                )}
            </div>

            <div className="content-card no-padding">
                {!isEditing ? (
                    user?.shippingInfo?.address ? (
                        <div className="addresses-grid">
                            <div className="modern-address-card default">
                                <div className="card-badge">
                                    <FaCheckCircle /> Default Shipping
                                </div>
                                <div className="address-header">
                                    <div className="icon-box">
                                        <FaHome />
                                    </div>
                                    <div className="address-name">
                                        <h3>{user.shippingInfo.firstName} {user.shippingInfo.lastName}</h3>
                                        <span className="address-type">Home / Primary</span>
                                    </div>
                                </div>

                                <div className="address-body">
                                    <div className="info-row">
                                        <FaMapMarkerAlt />
                                        <span>{user.shippingInfo.address}</span>
                                    </div>
                                    <div className="info-row">
                                        <FaGlobe />
                                        <span>{user.shippingInfo.city}, {user.shippingInfo.country} {user.shippingInfo.zip}</span>
                                    </div>
                                    <div className="info-row">
                                        <FaPhone />
                                        <span>{user.shippingInfo.phone}</span>
                                    </div>
                                </div>

                                <div className="address-footer">
                                    <button className="text-btn" onClick={() => setIsEditing(true)}>Edit Details</button>
                                </div>
                            </div>

                            {/* Placeholder for future "Add New Address" feature if multi-address is supported */}
                            <div className="add-address-placeholder disabled">
                                <div className="placeholder-content">
                                    <FaPlus />
                                    <h3>Add New Address</h3>
                                    <p>Multi-address support coming soon</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state-large">
                            <div className="empty-icon-wrapper">
                                <FaMapMarkerAlt />
                            </div>
                            <h3>No Address Found</h3>
                            <p>Add a shipping address to speed up your checkout process.</p>
                            <button
                                className="btn-primary"
                                onClick={() => setIsEditing(true)}
                            >
                                <FaPlus /> Add New Address
                            </button>
                        </div>
                    )
                ) : (
                    <div className="edit-address-container p-6">
                        <div className="form-header mb-4">
                            <h3>{user?.shippingInfo?.address ? 'Edit Address' : 'Add New Address'}</h3>
                            <p className="text-muted">This address will be used as your default shipping destination.</p>
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
                                        className="modern-input"
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
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        className="modern-input"
                                        placeholder="+254..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>City / Town</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Street Address / Apartment / Plot No.</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="e.g. Kileleshwa, Othaya Road, Apt B4"
                                        required
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Country</label>
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="modern-select"
                                    >
                                        <option value="Kenya">Kenya</option>
                                        <option value="Uganda">Uganda</option>
                                        <option value="Tanzania">Tanzania</option>
                                        <option value="Rwanda">Rwanda</option>
                                        {/* Add more as needed */}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Zip / Postal Code</label>
                                    <input
                                        type="text"
                                        name="zip"
                                        value={formData.zip}
                                        onChange={handleChange}
                                        className="modern-input"
                                    />
                                </div>
                            </div>

                            <div className="form-actions right mt-4">
                                <button
                                    type="button"
                                    className="btn-text mr-4"
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
                                    {loading ? 'Saving Changes...' : 'Save Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddressesTab;
