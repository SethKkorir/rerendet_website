// src/components/Auth/AuthModal.jsx
import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCoffee, FaTimes, FaEye, FaEyeSlash, FaArrowLeft, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { AppContext } from '../../context/AppContext';
import { forgotPassword, resetPassword, verifyEmail, resendVerification } from '../../api/api';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, initialView = 'login' }) => {
    const { login, register, loginWithGoogle, verify2FA, verifyEmail, loading: authLoading, showSuccess, showError } = useContext(AppContext);

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
            // Error handled in context, but we check if verification needed
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
            // Error handled in context
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
            // Handled in context
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
                // handleVerification logic for reset password would go here if not handled in handleResetPassword
            }

            // Email Verification
            await verifyEmail(email, code);
            onClose(); // Auto-login and close modal on success

        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Verification failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationInput = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...verificationCode];
        newCode[index] = value.slice(-1); // Only take last digit if pasted/repeated
        setVerificationCode(newCode);

        // Auto move to next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`v-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // AUTO-SUBMIT once 6 digits are reached
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
            // Determine which flow we are in
            if (view === 'verify-email') {
                handleVerification({ preventDefault: () => { } });
            } else if (view === 'reset-password') {
                // handleResetPassword also uses the code, but wait for user to click 
                // because they need to enter a new password too.
            } else if (view === '2fa-login') {
                handle2FASubmit({ preventDefault: () => { } });
            }
        }
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
                    <button className="close-auth-btn" onClick={onClose} aria-label="Close modal"><FaTimes /></button>

                    {(view !== 'login' && view !== '2fa-login' && (view !== 'signup' || signupStep > 1)) && (
                        <button
                            className="back-btn"
                            onClick={() => {
                                if (view === 'signup' && signupStep > 1) {
                                    setSignupStep(s => s - 1);
                                } else {
                                    setView('login');
                                    setSignupStep(1);
                                }
                            }}
                            aria-label="Go back"
                        >
                            <FaArrowLeft />
                        </button>
                    )}

                    <div className="auth-content">
                        {/* Header Section */}
                        <div className="auth-header">
                            <div className="auth-logo">
                                <img src="/rerendet-logo.png" alt="Rerendet" />
                            </div>
                            <h2 className="premium-title">
                                {view === 'login' && 'Welcome Back'}
                                {view === 'signup' && 'Create Account'}
                                {view === 'forgot-password' && 'Reset Password'}
                                {view === 'verify-email' && 'Verify Email'}
                                {view === 'reset-password' && 'New Password'}
                                {view === '2fa-login' && 'Two-Factor Auth'}
                            </h2>
                            <p className="auth-subtitle">
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
                                    <div className="signup-progress">
                                        {[1, 2, 3, 4].map(step => (
                                            <div key={step} className={`progress-dot ${signupStep >= step ? 'active' : ''}`} />
                                        ))}
                                    </div>

                                    {/* Step 1: Email */}
                                    {signupStep === 1 && (
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <div className="form-input-wrapper">
                                                <input
                                                    name="email" type="email" className="form-input"
                                                    value={signupData.email} onChange={handleInputChange(setSignupData)}
                                                    placeholder="hello@example.com" autoFocus
                                                />
                                                <FaEnvelope className="input-icon-btn" />
                                            </div>
                                            {errors.email && <span className="error-text">{errors.email}</span>}
                                        </div>
                                    )}

                                    {/* Step 2: Password */}
                                    {signupStep === 2 && (
                                        <>
                                            <div className="form-group">
                                                <label>Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="password" type={showPassword ? 'text' : 'password'} className="form-input"
                                                        value={signupData.password} onChange={handleInputChange(setSignupData)}
                                                        placeholder="••••••••" autoFocus
                                                    />
                                                    <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                                    </button>
                                                </div>
                                                {errors.password && <span className="error-text">{errors.password}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="confirmPassword" type={showPassword ? 'text' : 'password'} className="form-input"
                                                        value={signupData.confirmPassword} onChange={handleInputChange(setSignupData)}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                            </div>
                                        </>
                                    )}

                                    {/* Step 3: Details */}
                                    {signupStep === 3 && (
                                        <>
                                            <div className="form-group">
                                                <label>First Name</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="firstName" className="form-input"
                                                        value={signupData.firstName} onChange={handleInputChange(setSignupData)}
                                                        placeholder="John" autoFocus
                                                    />
                                                    <FaUser className="input-icon-btn" />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Last Name</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="lastName" className="form-input"
                                                        value={signupData.lastName} onChange={handleInputChange(setSignupData)}
                                                        placeholder="Doe"
                                                    />
                                                    <FaUser className="input-icon-btn" />
                                                </div>
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
                                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '15px', marginTop: '1rem' }}>
                                                <input
                                                    type="checkbox" name="agreeTerms"
                                                    checked={signupData.agreeTerms} onChange={handleInputChange(setSignupData)}
                                                    style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
                                                />
                                                <label style={{ fontSize: '0.85rem', textTransform: 'none', letterSpacing: 'normal', fontWeight: '500', padding: 0 }}>
                                                    I agree to <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '700' }}>Terms & Conditions</a>
                                                </label>
                                            </div>
                                            {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '1rem' }}>
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
                                    <div className="verification-info" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        {view === 'verify-email' && (
                                            <p className="auth-subtitle">Code sent to <strong>{signupData.email || loginData.email}</strong></p>
                                        )}
                                        {view === '2fa-login' && (
                                            <p className="auth-subtitle">Code sent to <strong>{loginData.email}</strong></p>
                                        )}
                                        {view === 'reset-password' && (
                                            <p className="auth-subtitle">Enter code sent to <strong>{forgotEmail}</strong></p>
                                        )}
                                    </div>

                                    <div className="verification-grid">
                                        {verificationCode.map((digit, i) => (
                                            <input
                                                key={i} id={`v-${i}`}
                                                className="verification-digit"
                                                value={digit}
                                                maxLength={1}
                                                onChange={e => handleVerificationInput(i, e.target.value)}
                                                autoFocus={i === 0}
                                            />
                                        ))}
                                    </div>
                                    {errors.code && <div className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{errors.code}</div>}

                                    {view === 'reset-password' && (
                                        <>
                                            <div className="form-group">
                                                <label>New Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        type="password" className="form-input"
                                                        value={resetData.newPassword}
                                                        onChange={e => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        type="password" className="form-input"
                                                        value={resetData.confirmPassword}
                                                        onChange={e => setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '1rem' }}>
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
