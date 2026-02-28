import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import './Hero.css';

const FloatingBeans = () => {
  const beans = [
    { id: 1, top: '15%', left: '10%', size: 60, blur: '4px', delay: 0, duration: 20 },
    { id: 2, top: '25%', left: '85%', size: 40, blur: '8px', delay: 2, duration: 25 },
    { id: 3, top: '70%', left: '15%', size: 50, blur: '2px', delay: 4, duration: 22 },
    { id: 4, top: '80%', left: '80%', size: 70, blur: '10px', delay: 1, duration: 28 },
    { id: 5, top: '10%', left: '50%', size: 30, blur: '12px', delay: 3, duration: 18 },
    { id: 6, top: '40%', left: '5%', size: 45, blur: '6px', delay: 5, duration: 24 },
    { id: 7, top: '60%', left: '90%', size: 35, blur: '5px', delay: 2, duration: 20 },
    { id: 8, top: '85%', left: '40%', size: 55, blur: '9px', delay: 6, duration: 30 },
  ];

  return (
    <div className="hero-floating-beans">
      {beans.map((bean) => (
        <motion.img
          key={bean.id}
          src="/single_coffee_bean_1772078225421.png"
          className="floating-bean"
          style={{
            top: bean.top,
            left: bean.left,
            width: bean.size,
            filter: `blur(${bean.blur})`,
            opacity: 0.35,
            zIndex: 0
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            rotate: [0, 360],
            opacity: [0.2, 0.45, 0.2]
          }}
          transition={{
            duration: bean.duration,
            repeat: Infinity,
            delay: bean.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

const Hero = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const yText = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const yImage = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

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
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section className="hero-modern" id="hero" ref={containerRef}>
      <div
        className="hero-coffee-texture"
        style={{ backgroundImage: `url("/coffee_burlap_texture_1772078391678.png")` }}
      ></div>
      <FloatingBeans />
      <div className="container hero-grid">
        <motion.div
          className="hero-text-content"
          style={{ y: yText, opacity }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-pre-title" variants={itemVariants}>
            <span>100% Organic Arabica</span>
          </motion.div>

          <motion.h1 className="hero-main-title" variants={itemVariants}>
            Highland Mist, <br />
            <span className="accent">Poured for Perfection.</span>
          </motion.h1>

          <motion.p className="hero-subline" variants={itemVariants}>
            Experience the rich, bold soul of hand-picked Kenyan coffee beans,
            roasting secrets passed through generations, delivered fresh to your door.
          </motion.p>

          <motion.div className="hero-button-group" variants={itemVariants}>
            <button
              className="btn-premium hero-btn"
              onClick={() => scrollToSection('coffee-shop')}
            >
              Shop Collection <FaArrowRight className="btn-icon" />
            </button>
            <button
              className="btn-ghost-premium hero-btn"
              onClick={() => scrollToSection('about')}
            >
              Our Heritage
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-image-container"
          style={{ y: yImage }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        >
          <div className="hero-animation-wrapper">
            {/* The Cinematic Background Image */}
            <div className="hero-image-frame">
              <img
                src="/hero-coffee-pour.png"
                alt="Rerendet Premium Pour"
                className="hero-main-image"
              />
            </div>

            {/* Animated Stream - Conceptually overlapping the pour in the image */}
            <motion.div
              className="coffee-stream"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '40%', opacity: 1 }}
              transition={{ duration: 2, delay: 1.5, repeat: Infinity, repeatType: 'reverse' }}
            />

            {/* Rising Steam Effect */}
            <div className="steam-container">
              {[1, 2, 3].map((s) => (
                <motion.div
                  key={s}
                  className={`steam-cloud steam-${s}`}
                  animate={{
                    y: [-20, -120],
                    x: [0, (s % 2 === 0 ? 20 : -20)],
                    opacity: [0, 0.4, 0],
                    scale: [1, 1.5, 2]
                  }}
                  transition={{
                    duration: 4 + s,
                    repeat: Infinity,
                    delay: s * 1.2,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>

            <div className="hero-image-glow"></div>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="hero-scroll-indicator"
        style={{ opacity }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="scroll-bar"></div>
      </motion.div>
    </section >
  );
};

export default Hero;