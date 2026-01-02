import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, verifyEmail as apiVerifyEmail, googleLogin } from '../../api/api';
import { AppContext } from '../../context/AppContext';
import { GoogleLogin } from '@react-oauth/google';
import './Auth.css';

function Register() {
  const { verifyEmailAndSetUser, loginWithGoogle: contextGoogleLogin, notify } = useContext(AppContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('customer');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      notify('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await register({ email, firstName, lastName, phone, password, userType });
      notify('Verification code sent to email', 'info');
      setStep(2);
    } catch (err) {
      console.log('🚨 Register Error Caught:', err);
      console.log('🚨 Error Response:', err.response);
      console.log('🚨 Error Status:', err.response?.status);

      // ✅ SMART REDIRECT: User exists -> Login
      if (err.response?.status === 409) {
        notify('Account already exists. Redirecting to login...', 'info');
        setTimeout(() => {
          navigate(`/login?email=${encodeURIComponent(email)}`);
        }, 1500);
        return;
      }

      const msg = err.response?.data?.message || err.message || 'Register failed';
      alert(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await contextGoogleLogin(credentialResponse.credential);
      notify('Google Login Successful', 'success');
      navigate('/');
    } catch (error) {
      console.error("Google Login Failed", error);
      notify('Google Login Failed', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) { alert('Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await apiVerifyEmail({ email, code });
      // rely on verifyEmailAndSetUser (or set directly)
      const response = await verifyEmailAndSetUser({ email, code });
      const verifiedUser = response?.data?.user;
      notify('Welcome! Account verified.', 'success');

      // Redirect based on user type
      if (verifiedUser?.userType === 'admin' || userType === 'admin') {
        navigate('/admin');
      } else {
        setStep(3);
        navigate('/'); // Go to home after verification
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification failed';
      alert(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Verify Email</h2>
          <p className="auth-subtitle">Enter the code sent to {email}</p>
          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-group">
              <input
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2em' }}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Rerendet Coffee today</p>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required />
            </div>
            <div>
              <label>Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" required />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0712345678" type="tel" />
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" type="password" required />
            </div>
            <div>
              <label>Confirm Password</label>
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="******" type="password" required />
            </div>
          </div>

          <div className="checkbox-group">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">I agree to the <Link to="/terms">Terms & Conditions</Link></label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
              notify('Google Login Failed', 'error');
            }}
            useOneTap
            shape="circle"
            theme="outline"
          />
        </div>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Register;