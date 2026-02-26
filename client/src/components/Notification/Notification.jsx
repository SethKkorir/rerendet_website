import React, { useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { playNotificationSound } from '../../utils/sound';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  X
} from 'lucide-react';
import './Notification.css';

const Notification = () => {
  const { notifications, removeNotification } = useContext(AppContext);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Only play sound if number of notifications INCREASED
    if (notifications.length > prevCountRef.current) {
      const latest = notifications[notifications.length - 1];
      playNotificationSound(latest?.type);
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="icon-success" size={20} />;
      case 'error': return <XCircle className="icon-error" size={20} />;
      case 'warning': return <AlertCircle className="icon-warning" size={20} />;
      case 'info':
      default: return <Info className="icon-info" size={20} />;
    }
  };

  return (
    <div className="notifications-container">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 20, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            layout
            className={`notification-toast ${notification.type}`}
          >
            <div className="notification-content">
              <div className="notification-icon-wrapper">
                {getIcon(notification.type)}
              </div>

              <div className="notification-text">
                <span className="notification-message">
                  {notification.message}
                </span>
              </div>

              <button
                className="notification-close-btn"
                onClick={() => removeNotification(notification.id)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {notification.duration > 0 && (
              <motion.div
                className="notification-progress"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: notification.duration / 1000, ease: 'linear' }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Notification;