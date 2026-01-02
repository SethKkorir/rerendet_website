import React, { useEffect, useState } from 'react';
import './SnowEffect.css';

const SnowEffect = () => {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const checkSeason = () => {
            const date = new Date();
            const month = date.getMonth(); // 0-11
            const day = date.getDate();

            // Active from Dec 15 (month 11) to Jan 3 (month 0)
            const isChristmas = (month === 11 && day >= 15) || (month === 0 && day <= 3);
            setIsActive(isChristmas);
        };

        checkSeason();
    }, []);

    if (!isActive) return null;

    return (
        <div className="snow-container">
            {[...Array(200)].map((_, i) => (
                <div key={i} className="snowflake">
                    ❄
                </div>
            ))}
        </div>
    );
};

export default SnowEffect;
