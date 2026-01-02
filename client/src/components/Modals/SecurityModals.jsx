import React, { useState } from 'react';
import { FaEye, FaTrash, FaLock, FaTimes } from 'react-icons/fa';
import './SecurityModals.css';

export const WalletRevealModal = ({ isOpen, onClose, onVerify, loading }) => {
    const [code, setCode] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onVerify(code);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content security-modal">
                <button className="modal-close" onClick={onClose}><FaTimes /></button>

                <div className="modal-header">
                    <div className="modal-icon-wrapper security">
                        <FaLock />
                    </div>
                    <h2>Verify Identity</h2>
                    <p>Enter the verification code sent to your email to reveal your wallet details.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Verification Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="123456"
                            className="security-input"
                            autoFocus
                            maxLength={6}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="confirm-btn primary" disabled={loading || !code}>
                            {loading ? 'Verifying...' : 'Reveal Details'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const DeleteAccountModal = ({ isOpen, onClose, onDelete, loading }) => {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onDelete(password);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content security-modal danger">
                <button className="modal-close" onClick={onClose}><FaTimes /></button>

                <div className="modal-header">
                    <div className="modal-icon-wrapper danger">
                        <FaTrash />
                    </div>
                    <h2>Delete Account</h2>
                    <p>This action is permanent and cannot be undone. Please enter your password to confirm.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="security-input"
                            autoFocus
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="confirm-btn danger" disabled={loading || !password}>
                            {loading ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
