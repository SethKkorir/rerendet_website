import React from 'react';
import { motion } from 'framer-motion';
import { FaArrowRight, FaShoppingBag } from 'react-icons/fa';
import './Hero.css';

const Hero = () => {
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1, ease: "easeOut" }
    }
  };

  return (
    <section className="hero-modern" id="hero">
      <div className="container hero-grid">
        <motion.div
          className="hero-text-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-pre-title" variants={itemVariants}>
            <span>100% Organic Arabica</span>
          </motion.div>

          <motion.h1 className="hero-main-title" variants={itemVariants}>
            Pure Coffee <br />
            <span className="accent">Pure Energy</span>
          </motion.h1>

          <motion.p className="hero-subline" variants={itemVariants}>
            Experience the rich, bold flavors of hand-picked Kenyan coffee beans,
            roasted to perfection and delivered fresh to your doorstep.
          </motion.p>

          <motion.div className="hero-button-group" variants={itemVariants}>
            <button
              className="btn-primary hero-btn"
              onClick={() => scrollToSection('coffee-shop')}
            >
              Shop Collection <FaArrowRight className="btn-icon" />
            </button>
            <button
              className="btn-ghost hero-btn"
              onClick={() => scrollToSection('about')}
            >
              Our Story
            </button>
          </motion.div>

          <motion.div className="hero-trust-badges" variants={itemVariants}>
            <div className="trust-badge">
              <strong>4.9/5</strong> Rating
            </div>
            <div className="trust-badge">
              <strong>Fast</strong> Delivery
            </div>
            <div className="trust-badge">
              <strong>Eco</strong> Friendly
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-image-container"
          variants={imageVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="hero-image-wrapper">
            <img src="/hero-product.png" alt="Rerendet Coffee Premium Bag" className="hero-main-image" />
            <div className="hero-image-glow"></div>
          </div>
        </motion.div>
      </div>

      <div className="hero-bottom-decor"></div>
    </section>
  );
};

export default Hero;