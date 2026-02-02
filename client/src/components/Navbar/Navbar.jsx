import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaShoppingBag,
  FaBars,
  FaTimes,
  FaUser,
  FaCoffee,
  FaSun,
  FaMoon
} from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthModal from '../Auth/AuthModal';
import './Navbar.css';

function Navbar() {
  const {
    user,
    cartCount,
    setIsCartOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    logout,
    publicSettings,
    fetchPublicSettings
  } = useContext(AppContext);

  const navigate = useNavigate();

  // State management
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState('login');

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Theme initialization
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = savedMode !== null ? savedMode : systemPrefersDark;

    setDarkMode(initialMode);
    document.documentElement.setAttribute('data-theme', initialMode ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (!publicSettings) {
      fetchPublicSettings();
    }
  }, [publicSettings, fetchPublicSettings]);

  // Toggle handlers
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    document.body.classList.toggle('menu-open', !mobileMenuOpen);
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
  };

  // Auth handlers
  const openAuth = (view = 'login') => {
    setAuthView(view);
    setShowAuthModal(true);
    setMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId) => {
    const section = document.querySelector(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If section not found (e.g., on another page), navigate to home with hash
      navigate('/' + sectionId);
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { name: 'Shop', href: '#coffee-shop' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ""}>
      <>
        {/* Main Header */}
        <header className={`header ${isScrolled ? 'header--scrolled' : ''}`}>
          <div className="header__container">
            <div className="header__logo" onClick={() => navigate('/')}>
              <img
                src={publicSettings?.store?.logo || "/rerendet-logo.png"}
                alt={publicSettings?.store?.name || "Rerendet Coffee"}
                className="header__logo-img"
                style={{ height: '70px' }}
              />
              <span className="header__logo-text">Rerendet Coffee</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="header__nav">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="header__nav-link"
                >
                  {link.name}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="header__actions">
              {/* Theme Toggle */}
              <button className="theme-toggle" onClick={toggleTheme}>
                {darkMode ? <FaSun /> : <FaMoon />}
              </button>

              {/* Account */}
              <button
                className="header__account"
                onClick={() => user ? navigate('/account') : openAuth('login')}
              >
                <FaUser />
              </button>

              {/* Cart */}
              <div className="header__cart-wrapper">
                <button className="header__cart" onClick={() => setIsCartOpen(true)}>
                  <FaShoppingBag />
                  {cartCount > 0 && (
                    <span className="header__cart-badge">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                className="header__mobile-trigger"
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`header__mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <nav className="header__mobile-nav">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="header__mobile-nav-link"
                >
                  {link.name}
                </button>
              ))}
              {user ? (
                <>
                  <button className="header__mobile-nav-link" onClick={() => navigate('/account')}>
                    My Account
                  </button>
                  <button className="header__mobile-nav-link" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    Logout
                  </button>
                </>
              ) : (
                <button
                  className="header__mobile-nav-link"
                  onClick={() => openAuth('login')}
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </header>

        {/* Auth Modal Component */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialView={authView}
        />

      </>
    </GoogleOAuthProvider>
  );
}

export default Navbar;