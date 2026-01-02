// components/Login.jsx - UPDATED WITH TOKEN MANAGER
import { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import authTokenManager from '../utils/auth'; // Import the token manager
import '../App.css';
import './Auth.css';

const Login = () => {
  const { login, showNotification } = useContext(AppContext);
  const navigate = useNavigate();
  // Get query params for smart redirect
  const queryParams = new URLSearchParams(window.location.search);
  const prefillEmail = queryParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: prefillEmail,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clear any old tokens first
      authTokenManager.clearAllStorage();

      // Call your existing login function
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      // ✅ NEW: Store the token using the token manager
      if (result && result.token) {
        authTokenManager.setToken(result.token);
        console.log('✅ Login successful, token stored securely');
      }

      // Redirect based on user type
      if (result.user) {
        if (result.user.userType === 'admin' || result.user.role === 'admin' || result.user.role === 'super-admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }

    } catch (err) {
      console.error('Login error:', err);

      // ✅ SMART REDIRECT: User not found -> Register
      if (err.response?.status === 404) {
        showNotification('Account not found. Redirecting to registration...', 'info');
        setTimeout(() => {
          navigate(`/signup?email=${encodeURIComponent(formData.email)}`);
        }, 1500);
        return;
      }

      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');

      // Clear any partial token storage on error
      authTokenManager.removeToken();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary full-width"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
          <p>
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;