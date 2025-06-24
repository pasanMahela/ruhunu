const express = require('express');
const router = express.Router();
const { getItemBalance, getItemBalanceById } = require('../controllers/itemBalanceController');
const { protect } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);

// Get all items balance report
router.get('/', getItemBalance);

// Get specific item balance
router.get('/:itemId', getItemBalanceById);

module.exports = router; 