const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createSale,
  getSales,
  getSale,
  getSalesReports,
  getItemSalesReports,
  searchBills,
  getRecentBills,
  deleteSale
} = require('../controllers/sales');

router.post('/', protect, createSale);
router.get('/', protect, getSales);
router.get('/search', protect, searchBills);
router.get('/recent', protect, getRecentBills);
router.get('/reports', protect, getSalesReports);
router.get('/item-reports', protect, getItemSalesReports);
router.get('/:id', protect, getSale);
router.delete('/:id', protect, deleteSale);

module.exports = router; 