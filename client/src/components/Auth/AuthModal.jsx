import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { FaCoffee, FaTimes, FaEye, FaEyeSlash, FaArrowLeft, FaEnvelope, FaLock, FaUser, FaGoogle } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { forgotPassword, resetPassword, verifyEmail, resendVerification } from '../../api/api';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, initialView = 'login' }) => {
    const { login, register, loginWithGoogle, verify2FA, verifyEmail, loading: authLoading, showSuccess, showError, publicSettings } = useContext(AppContext);

    // Views: login, signup, forgot-password, reset-password, verify-email, policies
    const [view, setView] = useState(initialView);
    const [policyType, setPolicyType] = useState('termsConditions');
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
    const [resendTimer, setResendTimer] = useState(0);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setErrors({});
            setSignupStep(1);
            setResendTimer(0);
        }
    }, [isOpen, initialView]);

    // Resend Timer Logic
    useEffect(() => {
        let timer;
        if (resendTimer > 0) {
            timer = setInterval(() => setResendTimer(t => t - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    // GOOGLE LOGIN (Custom Hook)
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const data = await loginWithGoogle({ accessToken: tokenResponse.access_token });
                if (data?.requires2FA) {
                    setLoginData(prev => ({ ...prev, email: data.email }));
                    setSignupData(prev => ({ ...prev, email: data.email }));
                    setView('2fa-login');
                } else {
                    onClose();
                }
            } catch (err) {
                // Handled in context
            }
        },
        onError: () => setErrors({ general: 'Google Auth failed' })
    });

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
        setErrors({});
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
            // Explicitly set the error here so it shows in the modal
            const msg = err.response?.data?.message || err.message || 'Login failed';
            setErrors({ general: msg });
        } finally {
            setLoading(false);
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
        setErrors({}); // Clear errors when moving forward
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (!signupData.agreeTerms) return setErrors({ agreeTerms: 'You must agree to the terms' });

        setLoading(true);
        setErrors({});
        try {
            await register(signupData); // This triggers email sending on backend
            setView('verify-email');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Registration failed';
            setErrors({ general: msg });
        } finally {
            setLoading(false);
        }
    };

    // VERIFICATION
    const handleVerification = async (e, forcedCode = null) => {
        if (e) e.preventDefault();
        const code = forcedCode || verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            const email = view === 'reset-password' ? forgotEmail : signupData.email || loginData.email;

            if (view === '2fa-login') {
                return await handle2FASubmit(null, code);
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
        const char = value.slice(-1);
        if (char && !/^\d$/.test(char)) return;

        const newCode = [...verificationCode];
        newCode[index] = char;
        setVerificationCode(newCode);

        // Auto move to next input
        if (char && index < 5) {
            const nextInput = document.getElementById(`v-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // Trigger auto-submit if full
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
            setErrors(prev => ({ ...prev, code: '' }));
            // We'll let the user see the digits for a split second before auto-submitting
            setTimeout(() => {
                if (view === 'verify-email') handleVerification(null, fullCode);
                else if (view === '2fa-login') handle2FASubmit(null, fullCode);
                else if (view === 'reset-password') setErrors(prev => ({ ...prev, code: '' })); // Just clear error for reset view
            }, 100);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
            const prevInput = document.getElementById(`v-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill('')).slice(0, 6);
        setVerificationCode(newCode);

        // Focus the appropriate input
        const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
        const nextInput = document.getElementById(`v-${nextIndex}`);
        if (nextInput) nextInput.focus();

        if (pastedData.length === 6) {
            setErrors(prev => ({ ...prev, code: '' }));
            setTimeout(() => {
                if (view === 'verify-email') handleVerification(null, pastedData);
                else if (view === '2fa-login') handle2FASubmit(null, pastedData);
            }, 100);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return;

        setLoading(true);
        try {
            const email = view === 'reset-password' ? forgotEmail : signupData.email || loginData.email;
            await resendVerification(email);
            showSuccess('A new verification code has been sent.');
            setResendTimer(60); // 60s cooldown
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // FORGOT PASSWORD
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!validateEmail(forgotEmail)) return setErrors({ email: 'Invalid email' });

        setLoading(true);
        setErrors({});
        try {
            await forgotPassword({ email: forgotEmail });
            showSuccess('Reset code sent to your email');
            setView('reset-password');
            setVerificationCode(['', '', '', '', '', '']); // reset code for next step
        } catch (err) {
            setErrors({ general: err.response?.data?.message || err.message || 'Failed to send code' });
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
            setErrors({});
            setView('login');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Reset failed';
            setErrors({ general: msg });
        } finally {
            setLoading(false);
        }
    };

    // 2FA SUBMIT
    const handle2FASubmit = async (e, forcedCode = null) => {
        if (e) e.preventDefault();
        const code = forcedCode || verificationCode.join('');
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

                    {(view !== 'login' && view !== '2fa-login' && (view !== 'signup' || signupStep > 1 || view === 'policies')) && (
                        <button
                            className="back-btn"
                            onClick={() => {
                                setErrors({});
                                if (view === 'policies') {
                                    setView('signup');
                                } else if (view === 'signup' && signupStep > 1) {
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
                            <div className="auth-premium-watermark">PREMIUM</div>
                            <div className="auth-logo">
                                <img src="/rerendet-logo.png" alt="Rerendet" />
                            </div>
                            <h2 className="premium-title">
                                {view === 'login' && 'Welcome Back'}
                                {view === 'signup' && 'Create Account'}
                                {view === 'forgot-password' && 'Reset Password'}
                                {view === 'verify-email' && 'Verify Email'}
                                {view === 'reset-password' && 'New Password'}
                                {view === '2fa-login' && 'Security Verification'}
                                {view === 'policies' && (policyType === 'termsConditions' ? 'Terms & Conditions' : 'Privacy Policy')}
                            </h2>
                            <p className="auth-subtitle">
                                {view === 'login' && 'Log in to manage your orders and profile'}
                                {view === 'signup' && 'Join our community for a premium experience'}
                                {view === 'forgot-password' && "Don't worry, we'll help you get back in"}
                                {view === 'verify-email' && 'We sent a code to your email'}
                                {view === '2fa-login' && 'Enter the code sent to your email'}
                                {view === 'policies' && 'Please review our guiding principles'}
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
                                        <button
                                            type="button"
                                            className="custom-google-btn login"
                                            onClick={() => handleGoogleLogin()}
                                            disabled={loading || authLoading}
                                        >
                                            <FaGoogle />
                                            <span>Login with Google</span>
                                        </button>
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
                                                    I agree to <button type="button" onClick={(e) => { e.preventDefault(); setPolicyType('termsConditions'); setView('policies'); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '700', textDecoration: 'none', padding: 0 }}>Terms & Conditions</button>
                                                </label>
                                            </div>
                                            {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '1rem' }}>
                                        {loading ? 'Processing...' : (signupStep === 4 ? 'Create Account' : 'Continue')}
                                    </button>

                                    {signupStep === 1 && (
                                        <>
                                            <div className="auth-divider"><span>OR</span></div>
                                            <div className="social-login-wrapper">
                                                <button
                                                    type="button"
                                                    className="custom-google-btn signup"
                                                    onClick={() => handleGoogleLogin()}
                                                    disabled={loading || authLoading}
                                                >
                                                    <FaGoogle />
                                                    <span>Sign up with Google</span>
                                                </button>
                                            </div>
                                            <div className="auth-footer">
                                                Already have an account? <button type="button" className="link-btn" onClick={() => { setView('login'); setErrors({}); }}>Log In</button>
                                            </div>
                                        </>
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

                                    <div className="verification-grid" onPaste={handlePaste}>
                                        {verificationCode.map((digit, i) => (
                                            <input
                                                key={i} id={`v-${i}`}
                                                className="verification-digit"
                                                value={digit}
                                                maxLength={1}
                                                onChange={e => handleVerificationInput(i, e.target.value)}
                                                onKeyDown={e => handleKeyDown(i, e)}
                                                autoFocus={i === 0}
                                                autoComplete="one-time-code"
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
                                        {loading ? 'Verifying...' : (view === 'reset-password' ? 'Reset Password' : 'Confirm Verification')}
                                    </button>

                                    <div className="verification-extra-links">
                                        <div className="resend-container">
                                            {resendTimer > 0 ? (
                                                <span className="timer-text">Resend code in {resendTimer}s</span>
                                            ) : (
                                                <button type="button" className="link-btn" onClick={handleResendCode} disabled={loading}>
                                                    Resend Code
                                                </button>
                                            )}
                                        </div>
                                        <div className="policy-note">
                                            By verifying, you confirm you've read our <button type="button" onClick={(e) => { e.preventDefault(); setPolicyType('termsConditions'); setView('policies'); }} className="link-btn-small">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setPolicyType('privacyPolicy'); setView('policies'); }} className="link-btn-small">Privacy Policy</button>
                                        </div>
                                    </div>
                                </motion.form>
                            )}

                            {/* POLICIES VIEW */}
                            {view === 'policies' && (
                                <motion.div
                                    key="policies"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-policy-content"
                                >
                                    <div className="policy-text-wrap">
                                        <div
                                            className="policy-body-rendered"
                                            dangerouslySetInnerHTML={{
                                                __html: (publicSettings?.policies?.[policyType] || "Policy content is currently being updated.")
                                                    .replace(/\n/g, '<br/>')
                                                    .replace(/## (.*)/g, '<h3>$1</h3>')
                                                    .replace(/# (.*)/g, '<h2>$1</h2>')
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        style={{ marginTop: '2rem' }}
                                        onClick={() => setView('signup')}
                                    >
                                        I Understand
                                    </button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AuthModal;
