import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

const ProfileTab = () => {
    const { user, updateUserProfile, loading, showSuccess, showError } = useContext(AppContext);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUserProfile(formData);
            showSuccess('Profile updated successfully');
        } catch (error) {
            showError(error.message || 'Failed to update profile');
        }
    };

    return (
        <div className="modern-dashboard-tab">
            <div className="content-card">
                <form className="modern-form" onSubmit={handleSubmit}>
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" defaultValue={user?.email} disabled />
                            <small className="form-text text-muted">Email cannot be changed</small>
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileTab;
