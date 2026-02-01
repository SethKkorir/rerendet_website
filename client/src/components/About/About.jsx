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
  const story = aboutData.story || '';
  const subStory = aboutData.subStory || '';
  const image = aboutData.imageUrl || '';

  // Don't render anything if there's no content
  const hasStats = years > 0 || organic > 0 || awards > 0;
  const hasContent = story || subStory || hasStats;

  if (!hasContent) {
    return null; // Hide the entire section if empty
  }

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
            {story && <p>{story}</p>}
            {subStory && <p>{subStory}</p>}

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

          {image && (
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
          )}
        </div>
      </div>
    </section>
  );
};

export default About;