// routes/blogRoutes.js
import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    getBlogs,
    getBlogBySlug,
    getAdminBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    getBlogCategories
} from '../controllers/blogController.js';

const router = express.Router();

// Public routes
router.get('/', getBlogs);
router.get('/categories', getBlogCategories);
router.get('/:slug', getBlogBySlug);

// Admin routes
router.get('/admin/all', protect, admin, getAdminBlogs);
router.post('/', protect, admin, createBlog);
router.put('/:id', protect, admin, updateBlog);
router.delete('/:id', protect, admin, deleteBlog);

export default router;
