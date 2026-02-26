// routes/marketingRoutes.js
import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    getCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    getMarketingStats,
    getSubscribers,
    deleteSubscriber,
    bulkDeleteSubscribers,
    exportSubscribers
} from '../controllers/marketingController.js';

const router = express.Router();

// All marketing routes require admin auth
router.use(protect, admin);

// ── Campaigns ──────────────────────────────────────────
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaign);
router.post('/campaigns', createCampaign);
router.put('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.post('/campaigns/:id/send', sendCampaign);

// ── Stats ──────────────────────────────────────────────
router.get('/stats', getMarketingStats);

// ── Subscribers ────────────────────────────────────────
router.get('/subscribers', getSubscribers);
router.get('/subscribers/export', exportSubscribers);
router.delete('/subscribers/bulk', bulkDeleteSubscribers);
router.delete('/subscribers/:id', deleteSubscriber);

export default router;
