import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Link, useLocation } from 'react-router-dom';
import { FaShieldAlt, FaClock, FaBook } from 'react-icons/fa';
import './PolicyPage.css';

const PolicyPage = ({ type, title }) => {
    const { publicSettings } = useContext(AppContext);
    const location = useLocation();

    const policies = [
        { id: 'privacyPolicy', title: 'Privacy Policy', path: '/privacy-policy' },
        { id: 'termsConditions', title: 'Terms & Conditions', path: '/terms-conditions' },
        { id: 'refundPolicy', title: 'Refund Policy', path: '/refund-policy' },
        { id: 'shippingPolicy', title: 'Shipping Policy', path: '/shipping-policy' }
    ];

    // Smarter content formatting with sectioning
    const formatContent = (content) => {
        if (!content) return (
            <div className="policy-empty">
                <FaShieldAlt style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1.5rem' }} />
                <p>The {title} is currently being refined to ensure the highest standards of clarity and heritage transparency.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Please check back in a few moments.</p>
            </div>
        );

        const lines = content.split('\n');
        const sections = [];
        let currentSection = { title: null, content: [] };

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Handle Header Level 1 (Main Section)
            if (trimmed.startsWith('##')) {
                if (currentSection.content.length > 0 || currentSection.title) {
                    sections.push({ ...currentSection });
                }
                currentSection = {
                    title: trimmed.replace('##', '').trim(),
                    level: 2,
                    content: []
                };
            }
            // Handle Header Level 2 (Sub-section)
            else if (trimmed.startsWith('#')) {
                if (currentSection.content.length > 0 || currentSection.title) {
                    sections.push({ ...currentSection });
                }
                currentSection = {
                    title: trimmed.replace('#', '').trim(),
                    level: 1,
                    content: []
                };
            }
            // Handle List Items
            else if (trimmed.startsWith('-')) {
                currentSection.content.push({
                    type: 'list',
                    text: trimmed.replace('-', '').trim()
                });
            }
            // Handle Key Points [!]
            else if (trimmed.startsWith('[!]')) {
                currentSection.content.push({
                    type: 'notice',
                    text: trimmed.replace('[!]', '').trim()
                });
            }
            // Regular Paragraphs
            else {
                currentSection.content.push({
                    type: 'p',
                    text: trimmed
                });
            }
        });

        // Push last section
        if (currentSection.content.length > 0 || currentSection.title) {
            sections.push(currentSection);
        }

        return sections.map((section, sIdx) => (
            <section key={sIdx} className={`policy-section ${section.title ? 'with-header' : ''}`}>
                {section.title && (
                    <h2 className={`policy-subtitle level-${section.level}`}>
                        {section.title}
                    </h2>
                )}
                <div className="section-body">
                    {section.content.map((item, iIdx) => {
                        if (item.type === 'list') return <span key={iIdx} className="policy-list-item">{item.text}</span>;
                        if (item.type === 'notice') return <div key={iIdx} className="policy-notice-box"><strong>Important:</strong> {item.text}</div>;
                        return <p key={iIdx}>{item.text}</p>;
                    })}
                </div>
            </section>
        ));
    };

    const content = publicSettings?.policies?.[type];

    return (
        <div className="policy-page fade-in">
            <div className="policy-container">
                {/* Sidebar Navigation */}
                <aside className="policy-sidebar">
                    <h4>Legal Resource</h4>
                    <nav className="policy-nav-list">
                        {policies.map(policy => (
                            <Link
                                key={policy.id}
                                to={policy.path}
                                className={`policy-nav-item ${location.pathname === policy.path ? 'active' : ''}`}
                            >
                                {policy.title}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <main className="policy-main">
                    <header className="policy-header">
                        <div className="policy-meta">
                            <span><FaShieldAlt /> Verified Policy</span>
                            <span><FaClock /> Revised: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h1>{title}</h1>
                    </header>

                    <div className="policy-inner-card">
                        <div className="policy-content">
                            <div className="policy-intro-icon">
                                <FaBook style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '2rem', opacity: 0.5 }} />
                            </div>
                            {formatContent(content)}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PolicyPage;
