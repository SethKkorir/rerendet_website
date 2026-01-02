import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaLock, FaShieldAlt, FaKey, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { DeleteAccountModal } from '../Modals/SecurityModals';

const SecurityTab = () => {
    const { user, updateUserProfile, loading: contextLoading, showSuccess, showError, token, logout } = useContext(AppContext);

    // Password Change State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    // 2FA State
    const [twoFAData, setTwoFAData] = useState({ password: '' });
    const [show2FAConfirm, setShow2FAConfirm] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);

    // Delete Account State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // --- Password Change ---
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return showError('New passwords do not match');
        }
        if (passwordData.newPassword.length < 8) {
            return showError('Password must be at least 8 characters');
        }

        setPasswordLoading(true);
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update password');

            showSuccess(data.message || 'Password updated successfully'); // Use backend message in case of specific success details
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            showError(error.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    // --- 2FA Toggle ---
    const handleToggle2FA = async (e) => {
        e.preventDefault();
        setTwoFALoading(true);
        try {
            const response = await fetch('/api/auth/toggle-2fa', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    enabled: !user.twoFactorEnabled,
                    password: twoFAData.password
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update 2FA settings');

            showSuccess(`Two-Factor Authentication ${!user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
            setShow2FAConfirm(false);
            setTwoFAData({ password: '' });

            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            showError(error.message);
        } finally {
            setTwoFALoading(false);
        }
    };

    // --- Delete Account ---
    const handleDeleteConfirm = async (password) => {
        setDeleteLoading(true);
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to delete account');

            showSuccess('Account deleted. We are sorry to see you go.');
            setShowDeleteModal(false);

            // Wait a moment then logout
            setTimeout(async () => {
                await logout();
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            showError(error.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="modern-dashboard-tab">
            <div className="tab-header">
                <h2>Security Settings</h2>
            </div>

            <DeleteAccountModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onDelete={handleDeleteConfirm}
                loading={deleteLoading}
            />

            {/* Two-Factor Authentication */}
            <div className="content-card mb-4">
                <div className="security-section">
                    <div className="sec-icon">
                        <FaShieldAlt className={user.twoFactorEnabled ? 'text-success' : 'text-muted'} />
                    </div>
                    <div className="sec-details">
                        <h3>Two-Factor Authentication (2FA)</h3>
                        <p className="text-muted">
                            Add an extra layer of security. We'll email you a code when you log in.
                        </p>
                        <div className="status-badge-container">
                            {user.twoFactorEnabled ? (
                                <span className="status-badge success"><FaCheckCircle /> Enabled</span>
                            ) : (
                                <span className="status-badge warning">Disabled</span>
                            )}
                        </div>
                    </div>
                    <div className="sec-actions">
                        <button
                            className={`btn-sm ${user.twoFactorEnabled ? 'btn-outline-danger' : 'btn-primary'}`}
                            onClick={() => setShow2FAConfirm(!show2FAConfirm)}
                        >
                            {user.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                        </button>
                    </div>
                </div>

                {show2FAConfirm && (
                    <form className="modern-form mt-3 border-top pt-3" onSubmit={handleToggle2FA}>
                        <p>Please enter your password to confirm this change.</p>
                        <div className="form-group">
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={twoFAData.password}
                                onChange={(e) => setTwoFAData({ password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={twoFALoading}>
                                {twoFALoading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Change Password */}
            <div className="content-card mb-4">
                <div className="security-section">
                    <div className="sec-icon">
                        <FaKey />
                    </div>
                    <div className="sec-details">
                        <h3>Change Password</h3>
                        <p className="text-muted">Update your password to keep your account secure.</p>
                    </div>
                </div>

                <form className="modern-form mt-3" onSubmit={handlePasswordChange}>
                    <div className="form-grid-2">
                        <div className="form-group full-width">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-actions right">
                        <button type="submit" className="btn-primary" disabled={passwordLoading}>
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Account */}
            <div className="content-card danger-zone">
                <div className="security-section">
                    <div className="sec-icon text-danger">
                        <FaExclamationTriangle />
                    </div>
                    <div className="sec-details">
                        <h3 className="text-danger">Delete Account</h3>
                        <p className="text-muted">
                            Permanently delete your account and all of your data. This action is irreversible.
                        </p>
                    </div>
                    <div className="sec-actions">
                        <button
                            className="btn-danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityTab;
