import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, verifyEmail as apiVerifyEmail } from '../../api/api';
import { AppContext } from '../../context/AppContext';

function Register() {
  const { register, verifyEmail, showNotification } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    userType: 'customer'
  });
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = code.split('');
    if (newCode.length < 6) {
      for (let i = newCode.length; i < 6; i++) newCode.push('');
    }
    newCode[index] = value.slice(-1);
    const finalCode = newCode.join('');
    setCode(finalCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`v-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    if (finalCode.length === 6) {
      handleAutoVerify(finalCode);
    }
  };

  const handleAutoVerify = async (val) => {
    setLoading(true);
    try {
      await verifyEmail(formData.email, val);
      setStep(3);
      setTimeout(() => navigate('/account'), 2000);
    } catch (err) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="auth-container">
        <h2>Verification Successful!</h2>
        <p>Your account is now active. Welcome to Rerendet Coffee!</p>
        <p>Redirecting you to your account...</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="auth-container">
        <h2>Verify Your Email</h2>
        <p>We've sent a code to {formData.email}</p>
        <div className="verification-grid" style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <input
              key={idx}
              id={`v-${idx}`}
              type="text"
              maxLength="1"
              className="verification-digit"
              value={code[idx] || ''}
              onChange={(e) => handleCodeChange(idx, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !code[idx] && idx > 0) {
                  document.getElementById(`v-${idx - 1}`).focus();
                }
              }}
            />
          ))}
        </div>
        <button
          onClick={() => handleAutoVerify(code)}
          className="primary-btn"
          disabled={loading || code.length < 6}
        >
          {loading ? 'Verifying...' : 'Verify Account'}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>Create Account</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>I am a:</label>
          <select name="userType" value={formData.userType} onChange={handleChange} className="form-input">
            <option value="customer">Customer</option>
            <option value="admin">Admin (Requires Secret)</option>
          </select>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="form-input"
            required
          />
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="form-input"
            required
          />
        </div>

        <input
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email Address"
          type="email"
          className="form-input"
          required
        />

        <input
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          type="password"
          className="form-input"
          required
        />

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Sending Code...' : 'Register'}
        </button>
      </form>
    </div>
  );
}

export default Register;