const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categories');

// Apply authentication middleware to all routes
router.use(protect);

// Get all categories
router.get('/', getCategories);

// Get single category
router.get('/:id', getCategory);

// Create new category (admin/cashier only)
router.post('/', authorize('admin', 'cashier'), createCategory);

// Update category (admin only)
router.put('/:id', authorize('admin'), updateCategory);

// Delete category (admin only)
router.delete('/:id', authorize('admin'), deleteCategory);

module.exports = router; 