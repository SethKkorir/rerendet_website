import React, { useContext, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import './About.css';

const About = () => {
  const { publicSettings, showNotification } = useContext(AppContext);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const yImage = useTransform(scrollYProgress, [0, 1], [-100, 100]);
  const yText = useTransform(scrollYProgress, [0, 1], [50, -50]);

  const aboutData = publicSettings?.about || {};
  const years = aboutData.yearsInBusiness || 0;
  const organic = aboutData.organicPercentage || 0;
  const awards = aboutData.awardsWon || 0;
  const story = aboutData.story || 'Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations.';
  const subStory = aboutData.subStory || 'Our name comes from the local Kalenjin word for the evergreen tree that provides shade for our coffee plants. At elevations of 1,800 meters above sea level, our beans develop slowly, allowing complex flavors to mature fully before harvest. Each batch is hand-picked, carefully processed, and roasted to perfection.';
  const image = aboutData.imageUrl || 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1000';

  const hasStats = years > 0 || organic > 0 || awards > 0;

  return (
    <section id="about" className="about-editorial-section" ref={containerRef}>
      {/* Background Watermark */}
      <motion.div className="editorial-watermark" style={{ y: yText }}>
        HERITAGE
      </motion.div>

      <div className="container">
        <div className="editorial-grid">

          {/* Left Column: Images */}
          <div className="editorial-image-column">
            <motion.div
              className="primary-image-wrapper"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.img
                src={image}
                alt="Rerendet Coffee Farm"
                style={{ y: yImage, scale: 1.15 }}
                className="primary-parallax-img"
              />
              <div className="gold-accent-frame"></div>
            </motion.div>

            <motion.div
              className="secondary-image-card"
              initial={{ opacity: 0, x: -50, rotate: -5 }}
              whileInView={{ opacity: 1, x: 0, rotate: -2 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <div className="secondary-image-inner">
                <img src={image} alt="Farm Detail" />
                <div className="sec-img-overlay"></div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Text & Content */}
          <motion.div
            className="editorial-text-column"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="editorial-pre-title">
              <span className="gold-line-indicator"></span>
              Our Heritage
            </div>

            <h2 className="editorial-title">
              The Soul of<br /> <span>Rerendet</span>
            </h2>

            <div className="editorial-story">
              <p className="story-lead">{story}</p>
              <p className="story-body">{subStory}</p>
            </div>

            <button
              className="btn-ghost-premium btn-editorial"
              onClick={() => showNotification('The Rerendet Coffee Editorial is coming soon. Stay tuned for highland stories!', 'info')}
            >
              Discover Our Process
            </button>

            {hasStats && (
              <div className="editorial-stats">
                {years > 0 && (
                  <motion.div className="ed-stat-box" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <span className="ed-stat-num">{years}<span>+</span></span>
                    <span className="ed-stat-lab">Years<br />Tradition</span>
                  </motion.div>
                )}
                {organic > 0 && (
                  <motion.div className="ed-stat-box" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <span className="ed-stat-num">{organic}<span>%</span></span>
                    <span className="ed-stat-lab">Purely<br />Organic</span>
                  </motion.div>
                )}
                {awards > 0 && (
                  <motion.div className="ed-stat-box" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <span className="ed-stat-num">{awards}</span>
                    <span className="ed-stat-lab">Awards<br />Won</span>
                  </motion.div>
                )}
              </div>
            )}

          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default About;