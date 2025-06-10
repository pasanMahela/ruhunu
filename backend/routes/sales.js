const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createSale,
  getSales,
  getSale
} = require('../controllers/sales');

router.post('/', protect, createSale);
router.get('/', protect, getSales);
router.get('/:id', protect, getSale);

module.exports = router; 