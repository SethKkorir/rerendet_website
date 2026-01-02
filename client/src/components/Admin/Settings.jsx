// src/components/Admin/Settings.jsx - COMPLETELY REWRITTEN
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import API, { testSmtpConnection } from '../../api/api';
import {
  FaSave, FaStore, FaCreditCard, FaEnvelope,
  FaShieldAlt, FaBell, FaGlobe, FaTools, FaInfoCircle,
  FaCheck, FaTimes, FaUpload, FaImage, FaFileAlt,
  FaLock, FaUserShield, FaMobileAlt
} from 'react-icons/fa';
import './Settings.css';

const TabButton = ({ id, icon, label, isActive, onClick }) => (
  <button
    className={`tab-btn ${isActive ? 'active' : ''}`}
    onClick={() => onClick(id)}
  >
    {icon} {label}
  </button>
);

const SettingSection = ({ title, children }) => (
  <div className="setting-section">
    <h3>{title}</h3>
    <div className="setting-content">
      {children}
    </div>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, ...props }) => (
  <div className="form-group">
    <label>{label}</label>
    <input
      type={type}
      value={value !== undefined && value !== null ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      {...props}
    />
  </div>
);

const CheckboxField = ({ label, checked, onChange }) => (
  <div className="form-group checkbox-group">
    <label className="checkbox-label">
      <input
        type="checkbox"
        checked={checked || false}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkmark"></span>
      {label}
    </label>
  </div>
);

const Settings = () => {
  const { showNotification, token, fetchPublicSettings, user, changeUserPassword, deleteAccount } = useContext(AppContext);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [notifyCustomers, setNotifyCustomers] = useState(false);

  // Security Modals State
  const [activeModal, setActiveModal] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [twoFactorForm, setTwoFactorForm] = useState({ password: '' });

  // Security Handlers
  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.new.length < 8) {
      showNotification('Password must be at least 8 characters', 'error');
      return;
    }
    try {
      await changeUserPassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new
      });
      setActiveModal(null);
      setPasswordForm({ current: '', new: '', confirm: '' });
      showNotification('Password changed successfully', 'success');
    } catch (err) {
      // Error handled in context
    }
  };

  const handleToggle2FA = async () => {
    try {
      const response = await fetch('/api/auth/toggle-2fa', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: !user.twoFactorEnabled,
          password: twoFactorForm.password
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotification(data.message, 'success');
        // We need to refresh user data to see the toggle change immediately
        // A full page reload is drastic, but AppContext might need a refreshUser() method.
        // For now, prompt user to refresh or rely on side-effects if AppContext auto-refreshes.
        // Actually AppContext `updateProfile` updates local state, but this was a separate endpoint.
        // We should ideally reload user.
        window.location.reload();
      } else {
        showNotification(data.message || 'Failed to toggle 2FA', 'error');
      }
    } catch (error) {
      showNotification('Failed to toggle 2FA', 'error');
    }
    setActiveModal(null);
    setTwoFactorForm({ password: '' });
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      // Redirect handled in context logout
    } catch (err) {
      // Handled in context
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        if (data.data.store?.logo) {
          setLogoPreview(data.data.store.logo);
        }
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
      showNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Handle logo upload if new file selected
      let updatedSettings = { ...settings };
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const uploadResponse = await fetch('/api/admin/upload/logo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          updatedSettings.store.logo = uploadData.data.url;
        }
      }

      // Include notifyCustomers flag
      if (notifyCustomers) {
        updatedSettings.notifyCustomers = true;
      }

      console.log('📦 Saving Settings Payload:', updatedSettings);

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save settings');
      }

      if (data.success) {
        showNotification('Settings saved successfully', 'success');
        setSettings(data.data);
        await fetchPublicSettings(); // Sync global state immediately
        setLogoFile(null);
        setNotifyCustomers(false);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTestEmail = async (emailConfig) => {
    console.log('🧪 handleTestEmail called with:', emailConfig);
    try {
      showNotification('Testing SMTP connection...', 'info');

      if (!emailConfig?.host) {
        alert('Please enter an SMTP Host first.');
        return;
      }

      console.log('🚀 Sending request to API...');
      // Use API client to ensure correct BaseURL and Headers
      const response = await testSmtpConnection(emailConfig);
      console.log('✅ API Response:', response);

      const { data } = response;

      if (data.success) {
        console.log('🎉 Success!');
        showNotification('✅ Connection successful! Check your inbox.', 'success');
        alert('Connection Successful! Check your inbox.');
      } else {
        throw new Error(data.message || 'Connection failed');
      }
    } catch (error) {
      console.error('❌ Test email error:', error);
      // Handle axios error response structure
      const msg = error.response?.data?.message || error.message || 'Connection failed';
      showNotification(msg, 'error');
      alert(`Connection Failed: ${msg}`);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedChange = (section, subSection, field, value) => {
    // If field is null, it means we are editing section.subSection directly (depth 2)
    // If field is provided, we are editing section.subSection.field (depth 3)

    setSettings(prev => {
      if (field === null) {
        // Depth 2: section.subSection = value
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [subSection]: value
          }
        };
      } else {
        // Depth 3: section.subSection.field = value
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [subSection]: {
              ...prev[section]?.[subSection],
              [field]: value
            }
          }
        };
      }
    });
  };

  const handleBusinessHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours?.[day],
          [field]: value
        }
      }
    }));
  };



  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="page-header">
        <h1>System Settings</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            <FaSave /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="settings-container">
        {/* Sidebar Tabs */}
        <div className="settings-sidebar">
          <TabButton
            id="store"
            icon={<FaStore />}
            label="Store Info"
            isActive={activeTab === 'store'}
            onClick={setActiveTab}
          />
          <TabButton
            id="payment"
            icon={<FaCreditCard />}
            label="Payment"
            isActive={activeTab === 'payment'}
            onClick={setActiveTab}
          />
          <TabButton
            id="email"
            icon={<FaEnvelope />}
            label="Email"
            isActive={activeTab === 'email'}
            onClick={setActiveTab}
          />
          <TabButton
            id="notifications"
            icon={<FaBell />}
            label="Notifications"
            isActive={activeTab === 'notifications'}
            onClick={setActiveTab}
          />
          <TabButton
            id="about"
            icon={<FaInfoCircle />}
            label="About Us"
            isActive={activeTab === 'about'}
            onClick={setActiveTab}
          />
          <TabButton
            id="security"
            icon={<FaShieldAlt />}
            label="Security"
            isActive={activeTab === 'security'}
            onClick={setActiveTab}
          />
          <TabButton
            id="seo"
            icon={<FaGlobe />}
            label="SEO"
            isActive={activeTab === 'seo'}
            onClick={setActiveTab}
          />
          <TabButton
            id="policies"
            icon={<FaFileAlt />}
            label="Policies"
            isActive={activeTab === 'policies'}
            onClick={setActiveTab}
          />
          <TabButton
            id="maintenance"
            icon={<FaTools />}
            label="Maintenance"
            isActive={activeTab === 'maintenance'}
            onClick={setActiveTab}
          />
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Store Information Tab */}
          {activeTab === 'store' && (
            <div className="tab-content">
              <SettingSection title="Store Details">
                <div className="form-grid">
                  <InputField
                    label="Store Name"
                    value={settings.store?.name}
                    onChange={(value) => handleInputChange('store', 'name', value)}
                    placeholder="Rerendet Coffee"
                  />
                  <InputField
                    label="Store Email"
                    type="email"
                    value={settings.store?.email}
                    onChange={(value) => handleInputChange('store', 'email', value)}
                    placeholder="info@rerendetcoffee.com"
                  />
                  <InputField
                    label="Store Phone"
                    value={settings.store?.phone}
                    onChange={(value) => handleInputChange('store', 'phone', value)}
                    placeholder="+254700000000"
                  />
                  <InputField
                    label="Store Address"
                    value={settings.store?.address}
                    onChange={(value) => handleInputChange('store', 'address', value)}
                    placeholder="Nairobi, Kenya"
                  />
                </div>
              </SettingSection>

              <SettingSection title="Store Logo">
                <div className="logo-upload">
                  <div className="logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Store Logo" />
                    ) : (
                      <div className="logo-placeholder">
                        <FaImage size={40} />
                        <span>No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="upload-controls">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="logo-upload" className="btn-outline">
                      <FaUpload /> Choose Logo
                    </label>
                    {logoPreview && (
                      <button
                        className="btn-outline danger"
                        onClick={() => {
                          setLogoPreview('');
                          setLogoFile(null);
                          handleInputChange('store', 'logo', '');
                        }}
                      >
                        <FaTimes /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </SettingSection>

              <SettingSection title="Business Hours">
                <div className="business-hours">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <div key={day} className="business-day">
                      <div className="day-header">
                        <CheckboxField
                          label={day.charAt(0).toUpperCase() + day.slice(1)}
                          checked={!settings.businessHours?.[day]?.closed}
                          onChange={(checked) => handleBusinessHoursChange(day, 'closed', !checked)}
                        />
                      </div>
                      <div className="time-inputs">
                        <InputField
                          label="Open"
                          type="time"
                          value={settings.businessHours?.[day]?.open || '09:00'}
                          onChange={(value) => handleBusinessHoursChange(day, 'open', value)}
                          disabled={settings.businessHours?.[day]?.closed}
                        />
                        <InputField
                          label="Close"
                          type="time"
                          value={settings.businessHours?.[day]?.close || '17:00'}
                          onChange={(value) => handleBusinessHoursChange(day, 'close', value)}
                          disabled={settings.businessHours?.[day]?.closed}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SettingSection>
            </div>
          )}

          {/* Payment Settings Tab */}
          {activeTab === 'payment' && (
            <div className="tab-content">
              <SettingSection title="Currency & Pricing">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={settings.payment?.currency || 'KES'}
                      onChange={(e) => handleInputChange('payment', 'currency', e.target.value)}
                    >
                      <option value="KES">Kenyan Shilling (KES)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                  <InputField
                    label="Tax Rate (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.payment?.taxRate !== undefined ? settings.payment.taxRate * 100 : 16}
                    onChange={(value) => handleInputChange('payment', 'taxRate', value === '' ? 0 : parseFloat(value) / 100)}
                  />
                  <InputField
                    label="Free Shipping Threshold (KES)"
                    type="number"
                    value={settings.payment?.freeShippingThreshold !== undefined ? settings.payment.freeShippingThreshold : 5000}
                    onChange={(value) => handleInputChange('payment', 'freeShippingThreshold', value === '' ? 0 : parseInt(value))}
                  />
                  <InputField
                    label="Standard Shipping Price (KES)"
                    type="number"
                    value={settings.payment?.shippingPrice !== undefined ? settings.payment.shippingPrice : 500}
                    onChange={(value) => handleInputChange('payment', 'shippingPrice', value === '' ? 0 : parseInt(value))}
                  />
                </div>
              </SettingSection>

              <SettingSection title="Payment Methods">
                <div className="payment-methods">
                  <CheckboxField
                    label="M-Pesa"
                    checked={settings.payment?.paymentMethods?.mpesa}
                    onChange={(checked) => handleNestedChange('payment', 'paymentMethods', 'mpesa', checked)}
                  />
                  <CheckboxField
                    label="Credit/Debit Card"
                    checked={settings.payment?.paymentMethods?.card}
                    onChange={(checked) => handleNestedChange('payment', 'paymentMethods', 'card', checked)}
                  />
                  <CheckboxField
                    label="Cash on Delivery"
                    checked={settings.payment?.paymentMethods?.cashOnDelivery}
                    onChange={(checked) => handleNestedChange('payment', 'paymentMethods', 'cashOnDelivery', checked)}
                  />
                </div>
              </SettingSection>
            </div>
          )}

          {/* Email Settings Tab */}
          {activeTab === 'email' && (
            <div className="tab-content">
              <SettingSection title="SMTP Configuration">
                <div className="form-grid">
                  <CheckboxField
                    label="Enable Email System"
                    checked={settings.email?.enabled}
                    onChange={(checked) => handleInputChange('email', 'enabled', checked)}
                  />
                  <InputField
                    label="SMTP Host"
                    value={settings.email?.host}
                    onChange={(value) => handleInputChange('email', 'host', value)}
                    placeholder="smtp.gmail.com"
                  />
                  <InputField
                    label="SMTP Port"
                    type="number"
                    value={settings.email?.port}
                    onChange={(value) => {
                      const port = parseInt(value);
                      handleInputChange('email', 'port', port);
                      // Auto-configure SSL based on port
                      if (port === 587) {
                        handleInputChange('email', 'secure', false); // STARTTLS
                      } else if (port === 465) {
                        handleInputChange('email', 'secure', true); // SSL
                      }
                    }}
                    placeholder="587"
                  />
                  <CheckboxField
                    label="Use SSL/TLS (Check for Port 465, Uncheck for 587)"
                    checked={settings.email?.secure}
                    onChange={(checked) => handleInputChange('email', 'secure', checked)}
                  />
                  <InputField
                    label="SMTP Username"
                    type="email"
                    value={settings.email?.auth?.user}
                    onChange={(value) => handleNestedChange('email', 'auth', 'user', value)}
                  />
                  <InputField
                    label="SMTP Password"
                    type="password"
                    value={settings.email?.auth?.pass}
                    onChange={(value) => handleNestedChange('email', 'auth', 'pass', value)}
                  />
                  <InputField
                    label="From Email"
                    type="email"
                    value={settings.email?.from}
                    onChange={(value) => handleInputChange('email', 'from', value)}
                    placeholder="Rerendet Coffee <noreply@rerendetcoffee.com>"
                  />
                  <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleTestEmail(settings.email)}
                      disabled={loading || !settings.email?.host}
                    >
                      {loading ? 'Testing...' : 'Test Connection'}
                    </button>
                    {!settings.email?.host && (
                      <span className="text-small text-muted" style={{ marginLeft: '1rem' }}>
                        Enter SMTP Host to test
                      </span>
                    )}
                  </div>
                </div>
              </SettingSection>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="tab-content">
              <SettingSection title="Admin Notifications">
                <div className="notification-grid">
                  <CheckboxField
                    label="New Order Notifications"
                    checked={settings.notifications?.admin?.newOrder}
                    onChange={(checked) => handleNestedChange('notifications', 'admin', 'newOrder', checked)}
                  />
                  <CheckboxField
                    label="Low Stock Alerts"
                    checked={settings.notifications?.admin?.lowStock}
                    onChange={(checked) => handleNestedChange('notifications', 'admin', 'lowStock', checked)}
                  />
                  <CheckboxField
                    label="New User Registrations"
                    checked={settings.notifications?.admin?.newUser}
                    onChange={(checked) => handleNestedChange('notifications', 'admin', 'newUser', checked)}
                  />
                  <CheckboxField
                    label="Contact Form Submissions"
                    checked={settings.notifications?.admin?.contactForm}
                    onChange={(checked) => handleNestedChange('notifications', 'admin', 'contactForm', checked)}
                  />
                </div>
              </SettingSection>

              <SettingSection title="Customer Notifications">
                <div className="notification-grid">
                  <CheckboxField
                    label="Order Confirmation Emails"
                    checked={settings.notifications?.customer?.orderConfirmation}
                    onChange={(checked) => handleNestedChange('notifications', 'customer', 'orderConfirmation', checked)}
                  />
                  <CheckboxField
                    label="Order Status Updates"
                    checked={settings.notifications?.customer?.orderStatus}
                    onChange={(checked) => handleNestedChange('notifications', 'customer', 'orderStatus', checked)}
                  />
                  <CheckboxField
                    label="Shipping Notifications"
                    checked={settings.notifications?.customer?.shipping}
                    onChange={(checked) => handleNestedChange('notifications', 'customer', 'shipping', checked)}
                  />
                  <CheckboxField
                    label="Promotional Emails"
                    checked={settings.notifications?.customer?.promotions}
                    onChange={(checked) => handleNestedChange('notifications', 'customer', 'promotions', checked)}
                  />
                </div>
              </SettingSection>
            </div>
          )}

          {/* About Us Tab */}
          {activeTab === 'about' && (
            <div className="tab-content">
              <SettingSection title="About Section Content">
                <div className="form-grid">
                  <InputField
                    label="Section Title"
                    value={settings.about?.title}
                    onChange={(value) => handleNestedChange('about', 'title', null, value)} // Fixed: handleNestedChange signature mismatch? Checking below
                    placeholder="Our Coffee Story"
                  />
                  <InputField
                    label="About Image URL"
                    value={settings.about?.image}
                    onChange={(value) => handleNestedChange('about', 'image', null, value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Subtitle / Intro</label>
                    <textarea
                      className="settings-textarea"
                      value={settings.about?.subtitle || ''}
                      onChange={(e) => handleNestedChange('about', 'subtitle', null, e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Main Content</label>
                    <textarea
                      className="settings-textarea"
                      value={settings.about?.content || ''}
                      onChange={(e) => handleNestedChange('about', 'content', null, e.target.value)}
                      rows="6"
                    />
                  </div>
                </div>
              </SettingSection>

              <SettingSection title="Company Statistics">
                <div className="form-grid">
                  <InputField
                    label="Years of Experience"
                    value={settings.about?.years}
                    onChange={(value) => handleNestedChange('about', 'years', null, value)}
                    placeholder="25+"
                  />
                  <InputField
                    label="Organic Percentage"
                    value={settings.about?.organic}
                    onChange={(value) => handleNestedChange('about', 'organic', null, value)}
                    placeholder="100%"
                  />
                  <InputField
                    label="Awards Won"
                    value={settings.about?.awards}
                    onChange={(value) => handleNestedChange('about', 'awards', null, value)}
                    placeholder="3"
                  />
                </div>
              </SettingSection>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="tab-content">
              {/* Personal Security Section (Apple-like) */}
              <SettingSection title="My Account Security">
                <div className="security-cards-container">
                  <div className="security-card">
                    <div className="security-card-header">
                      <div className="security-icon-wrapper">
                        <FaLock />
                      </div>
                      <div className="security-info">
                        <h4>Password</h4>
                        <p>Last changed: {user?.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}</p>
                      </div>
                      <button
                        className="btn-outline"
                        onClick={() => setActiveModal('password')}
                      >
                        Change Password
                      </button>
                    </div>
                  </div>

                  <div className="security-card">
                    <div className="security-card-header">
                      <div className="security-icon-wrapper">
                        <FaUserShield />
                      </div>
                      <div className="security-info">
                        <h4>Two-Factor Authentication</h4>
                        <p>
                          {user?.twoFactorEnabled
                            ? 'Your account is protected with 2FA.'
                            : 'Add an extra layer of security to your account.'}
                        </p>
                      </div>
                      <div className="toggle-wrapper">
                        {/* Toggle Switch */}
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={user?.twoFactorEnabled || false}
                            onChange={() => setActiveModal('twoFactor')}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Delete Account Section - Hidden for Admins */}
                  {user?.userType !== 'admin' && user?.role !== 'super-admin' && (
                    <div className="security-card danger">
                      <div className="security-card-header">
                        <div className="security-icon-wrapper danger-icon">
                          <FaTimes />
                        </div>
                        <div className="security-info">
                          <h4 className="text-danger">Delete Account</h4>
                          <p>Permanently delete your account and all data.</p>
                        </div>
                        <button
                          className="btn-outline danger"
                          onClick={() => setActiveModal('deleteAccount')}
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </SettingSection>

              {/* System Policy Section */}
              <SettingSection title="System Security Policies">
                <div className="form-grid">
                  <CheckboxField
                    label="Require Two-Factor Authentication for Admins"
                    checked={settings.security?.require2FA}
                    onChange={(checked) => handleInputChange('security', 'require2FA', checked)}
                  />
                  <InputField
                    label="Session Timeout (hours)"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.security?.sessionTimeout}
                    onChange={(value) => handleInputChange('security', 'sessionTimeout', parseInt(value))}
                  />
                  <InputField
                    label="Max Login Attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.security?.maxLoginAttempts}
                    onChange={(value) => handleInputChange('security', 'maxLoginAttempts', parseInt(value))}
                  />
                  <InputField
                    label="Minimum Password Length"
                    type="number"
                    min="6"
                    max="32"
                    value={settings.security?.passwordMinLength}
                    onChange={(value) => handleInputChange('security', 'passwordMinLength', parseInt(value))}
                  />
                  <CheckboxField
                    label="Require Special Characters in Passwords"
                    checked={settings.security?.passwordRequireSpecial}
                    onChange={(checked) => handleInputChange('security', 'passwordRequireSpecial', checked)}
                  />
                </div>
              </SettingSection>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="tab-content">
              {/* SERP Preview Section */}
              <SettingSection title="Search Engine Preview">
                <div className="serp-preview-container">
                  <p className="helper-text">This is how your homepage might appear in Google search results.</p>
                  <div className="google-serp-card">
                    <div className="serp-header">
                      <span className="serp-icon">
                        {settings.store?.favicon ? <img src={settings.store.favicon} alt="" /> : <FaGlobe />}
                      </span>
                      <div className="serp-site-info">
                        <span className="serp-site-name">{settings.store?.name || 'Rerendet Coffee'}</span>
                        <span className="serp-url">{settings.seo?.canonicalUrl || 'https://rerendetcoffee.com'}</span>
                      </div>
                    </div>
                    <h3 className="serp-title">{settings.seo?.metaTitle || 'Rerendet Coffee'}</h3>
                    <p className="serp-desc">
                      {settings.seo?.metaDescription || 'No description provided.'}
                    </p>
                  </div>
                </div>
              </SettingSection>

              <SettingSection title="Basic SEO">
                <div className="form-grid">
                  <InputField
                    label="Meta Title"
                    value={settings.seo?.metaTitle}
                    onChange={(value) => handleInputChange('seo', 'metaTitle', value)}
                    placeholder="Rerendet Coffee - Premium Coffee Blends"
                    maxLength={60}
                  />
                  <div className="form-group full-width">
                    <label>
                      Meta Description
                      <span className="char-count" style={{ float: 'right', fontSize: '12px', color: (settings.seo?.metaDescription?.length > 160) ? 'red' : '#666' }}>
                        {settings.seo?.metaDescription?.length || 0}/160
                      </span>
                    </label>
                    <textarea
                      value={settings.seo?.metaDescription}
                      onChange={(e) => handleInputChange('seo', 'metaDescription', e.target.value)}
                      placeholder="Discover our premium coffee blends roasted to perfection. Fresh beans delivered to your doorstep."
                      rows="3"
                    />
                  </div>
                  <InputField
                    label="Keywords (comma separated)"
                    value={settings.seo?.keywords}
                    onChange={(value) => handleInputChange('seo', 'keywords', value)}
                    placeholder="coffee, beans, brew, kenya, arabica"
                  />
                  <InputField
                    label="Canonical URL"
                    value={settings.seo?.canonicalUrl}
                    onChange={(value) => handleInputChange('seo', 'canonicalUrl', value)}
                    placeholder="https://rerendetcoffee.com"
                  />
                </div>
              </SettingSection>

              <SettingSection title="Analytics & Tracking">
                <div className="form-grid">
                  <InputField
                    label="Google Analytics ID (G-XXXXXXXXXX)"
                    value={settings.seo?.googleAnalyticsId}
                    onChange={(value) => handleInputChange('seo', 'googleAnalyticsId', value)}
                    placeholder="G-1234567890"
                  />
                  <InputField
                    label="Google Tag Manager ID (GTM-XXXXXX)"
                    value={settings.seo?.googleTagManagerId}
                    onChange={(value) => handleInputChange('seo', 'googleTagManagerId', value)}
                    placeholder="GTM-ABC1234"
                  />
                  <div className="form-group full-width">
                    <CheckboxField
                      label="Enable Automatic Structured Data (JSON-LD)"
                      checked={settings.seo?.enableStructuredData}
                      onChange={(checked) => handleInputChange('seo', 'enableStructuredData', checked)}
                    />
                    <p className="helper-text-small">
                      Automatically generates Schema.org markup for your Store (Organization) and Products to help Google understand your content.
                    </p>
                  </div>
                </div>
              </SettingSection>

              <SettingSection title="Social Media Profiles">
                <div className="form-grid">
                  <InputField
                    label="Facebook URL"
                    value={settings.seo?.social?.facebook}
                    onChange={(value) => handleNestedChange('seo', 'social', 'facebook', value)}
                    placeholder="https://facebook.com/rerendetcoffee"
                  />
                  <InputField
                    label="Instagram URL"
                    value={settings.seo?.social?.instagram}
                    onChange={(value) => handleNestedChange('seo', 'social', 'instagram', value)}
                    placeholder="https://instagram.com/rerendetcoffee"
                  />
                  <InputField
                    label="Twitter URL"
                    value={settings.seo?.social?.twitter}
                    onChange={(value) => handleNestedChange('seo', 'social', 'twitter', value)}
                    placeholder="https://twitter.com/rerendetcoffee"
                  />
                </div>
              </SettingSection>
            </div>
          )}


          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <div className="tab-content">
              <SettingSection title="Legal Policies">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Privacy Policy</label>
                    <textarea
                      value={settings.policies?.privacyPolicy}
                      onChange={(e) => handleInputChange('policies', 'privacyPolicy', e.target.value)}
                      placeholder="Enter your privacy policy here..."
                      rows="6"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Terms & Conditions</label>
                    <textarea
                      value={settings.policies?.termsConditions}
                      onChange={(e) => handleInputChange('policies', 'termsConditions', e.target.value)}
                      placeholder="Enter your terms and conditions here..."
                      rows="6"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Refund Policy</label>
                    <textarea
                      value={settings.policies?.refundPolicy}
                      onChange={(e) => handleInputChange('policies', 'refundPolicy', e.target.value)}
                      placeholder="Enter your refund policy here..."
                      rows="4"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Shipping Policy</label>
                    <textarea
                      value={settings.policies?.shippingPolicy}
                      onChange={(e) => handleInputChange('policies', 'shippingPolicy', e.target.value)}
                      placeholder="Enter your shipping policy here..."
                      rows="4"
                    />
                  </div>

                  <div className="form-group full-width" style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 'bold', color: '#0369a1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={notifyCustomers}
                        onChange={(e) => setNotifyCustomers(e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      Notify all customers about this update via email
                    </label>
                    <p style={{ marginTop: '5px', fontSize: '0.9rem', color: '#0c4a6e' }}>
                      Check this box only if you want to send an immediate email notification to all registered customers regarding these changes.
                    </p>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ marginTop: '10px' }}
                      onClick={async () => {
                        try {
                          showNotification('Sending test notification...', 'info');
                          const res = await fetch('/api/admin/settings/test-policy-notification', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          const d = await res.json();
                          if (d.success) {
                            showNotification('✅ Test Sent! Check your inbox.', 'success');
                          } else {
                            throw new Error(d.message);
                          }
                        } catch (err) {
                          showNotification(err.message, 'error');
                        }
                      }}
                    >
                      <FaBell /> Test Notification (Send to Me Only)
                    </button>
                  </div>
                </div>
              </SettingSection>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="tab-content">
              <SettingSection title="Maintenance Mode">
                <div className="form-grid">
                  <CheckboxField
                    label="Enable Maintenance Mode"
                    checked={settings.maintenance?.enabled}
                    onChange={(checked) => handleInputChange('maintenance', 'enabled', checked)}
                  />
                  <div className="form-group full-width">
                    <label>Maintenance Message</label>
                    <textarea
                      value={settings.maintenance?.message}
                      onChange={(e) => handleInputChange('maintenance', 'message', e.target.value)}
                      placeholder="We are currently performing maintenance. Please check back soon."
                      rows="4"
                      disabled={!settings.maintenance?.enabled}
                    />
                  </div>
                </div>
              </SettingSection>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'password' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <InputField
                label="Current Password"
                type="password"
                value={passwordForm.current}
                onChange={(val) => setPasswordForm(prev => ({ ...prev, current: val }))}
              />
              <InputField
                label="New Password"
                type="password"
                value={passwordForm.new}
                onChange={(val) => setPasswordForm(prev => ({ ...prev, new: val }))}
              />
              <InputField
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirm}
                onChange={(val) => setPasswordForm(prev => ({ ...prev, confirm: val }))}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleChangePassword}>Update Password</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'twoFactor' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{user?.twoFactorEnabled ? 'Disable' : 'Enable'} Two-Factor Authentication</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <p>Please enter your password to confirm this action.</p>
              <InputField
                label="Current Password"
                type="password"
                value={twoFactorForm.password}
                onChange={(val) => setTwoFactorForm(prev => ({ ...prev, password: val }))}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleToggle2FA}>
                {user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'deleteAccount' && (
        <div className="modal-overlay">
          <div className="modal-content danger-modal">
            <div className="modal-header">
              <h3 className="text-danger">Delete Account</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <p className="danger-text">
                Are you absolutely sure you want to delete your account? This action cannot be undone.
                All your data will be permanently lost.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteAccount}>Yes, Delete My Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;