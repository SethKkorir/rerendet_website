// client/src/components/Product/FlavorChart.jsx
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import './FlavorChart.css';

const FlavorChart = ({ flavorProfiles }) => {
    const data = [
        { subject: 'Acidity', A: flavorProfiles.acidity, fullMark: 10 },
        { subject: 'Body', A: flavorProfiles.body, fullMark: 10 },
        { subject: 'Sweetness', A: flavorProfiles.sweetness, fullMark: 10 },
        { subject: 'Bitterness', A: flavorProfiles.bitterness, fullMark: 10 },
        { subject: 'Aroma', A: flavorProfiles.aroma, fullMark: 10 },
    ];

    return (
        <div className="flavor-chart-container">
            <h3 className="chart-title">Flavor Profile</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e0e0e0" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#6F4E37', fontSize: 12, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 10]}
                            tick={false}
                            axisLine={false}
                        />
                        <Radar
                            name="Profile"
                            dataKey="A"
                            stroke="#6F4E37"
                            fill="#6F4E37"
                            fillOpacity={0.5}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default FlavorChart;
