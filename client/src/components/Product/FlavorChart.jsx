// client/src/components/Product/FlavorChart.jsx
import React from 'react';
import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip
} from 'recharts';
import './FlavorChart.css';

// Detect current theme from document
const getThemeColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        gridStroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        tickFill: isDark ? '#c9a84c' : '#6F4E37',
        radarStroke: '#D4AF37',
        radarFill: '#D4AF37',
    };
};

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { subject, A } = payload[0].payload;
    return (
        <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-main)',
            padding: '0.5rem 0.85rem',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-md)',
            fontSize: '0.8rem',
            fontFamily: "'Outfit', sans-serif",
            color: 'var(--text-main)',
        }}>
            <strong style={{ color: '#D4AF37' }}>{subject}</strong>
            <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>{A} / 10</span>
        </div>
    );
};

const FlavorChart = ({ flavorProfiles }) => {
    if (!flavorProfiles) return null;

    const colors = getThemeColors();

    const data = [
        { subject: 'Acidity', A: flavorProfiles.acidity ?? 0 },
        { subject: 'Body', A: flavorProfiles.body ?? 0 },
        { subject: 'Sweetness', A: flavorProfiles.sweetness ?? 0 },
        { subject: 'Bitterness', A: flavorProfiles.bitterness ?? 0 },
        { subject: 'Aroma', A: flavorProfiles.aroma ?? 0 },
    ];

    return (
        <div className="flavor-chart-container">
            <h3 className="chart-title">Flavor Profile</h3>

            {/* Radar chart */}
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="78%" data={data}>
                        <PolarGrid stroke={colors.gridStroke} />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: colors.tickFill, fontSize: 11, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}
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
                            stroke={colors.radarStroke}
                            fill={colors.radarFill}
                            fillOpacity={0.25}
                            strokeWidth={2}
                        />
                        <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Bar breakdown rows */}
            <div className="flavor-bars">
                {data.map(({ subject, A }) => (
                    <div key={subject} className="flavor-bar-row">
                        <span className="flavor-bar-label">{subject}</span>
                        <div className="flavor-bar-track">
                            <div
                                className="flavor-bar-fill"
                                style={{ width: `${(A / 10) * 100}%` }}
                            />
                        </div>
                        <span className="flavor-bar-value">{A}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FlavorChart;
