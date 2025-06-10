const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, dashboardController.getStats);

module.exports = router; 