import Ad from '../models/Ad.js';

// @desc    Get all ads (Admin)
// @route   GET /api/ads
// @access  Private/Admin
export const getAds = async (req, res) => {
    try {
        const ads = await Ad.find({}).sort({ createdAt: -1 });
        res.json({ success: true, count: ads.length, data: ads });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Get single ad
// @route   GET /api/ads/:id
// @access  Private/Admin
export const getAd = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.json({ success: true, data: ad });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Create new ad
// @route   POST /api/ads
// @access  Private/Admin
export const createAd = async (req, res) => {
    try {
        const ad = await Ad.create(req.body);
        res.status(201).json({ success: true, data: ad });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Bad Request', error: err.message });
    }
};

// @desc    Update ad
// @route   PUT /api/ads/:id
// @access  Private/Admin
export const updateAd = async (req, res) => {
    try {
        const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.json({ success: true, data: ad });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Bad Request', error: err.message });
    }
};

// @desc    Delete ad
// @route   DELETE /api/ads/:id
// @access  Private/Admin
export const deleteAd = async (req, res) => {
    try {
        const ad = await Ad.findByIdAndDelete(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Get active ad by placement
// @route   GET /api/ads/placement/:zone
// @access  Public
export const getAdByPlacement = async (req, res) => {
    try {
        const zone = req.params.zone;
        const now = new Date();

        // Find all active ads for the zone within current time
        // Find all active ads for the zone
        // Loosened the date filter to just check if it's "Active" to prevent timezone mismatches
        const ads = await Ad.find({
            placements: zone,
            status: 'Active'
        }).sort({ priority: -1 }); // Sort by highest priority

        if (!ads || ads.length === 0) {
            return res.status(200).json({ success: true, data: null }); // No ad to display
        }

        // In a full rotation system, we might pick randomly or round-robin if priorities are equal.
        // For now, we take the absolute highest priority match.
        // Or if multiple top priorities, pick randomized to rotate:
        const highestPriority = ads[0].priority;
        const topAds = ads.filter(ad => ad.priority === highestPriority);
        const selectedAd = topAds[Math.floor(Math.random() * topAds.length)];

        res.json({ success: true, data: selectedAd });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Track ad impression
// @route   POST /api/ads/:id/track/impression
// @access  Public
export const trackImpression = async (req, res) => {
    try {
        await Ad.findByIdAndUpdate(req.params.id, { $inc: { 'metrics.impressions': 1 } });
        res.status(200).json({ success: true });
    } catch (err) {
        // Fail silently for tracking
        res.status(200).json({ success: false });
    }
};

// @desc    Track ad click
// @route   POST /api/ads/:id/track/click
// @access  Public
export const trackClick = async (req, res) => {
    try {
        await Ad.findByIdAndUpdate(req.params.id, { $inc: { 'metrics.clicks': 1 } });
        res.status(200).json({ success: true });
    } catch (err) {
        // Fail silently for tracking
        res.status(200).json({ success: false });
    }
};
