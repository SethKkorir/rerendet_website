import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import './About.css';

const About = () => {
  const { publicSettings } = useContext(AppContext);
  const aboutData = publicSettings?.about || {};

  const years = aboutData.yearsInBusiness || 0;
  const organic = aboutData.organicPercentage || 0;
  const awards = aboutData.awardsWon || 0;
  const story = aboutData.story || 'Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations. Our name comes from the local Kalenjin word for the evergreen tree that provides shade for our coffee plants.';
  const subStory = aboutData.subStory || 'At elevations of 1,800 meters above sea level, our beans develop slowly, allowing complex flavors to mature fully before harvest. Each batch is hand-picked, carefully processed, and roasted to perfection.';
  const image = aboutData.imageUrl || 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1000';

  // Only show stats if they have values greater than 0
  const hasStats = years > 0 || organic > 0 || awards > 0;

  return (
    <section id="about" className="about">
      <div className="container">
        <div className="about-content">
          <motion.div
            className="about-text"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="section-title">Our Coffee Story</h2>
            <p>{story}</p>
            <p>{subStory}</p>

            {hasStats && (
              <div className="about-stats">
                {years > 0 && (
                  <div className="stat">
                    <span className="stat-number">{years}+</span>
                    <span className="stat-label">Years</span>
                  </div>
                )}
                {organic > 0 && (
                  <div className="stat">
                    <span className="stat-number">{organic}%</span>
                    <span className="stat-label">Organic</span>
                  </div>
                )}
                {awards > 0 && (
                  <div className="stat">
                    <span className="stat-number">{awards}</span>
                    <span className="stat-label">Awards</span>
                  </div>
                )}
              </div>
            )}

            <button className="about-cta-btn">Read Full Story</button>
          </motion.div>

          <motion.div
            className="about-image"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <div className="image-overlay"></div>
            <img src={image} alt="Rerendet Coffee Farm" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;