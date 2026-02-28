import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AdPlacement.css';

const AdPlacement = ({ zone }) => {
    const [ad, setAd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
    const adRef = useRef(null);

    useEffect(() => {
        const fetchAd = async () => {
            try {
                const response = await fetch(`/api/promotions/placement/${zone}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setAd(data.data);
                    }
                }
            } catch (error) {
                console.error('Failed to load ad placement', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAd();
    }, [zone]);

    useEffect(() => {
        if (!ad || hasTrackedImpression) return;

        // Use Intersection Observer to track impression only when ad is visible
        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting) {
                // Track Impression
                fetch(`/api/promotions/${ad._id}/track/impression`, { method: 'POST' }).catch(e => console.error(e));
                setHasTrackedImpression(true);
                observer.disconnect();
            }
        }, { threshold: 0.5 }); // 50% visible

        if (adRef.current) {
            observer.observe(adRef.current);
        }

        return () => observer.disconnect();
    }, [ad, hasTrackedImpression]);

    if (loading || !ad) {
        return null; // Return nothing if no ad is active for this zone to prevent UI gaps
    }

    const handleAdClick = () => {
        // Fire and forget click tracking
        fetch(`/api/promotions/${ad._id}/track/click`, { method: 'POST' }).catch(e => console.error(e));
    };

    if (ad.type === 'banner') {
        return (
            <div className={`ad-placement-zone zone-${zone}`} ref={adRef}>
                <a href={ad.targetUrl} onClick={handleAdClick} className="ad-banner-link">
                    <div className="ad-banner" style={{ backgroundImage: `url(${ad.mediaUrl || '/placeholder.png'})` }}>
                        <div className="ad-sponsored-badge">Sponsored</div>
                        <div className="ad-banner-content">
                            {ad.content?.headline && <h3>{ad.content.headline}</h3>}
                            {ad.content?.subText && <p>{ad.content.subText}</p>}
                            {ad.content?.ctaText && <button className="btn-premium">{ad.content.ctaText}</button>}
                        </div>
                    </div>
                </a>
            </div>
        );
    }

    // Default: Sponsored Listing or Flash Deal card style
    return (
        <div className={`ad-placement-zone zone-${zone}`} ref={adRef}>
            <div className="ad-card">
                <div className="ad-sponsored-badge">Sponsored</div>
                {ad.mediaUrl && (
                    <div className="ad-media">
                        <img src={ad.mediaUrl} alt={ad.title} />
                    </div>
                )}
                <div className="ad-content">
                    <h4>{ad.content?.headline || ad.title}</h4>
                    <p>{ad.content?.subText}</p>
                    <a href={ad.targetUrl} onClick={handleAdClick} className="ad-cta-link">
                        {ad.content?.ctaText || 'Learn More'} &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdPlacement;
