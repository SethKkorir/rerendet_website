// src/components/Auth/AuthModal.jsx
import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCoffee, FaTimes, FaEye, FaEyeSlash, FaArrowLeft, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { AppContext } from '../../context/AppContext';
import { forgotPassword, resetPassword, verifyEmail, resendVerification } from '../../api/api';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, initialView = 'login' }) => {
    const { login, register, loginWithGoogle, verify2FA, loading: authLoading, showSuccess, showError } = useContext(AppContext);

    // Views: login, signup, forgot-password, reset-password, verify-email
    const [view, setView] = useState(initialView);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    // Form States
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [signupData, setSignupData] = useState({
        firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
        phone: '', gender: '', dob: '', agreeTerms: false
    });
    const [signupStep, setSignupStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetData, setResetData] = useState({ code: '', newPassword: '', confirmPassword: '' });
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setErrors({});
            setSignupStep(1);
        }
    }, [isOpen, initialView]);

    if (!isOpen) return null;

    // --- Handlers ---

    const handleInputChange = (setter) => (e) => {
        const { name, value, type, checked } = e.target;
        setter(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error for this field
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // LOGIN
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!loginData.email || !loginData.password) return setErrors({ general: 'All fields are required' });

        setLoading(true);
        try {
            const data = await login(loginData);
            if (data?.requires2FA) {
                // If 2FA required, switch to 2FA view
                setView('2fa-login');
                setVerificationCode(['', '', '', '', '', '']); // Clear code
            } else {
                onClose();
            }
        } catch (err) {
            // Error handled in context, but we also show it in the modal for better UX
            setErrors({ general: err.response?.data?.message || err.message || 'Login failed' });

            if (err.message?.includes('verified')) {
                setSignupData(prev => ({ ...prev, email: loginData.email }));
                setView('verify-email');
            }
        } finally {
            setLoading(false);
        }
    };

    // GOOGLE LOGIN
    const handleGoogleSuccess = async (response) => {
        try {
            const data = await loginWithGoogle(response);
            if (data?.requires2FA) {
                // Pre-fill email for verification
                setLoginData(prev => ({ ...prev, email: data.email }));
                setSignupData(prev => ({ ...prev, email: data.email }));
                setView('2fa-login');
            } else {
                onClose();
            }
        } catch (err) {
            // Show error in modal
            setErrors({ general: err.response?.data?.message || err.message || 'Google login failed' });
        }
    };

    // SIGNUP
    const handleSignupNext = (e) => {
        e.preventDefault();
        setErrors({});

        if (signupStep === 1) {
            if (!validateEmail(signupData.email)) return setErrors({ email: 'Invalid email address' });
            setSignupStep(2);
        } else if (signupStep === 2) {
            if (signupData.password.length < 8) return setErrors({ password: 'Password must be at least 8 characters' });
            if (signupData.password !== signupData.confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' });
            setSignupStep(3);
        } else if (signupStep === 3) {
            if (!signupData.firstName || !signupData.lastName) return setErrors({ general: 'Names are required' });
            setSignupStep(4);
        }
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (!signupData.agreeTerms) return setErrors({ agreeTerms: 'You must agree to the terms' });

        setLoading(true);
        try {
            await register(signupData); // This triggers email sending on backend
            setView('verify-email');
        } catch (err) {
            setErrors({ general: err.response?.data?.message || err.message || 'Registration failed' });
        } finally {
            setLoading(false);
        }
    };

    // VERIFICATION
    const handleVerification = async (e) => {
        e.preventDefault();
        const code = verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            const email = view === 'reset-password' ? forgotEmail : signupData.email || loginData.email;

            if (view === 'reset-password') {
                // Just validating code locally? No, for reset flow we typically submit this form
                // Check "RESET PASSWORD" flow below. This block is for email verification only.
            }

            // Email Verification
            const response = await verifyEmail({ email, code });
            showSuccess(response.data.message);

            // Auto login if token returned (new implementation of verifyEmail does this)
            if (response.data.data?.token) {
                // Ideally we should setAuth here, but we can just ask user to login or use the token.
                // Let's assume the user needs to login to be safe unless we update context to accept token manual set
                // Actually, context.verifyEmail doesn't exist, we used API directly. 
                // Let's just switch to login view for safety.
                setView('login');
            }
        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Verification failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationInput = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...verificationCode];
        newCode[index] = value;
        setVerificationCode(newCode);
        if (value && index < 5) document.getElementById(`v-${index + 1}`).focus();
    };

    // FORGOT PASSWORD
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!validateEmail(forgotEmail)) return setErrors({ email: 'Invalid email' });

        setLoading(true);
        try {
            await forgotPassword({ email: forgotEmail });
            showSuccess('Reset code sent to your email');
            setView('reset-password');
            setVerificationCode(['', '', '', '', '', '']); // reset code for next step
        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Failed to send code' });
        } finally {
            setLoading(false);
        }
    };

    // RESET PASSWORD
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const code = verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter 6-digit code' });
        if (resetData.newPassword !== resetData.confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' });

        setLoading(true);
        try {
            await resetPassword({
                email: forgotEmail,
                code,
                newPassword: resetData.newPassword
            });
            showSuccess('Password reset successfully! Please login.');
            setView('login');
        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Reset failed' });
        } finally {
            setLoading(false);
        }
    };

    // 2FA SUBMIT
    const handle2FASubmit = async (e) => {
        e.preventDefault();
        const code = verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            // Determine email to use
            const email = loginData.email || signupData.email; // Should be in loginData for login flow
            await verify2FA(email, code);
            onClose(); // Success handled in context (showSuccess)
        } catch (err) {
            setErrors({ general: 'Verification failed. Please check the code.' });
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 }
    };

    const contentVariants = {
        hidden: { x: 20, opacity: 0 },
        visible: { x: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="auth-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="auth-modal-container"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={e => e.stopPropagation()}
                >
                    <button className="close-auth-btn" onClick={onClose}><FaTimes /></button>

                    <div className="auth-content">
                        {/* Header */}
                        <div className="auth-header">
                            <div className="auth-logo">
                                <img src="/rerendet-logo.png" alt="Rerendet Logo" style={{ height: '100px', marginBottom: '1rem' }} />
                            </div>
                            <h2>
                                {view === 'login' && 'Welcome Back'}
                                {view === 'signup' && 'Create Account'}
                                {view === 'forgot-password' && 'Reset Password'}
                                {view === 'verify-email' && 'Verify Email'}
                                {view === 'verify-email' && 'Verify Email'}
                                {view === 'reset-password' && 'New Password'}
                                {view === '2fa-login' && 'Two-Factor Auth'}
                            </h2>
                            <p>
                                {view === 'login' && 'Login to access your personalized coffee journey'}
                                {view === 'signup' && 'Join us for the best coffee experience'}
                                {view === 'forgot-password' && "Don't worry, we'll help you get back in"}
                                {view === 'verify-email' && 'We sent a code to your email'}
                                {view === '2fa-login' && 'Enter the code sent to your email'}
                            </p>
                        </div>

                        {/* Error Banner */}
                        {errors.general && <div className="error-message">{errors.general}</div>}

                        {/* VIEWS */}
                        <AnimatePresence mode="wait">

                            {/* LOGIN VIEW */}
                            {view === 'login' && (
                                <motion.form
                                    key="login"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleLogin}
                                >
                                    <div className="form-group">
                                        <label>Email</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                name="email"
                                                type="email"
                                                className={`form-input ${errors.email ? 'error' : ''}`}
                                                value={loginData.email}
                                                onChange={handleInputChange(setLoginData)}
                                                placeholder="hello@example.com"
                                            />
                                            <FaEnvelope className="input-icon-btn" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Password</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-input"
                                                value={loginData.password}
                                                onChange={handleInputChange(setLoginData)}
                                                placeholder="••••••••"
                                            />
                                            <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                        <button type="button" className="forgot-password-link" onClick={() => setView('forgot-password')}>
                                            Forgot Password?
                                        </button>
                                    </div>

                                    <button type="submit" className="primary-btn" disabled={loading || authLoading}>
                                        {(loading || authLoading) ? <FaCoffee className="logo-spin" /> : 'Log In'}
                                    </button>

                                    <div className="auth-divider"><span>OR</span></div>

                                    <div className="social-login-wrapper">
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setErrors({ general: 'Google Login Failed' })}
                                            theme="filled_black"
                                            shape="pill"
                                        />
                                    </div>

                                    <div className="auth-footer">
                                        New here? <button type="button" className="link-btn" onClick={() => setView('signup')}>Create an account</button>
                                    </div>
                                </motion.form>
                            )}

                            {/* SIGNUP VIEW */}
                            {view === 'signup' && (
                                <motion.form
                                    key="signup"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={signupStep === 4 ? handleSignupSubmit : handleSignupNext}
                                >
                                    {signupStep > 1 && (
                                        <button type="button" className="back-btn" onClick={() => setSignupStep(s => s - 1)}>
                                            <FaArrowLeft />
                                        </button>
                                    )}

                                    {/* Step 1: Email */}
                                    {signupStep === 1 && (
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input
                                                name="email" type="email" className="form-input"
                                                value={signupData.email} onChange={handleInputChange(setSignupData)}
                                                placeholder="hello@example.com" autoFocus
                                            />
                                            {errors.email && <span className="error-text">{errors.email}</span>}
                                        </div>
                                    )}

                                    {/* Step 2: Password */}
                                    {signupStep === 2 && (
                                        <>
                                            <div className="form-group">
                                                <label>Create Password</label>
                                                <input
                                                    name="password" type="password" className="form-input"
                                                    value={signupData.password} onChange={handleInputChange(setSignupData)}
                                                    placeholder="••••••••" autoFocus
                                                />
                                                {errors.password && <span className="error-text">{errors.password}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <input
                                                    name="confirmPassword" type="password" className="form-input"
                                                    value={signupData.confirmPassword} onChange={handleInputChange(setSignupData)}
                                                    placeholder="••••••••"
                                                />
                                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                            </div>
                                        </>
                                    )}

                                    {/* Step 3: Details */}
                                    {signupStep === 3 && (
                                        <>
                                            <div className="form-group">
                                                <label>First Name</label>
                                                <input
                                                    name="firstName" className="form-input"
                                                    value={signupData.firstName} onChange={handleInputChange(setSignupData)}
                                                    placeholder="John" autoFocus
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Last Name</label>
                                                <input
                                                    name="lastName" className="form-input"
                                                    value={signupData.lastName} onChange={handleInputChange(setSignupData)}
                                                    placeholder="Doe"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Step 4: Final */}
                                    {signupStep === 4 && (
                                        <>
                                            <div className="form-group">
                                                <label>Gender (Optional)</label>
                                                <select name="gender" className="form-input" value={signupData.gender} onChange={handleInputChange(setSignupData)}>
                                                    <option value="">Select</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="checkbox" name="agreeTerms"
                                                    checked={signupData.agreeTerms} onChange={handleInputChange(setSignupData)}
                                                />
                                                <label style={{ fontSize: '0.8rem' }}>
                                                    I agree to <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms & Conditions</a>
                                                </label>
                                            </div>
                                            {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading}>
                                        {loading ? 'Processing...' : (signupStep === 4 ? 'Create Account' : 'Continue')}
                                    </button>

                                    {signupStep === 1 && (
                                        <div className="auth-footer">
                                            Already have an account? <button type="button" className="link-btn" onClick={() => setView('login')}>Log In</button>
                                        </div>
                                    )}
                                </motion.form>
                            )}

                            {/* FORGOT PASSWORD VIEW */}
                            {view === 'forgot-password' && (
                                <motion.form
                                    key="forgot"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleForgotPassword}
                                >
                                    <button type="button" className="back-btn" onClick={() => setView('login')}><FaArrowLeft /></button>

                                    <div className="form-group">
                                        <label>Enter your email</label>
                                        <input
                                            type="email" className="form-input"
                                            value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                            placeholder="hello@example.com"
                                        />
                                        {errors.email && <span className="error-text">{errors.email}</span>}
                                    </div>

                                    <button type="submit" className="primary-btn" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </motion.form>
                            )}

                            {/* VERIFICATION & RESET & 2FA VIEW */}
                            {(view === 'verify-email' || view === 'reset-password' || view === '2fa-login') && (
                                <motion.form
                                    key="verify"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={view === 'reset-password' ? handleResetPassword : (view === '2fa-login' ? handle2FASubmit : handleVerification)}
                                >
                                    {view === 'verify-email' && (
                                        <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>Code sent to {signupData.email || loginData.email}</p>
                                    )}
                                    {view === '2fa-login' && (
                                        <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>Code sent to {loginData.email}</p>
                                    )}
                                    {view === 'reset-password' && (
                                        <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>Enter code sent to {forgotEmail}</p>
                                    )}

                                    <div className="verification-grid">
                                        {verificationCode.map((digit, i) => (
                                            <input
                                                key={i} id={`v-${i}`}
                                                className="verification-digit"
                                                value={digit}
                                                maxLength={1}
                                                onChange={e => handleVerificationInput(i, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                    {errors.code && <div className="error-text" style={{ textAlign: 'center' }}>{errors.code}</div>}

                                    {view === 'reset-password' && (
                                        <>
                                            <div className="form-group">
                                                <label>New Password</label>
                                                <input
                                                    type="password" className="form-input"
                                                    value={resetData.newPassword}
                                                    onChange={e => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <input
                                                    type="password" className="form-input"
                                                    value={resetData.confirmPassword}
                                                    onChange={e => setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading}>
                                        {loading ? 'Verifying...' : (view === 'reset-password' ? 'Reset Password' : 'Verify')}
                                    </button>

                                    <div className="auth-footer">
                                        <button type="button" className="link-btn" onClick={() => {
                                            // Resend logic if needed
                                            showSuccess("Code resent (simulation)");
                                        }}>Resend Code</button>
                                    </div>
                                </motion.form>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AuthModal;
