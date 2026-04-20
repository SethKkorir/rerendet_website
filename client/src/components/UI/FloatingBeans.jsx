import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingBeans = ({ isVisible }) => {
    const beans = Array.from({ length: 8 });

    return (
        <AnimatePresence>
            {isVisible && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 9999
                }}>
                    {beans.map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                y: -50,
                                x: Math.random() * window.innerWidth,
                                rotate: 0,
                                opacity: 0
                            }}
                            animate={{
                                y: window.innerHeight + 100,
                                rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                                opacity: [0, 1, 1, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                delay: i * 0.1,
                                ease: 'easeOut'
                            }}
                            style={{
                                position: 'absolute',
                                fontSize: '24px'
                            }}
                        >
                            🫘
                        </motion.div>
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
};

export default FloatingBeans;
