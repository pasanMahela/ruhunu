const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateItem, validateStockUpdate } = require('../utils/validators');
const {
  getItems,
  getItem,
  getItemByCode,
  getItemByBarcode,
  createItem,
  createBulkItems,
  updateItem,
  deleteItem,
  updateStock,
  searchItems
} = require('../controllers/items');
const { validateRequest } = require('../middleware/validate');

// Apply authentication middleware to all routes
router.use(protect);

// Debug middleware
router.use((req, res, next) => {
  console.log('Items Route - Request received:', {
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params
  });
  next();
});

// Get all items
router.get('/', getItems);

// Get item by code (must be before the ID route)
router.get('/code/:itemCode', getItemByCode);

// Get item by barcode (must be before the ID route)
router.get('/barcode/:barcode', getItemByBarcode);

// Search items (must be before the ID route)
router.get('/search', searchItems);

// Get single item by ID
router.get('/:id', getItem);

// Create new item
router.post('/', authorize('admin', 'cashier'), validateItem, validateRequest, createItem);

// Create multiple items (bulk upload)
router.post('/bulk', authorize('admin'), createBulkItems);

// Update item
router.put('/:id', authorize('admin'), validateItem, validateRequest, updateItem);

// Delete item by ID or code
router.delete('/:id', authorize('admin'), deleteItem);
router.delete('/code/:itemCode', authorize('admin'), deleteItem);

// Update stock by item code
router.patch('/code/:itemCode/stock', authorize('admin', 'cashier'), validateStockUpdate, validateRequest, updateStock);

module.exports = router; 