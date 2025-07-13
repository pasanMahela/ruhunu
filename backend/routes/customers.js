const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerByNic,
  updatePurchaseStats,
  getCustomerAnalytics,
  findOrCreateCustomer,
  testNicValidation,
  updateCustomerStatus
} = require('../controllers/customerController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Analytics route (put before /:id to avoid conflicts)
router.get('/analytics/overview', authorize('admin', 'manager'), getCustomerAnalytics);

// Search routes
router.get('/search/:query', searchCustomers);
router.get('/nic/:nic', getCustomerByNic);

// Test and utility routes
router.post('/test-nic', testNicValidation);

// Find or create for POS integration
router.post('/find-or-create', findOrCreateCustomer);

// CRUD routes
router
  .route('/')
  .get(getCustomers)
  .post(authorize('admin', 'manager', 'cashier'), createCustomer);

router
  .route('/:id')
  .get(getCustomer)
  .put(authorize('admin', 'manager'), updateCustomer)
  .delete(authorize('admin', 'manager'), deleteCustomer);

// Purchase stats update
router.put('/:id/purchase', updatePurchaseStats);

// Status update
router.patch('/:id/status', authorize('admin', 'manager'), updateCustomerStatus);

module.exports = router; 
 
 
 
 