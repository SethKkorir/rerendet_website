// routes/productRoutes.js - UPDATED
import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getProductBySlug,
  updateProductStock,
  uploadProductImages, // We'll create this
  deleteProductImage // We'll create this too
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, admin, upload.array('images', 5), createProduct); // ADD IMAGE UPLOAD

router.route('/:id')
  .get(getProductById)
  .put(protect, admin, upload.array('images', 5), updateProduct) // ADD IMAGE UPLOAD
  .delete(protect, admin, deleteProduct);

// ADD NEW ROUTE FOR IMAGE UPLOAD
router.route('/:id/images')
  .post(protect, admin, upload.array('images', 5), uploadProductImages)
  .delete(protect, admin, deleteProductImage); // We'll create this too

router.get('/featured/products', getFeaturedProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.patch('/:id/stock', protect, admin, updateProductStock);

export default router;