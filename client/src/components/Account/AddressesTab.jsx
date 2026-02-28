import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaMapMarkerAlt, FaPlus, FaEdit, FaCheck, FaPhone, FaGlobe, FaUserAlt, FaInfoCircle, FaTrash } from 'react-icons/fa';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';

const AddressesTab = () => {
    const { user, updateUserProfile, loading, showNotification } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        address: user?.shippingInfo?.address || '',
        city: user?.shippingInfo?.city || '',
        county: user?.shippingInfo?.county || '',
        town: user?.shippingInfo?.town || '',
        country: user?.shippingInfo?.country || 'Kenya',
        zip: user?.shippingInfo?.zip || ''
    });

    const [availableTowns, setAvailableTowns] = useState([]);
    const [allCountries, setAllCountries] = useState(['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'United Arab Emirates', 'United Kingdom']);

    useEffect(() => {
        fetch('https://restcountries.com/v3.1/all?fields=name')
            .then(res => res.json())
            .then(data => {
                const countryList = data.map(c => c.name.common).sort();
                if (countryList.length > 0) {
                    setAllCountries(countryList);
                }
            })
            .catch(err => console.error('Failed to fetch countries', err));
    }, []);

    // Update available towns when county changes
    useEffect(() => {
        if (formData.country === 'Kenya' && formData.county) {
            setAvailableTowns(KENYA_LOCATIONS[formData.county] || []);
        } else {
            setAvailableTowns([]);
        }
    }, [formData.county, formData.country]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            // Reset town if county changes
            if (name === 'county') newData.town = '';
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // For Kenya, 'city' in backend is used as a fallback or combined field if needed,
            // but we'll focus on saving county and town precisely.
            await updateUserProfile({
                shippingInfo: {
                    ...formData,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    city: formData.country === 'Kenya' ? formData.county : formData.city
                }
            });
            showNotification('Shipping address secured', 'success');
            setIsEditing(false);
        } catch (error) {
            showNotification(error.message || 'Failed to update address', 'error');
        } finally {
            // Re-sync form data with updated user info if needed, though AppContext refresh might handle it
        }
    };

    const handleDeleteAddress = async () => {
        if (window.confirm('Are you sure you want to completely remove your delivery address?')) {
            try {
                await updateUserProfile({
                    shippingInfo: null
                });
                setFormData({
                    address: '', city: '', county: '', town: '', country: 'Kenya', zip: ''
                });
                showNotification('Delivery address removed successfully', 'success');
                setIsEditing(false);
            } catch (error) {
                showNotification(error.message || 'Failed to remove address', 'error');
            }
        }
    };

    return (
        <div className="modern-dashboard-tab">
            {!isEditing ? (
                <div className="addresses-container">
                    {user?.shippingInfo?.address ? (
                        <div className="modern-address-card active">
                            <div className="address-card-header">
                                <div className="header-labels">
                                    <span className="type-badge">Primary Delivery Address</span>
                                    <span className="badge-default"><FaCheck /> Active Session</span>
                                </div>
                                <div>
                                    <button className="edit-trigger" style={{ display: 'inline-flex', marginRight: '10px' }} onClick={() => setIsEditing(true)} title="Edit Address">
                                        <FaEdit />
                                    </button>
                                    <button className="edit-trigger" style={{ display: 'inline-flex', color: 'var(--status-cancelled)' }} onClick={handleDeleteAddress} title="Delete Address">
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>

                            <div className="address-card-body">
                                <div className="info-row name-row">
                                    <div className="info-icon"><FaUserAlt /></div>
                                    <div className="info-content">
                                        <p className="label">Receiver</p>
                                        <p className="value">{user.shippingInfo.firstName} {user.shippingInfo.lastName}</p>
                                    </div>
                                </div>

                                <div className="info-row address-row">
                                    <div className="info-icon"><FaMapMarkerAlt /></div>
                                    <div className="info-content">
                                        <p className="label">Delivery Area</p>
                                        <p className="value">
                                            {user.shippingInfo.country === 'Kenya'
                                                ? `${user.shippingInfo.town}, ${user.shippingInfo.county} County`
                                                : user.shippingInfo.city
                                            }
                                        </p>
                                        <p className="value-sub">{user.shippingInfo.address}</p>
                                        {user.shippingInfo.zip && <p className="value-sub">P.O Box / Zip: {user.shippingInfo.zip}</p>}
                                    </div>
                                </div>

                                <div className="info-row contact-row">
                                    <div className="info-icon"><FaPhone /></div>
                                    <div className="info-content">
                                        <p className="label">Primary Phone (from Profile)</p>
                                        <p className="value">
                                            {user?.phone
                                                ? user.phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3')
                                                : 'No phone set in profile'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="address-card-footer">
                                <span className="location-tag"><FaGlobe /> {user.shippingInfo.country}</span>
                                <button className="btn-modern-outline btn-sm" onClick={() => setIsEditing(true)}>Change Location</button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state premium">
                            <div className="empty-icon-animated">
                                <FaMapMarkerAlt />
                            </div>
                            <h3>Setup Delivery Address</h3>
                            <p>Tell us where to deliver your Rerendet packages for seamless logistics.</p>
                            <button className="btn-primary" onClick={() => setIsEditing(true)}>
                                <FaPlus /> Add Address
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="content-card address-editor">
                    <div className="card-header">
                        <div className="header-title">
                            <h3>{user?.shippingInfo?.address ? 'Refine Delivery Info' : 'New Delivery Address'}</h3>
                            <p>Tailored for precise location tracking and faster shipping.</p>
                        </div>
                        <button className="close-editor" onClick={() => setIsEditing(false)}>×</button>
                    </div>

                    <form className="modern-form" onSubmit={handleSubmit}>
                        <div className="form-section">
                            <div className="section-title">
                                <FaMapMarkerAlt /> <span>1. Location Visualizer</span>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Country</label>
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="modern-select"
                                    >
                                        {allCountries.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {formData.country === 'Kenya' ? (
                                    <div className="form-group">
                                        <label>County</label>
                                        <select
                                            name="county"
                                            value={formData.county}
                                            onChange={handleChange}
                                            className="modern-select"
                                            required
                                        >
                                            <option value="">Select County</option>
                                            {Object.keys(KENYA_LOCATIONS).sort().map(county => (
                                                <option key={county} value={county}>{county}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>State / Region</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                            placeholder="Region name"
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.country === 'Kenya' && formData.county && (
                                <div className="form-group mt-3">
                                    <label>Area / Town / Center</label>
                                    <select
                                        name="town"
                                        value={formData.town}
                                        onChange={handleChange}
                                        className="modern-select"
                                        required
                                    >
                                        <option value="">Select Nearest Town/Center</option>
                                        {availableTowns.sort().map(town => (
                                            <option key={town} value={town}>{town}</option>
                                        ))}
                                        <option value="Other">Other (Type below)</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group mt-3">
                                <label>Street / Building / Landmark</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="e.g. Near Bomet Stadium, Green Building, 2nd Floor"
                                    required
                                    rows="2"
                                    className="modern-textarea"
                                />
                            </div>

                            <div className="form-group mt-3">
                                <div className="label-with-hint">
                                    <label>Zip Code / P.O Box</label>
                                    <span className="hint-text">(Optional in Kenya)</span>
                                </div>
                                <input
                                    type="text"
                                    name="zip"
                                    value={formData.zip}
                                    onChange={handleChange}
                                    placeholder="e.g. 00100"
                                />
                                <div className="zip-info-box">
                                    <FaInfoCircle />
                                    <span>If you don't know your zip, use <strong>00100</strong> for Nairobi or leave blank.</span>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions mt-4">
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
                                className="btn-primary btn-glow"
                                disabled={loading}
                            >
                                {loading ? 'Securing Data...' : 'Save & Pin Location'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AddressesTab;
