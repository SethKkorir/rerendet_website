// components/Alert/Alert.jsx
import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import './Alert.css';

const Alert = () => {
  const ctx = useContext(AppContext) || {};
  const alert = ctx.alert || { isVisible: false, message: '', type: 'info' };
  const hideAlert = ctx.hideAlert || (() => { });

  if (!alert || !alert.isVisible) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`alert alert-${alert.type}`}>
      <div className="alert-content">
        <span className="alert-icon">{getIcon(alert.type)}</span>
        <div className="alert-message">{alert.message}</div>
        <button className="alert-close" onClick={hideAlert} aria-label="Close alert">
          ×
        </button>
      </div>
    </div>
  );
};

export default Alert;