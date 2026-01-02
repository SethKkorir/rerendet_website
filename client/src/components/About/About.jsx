import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion } from 'framer-motion';
import './About.css';

const About = () => {
  const { publicSettings } = useContext(AppContext);

  const about = publicSettings?.about || {};

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
            <h2 className="section-title">{about.title || "Our Coffee Story"}</h2>
            <p>
              {about.subtitle || "Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations. Our name comes from the local Kalenjin word for the evergreen tree that provides shade for our coffee plants."}
            </p>
            <p>
              {about.content || "At elevations of 1,800 meters above sea level, our beans develop slowly, allowing complex flavors to mature fully before harvest. Each batch is hand-picked, carefully processed, and roasted to perfection."}
            </p>

            <div className="about-stats">
              {about.years && (
                <div className="stat">
                  <span className="stat-number">{about.years}</span>
                  <span className="stat-label">Years</span>
                </div>
              )}
              {about.organic && (
                <div className="stat">
                  <span className="stat-number">{about.organic}</span>
                  <span className="stat-label">Organic</span>
                </div>
              )}
              {about.awards && (
                <div className="stat">
                  <span className="stat-number">{about.awards}</span>
                  <span className="stat-label">Awards</span>
                </div>
              )}
            </div>

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
            <img
              src={about.image || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1000"}
              alt="Rerendet Coffee Farm"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;