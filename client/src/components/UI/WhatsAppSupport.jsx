import React, { useContext } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import './WhatsAppSupport.css';

const WhatsAppSupport = () => {
    const { showNotification } = useContext(AppContext);

    const handleClick = () => {
        showNotification('WhatsApp support is coming soon! For now, please use our contact form.', 'info');
    };

    return (
        <motion.div
            className="whatsapp-support-floating"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
        >
            <button className="whatsapp-btn" onClick={handleClick}>
                <div className="whatsapp-icon-wrap">
                    <FaWhatsapp />
                    <span className="whatsapp-pulse"></span>
                </div>
                <div className="whatsapp-text">
                    <span className="whatsapp-label">How can I help you?</span>
                </div>
            </button>
        </motion.div>
    );
};

export default WhatsAppSupport;
