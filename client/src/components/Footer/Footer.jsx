import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaCreditCard,
  FaArrowRight,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaWhatsapp
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const { publicSettings } = useContext(AppContext);
  const store = publicSettings?.store || {};
  const social = publicSettings?.seo?.social || {};

  return (
    <footer className="footer-premium fade-in">
      {/* Decorative Gradient Background */}
      <div className="footer-glow" />

      <div className="container">
        <div className="footer-main-grid">

          {/* Brand & Story Section */}
          <div className="footer-section brand-section">
            <Link to="/" className="footer-logo">
              <img
                src="/rerendet-logo.png"
                alt="Rerendet"
                style={{ height: '60px', width: 'auto' }}
              />
            </Link>
            <p className="footer-mission">
              {store.description || 'Crafting excellence from the Kenyan highlands to your cup. We are more than coffee — we are a legacy of quality roasting and sustainable farming.'}
            </p>
            <div className="social-orchestra">
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Facebook"><FaFacebookF /></a>}
              <a href={social.instagram || 'https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Instagram"><FaInstagram /></a>
              <a href={social.whatsapp || 'https://whatsapp.com/channel/0029Vb9Ai2r9Gv7TB7Qpt73y'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="WhatsApp"><FaWhatsapp /></a>
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Twitter"><FaTwitter /></a>}
            </div>
          </div>

          {/* Navigation Orchestra */}
          <div className="footer-section">
            <h4 className="section-title">Shop</h4>
            <ul className="footer-links">
              <li><a href="/#hero">Home</a></li>
              <li><a href="/#coffee-shop">Coffee Shop</a></li>
              <li><a href="/#features">Our Origins</a></li>
              <li><a href="/#about">Our Story</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="section-title">Support</h4>
            <ul className="footer-links">
              <li><Link to="/shipping-policy">Shipping Policy</Link></li>
              <li><Link to="/refund-policy">Refund Policy</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div className="footer-section contact-section">
            <h4 className="section-title">Visit Us</h4>
            <div className="contact-details">
              {store.address && (
                <div className="contact-bit">
                  <FaMapMarkerAlt className="bit-icon" />
                  <span>{store.address}</span>
                </div>
              )}
              {store.email && (
                <div className="contact-bit">
                  <FaEnvelope className="bit-icon" />
                  <span>{store.email}</span>
                </div>
              )}
              {store.phone && (
                <div className="contact-bit">
                  <FaPhone className="bit-icon" />
                  <span>{store.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closing Movement */}
        <div className="footer-closing">
          <div className="closing-left">
            <span className="copyright-text">
              © {new Date().getFullYear()} Rerendet Coffee Co. All rights reserved.
            </span>
          </div>

          <div className="closing-right">
            <div className="payment-curation">
              <span className="curation-label">Secure Checkout</span>
              <div className="curation-icons">
                <FaCcVisa className="payment-icon" title="Visa" />
                <FaCcMastercard className="payment-icon" title="Mastercard" />
                <FaCreditCard className="payment-icon" title="Credit Card" />
                <div className="payment-pill-special mpesa-gold" title="Pay with M-Pesa">
                  <span className="mpesa-text">M-PESA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;