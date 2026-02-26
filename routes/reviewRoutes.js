import express from 'express';
import {
    createProductReview,
    getProductReviews,
    deleteReview,
    createSiteReview,
    getTopReviews
} from '../controllers/reviewController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createSiteReview)
    .get(getTopReviews);

router.get('/top', getTopReviews);

router.route('/product/:productId')
    .get(getProductReviews)
    .post(protect, createProductReview);

router.route('/:id')
    .delete(protect, deleteReview);

export default router;
