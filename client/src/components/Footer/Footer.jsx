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
  FaPhone
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const { publicSettings } = useContext(AppContext);
  const store = publicSettings?.store || {};
  const social = publicSettings?.seo?.social || {};

  return (
    <footer className="footer-modern">
      {/* Decorative Top Border */}
      <div className="footer-accent-bar" />

      <div className="container">
        <div className="footer-top-grid">

          {/* Brand Column */}
          <div className="footer-column brand-col">
            <h2 className="footer-brand">
              {store.name ? (
                <span>{store.name}</span>
              ) : (
                <>Rerendet<span className="brand-accent">.</span>Coffee</>
              )}
            </h2>
            <p className="footer-desc">
              {store.description || 'Experience the finest single-origin beans from the highlands of Kenya. Sustainably sourced, expertly roasted, and delivered fresh to your door.'}
            </p>
            <div className="social-links">
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook"><FaFacebookF /></a>}
              <a href={social.instagram || 'https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq'} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram"><FaInstagram /></a>
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter"><FaTwitter /></a>}
            </div>

            <div className="contact-mini" style={{ marginTop: '1.5rem', color: '#888', fontSize: '0.9rem' }}>
              {store.email && <div><FaEnvelope style={{ marginRight: '8px' }} /> {store.email}</div>}
              {store.phone && <div><FaPhone style={{ marginRight: '8px' }} /> {store.phone}</div>}
              {store.address && <div><FaMapMarkerAlt style={{ marginRight: '8px' }} /> {store.address}</div>}
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-column">
            <h3 className="footer-heading">Explore</h3>
            <ul className="footer-nav">
              <li><a href="/#hero">Home</a></li>
              <li><a href="/#features">Our Origins</a></li>
              <li><a href="/#coffee-shop">Shop Coffee</a></li>
              <li><a href="/#about">Our Story</a></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="footer-column">
            <h3 className="footer-heading">Support</h3>
            <ul className="footer-nav">
              <li><Link to="/shipping-policy">Shipping Policy</Link></li>
              <li><Link to="/refund-policy">Refund Policy</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
              <li><a href="/#contact">Contact Us</a></li>
            </ul>
          </div>


        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom-bar">
          <div className="copyright">
            &copy; {new Date().getFullYear()} Rerendet Coffee. All rights reserved.
          </div>
          <div className="payment-methods">
            <FaCcVisa />
            <FaCcMastercard />
            <FaCreditCard />
            <span className="payment-pill mpesa" title="Pay with M-Pesa">
              M-PESA
            </span>
            <span className="payment-pill airtel" title="Pay with Airtel Money">
              airtel money
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;