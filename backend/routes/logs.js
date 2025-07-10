const express = require('express');
const router = express.Router();
const { getActivityLogs, getStockEditLogs, getLogsSummary } = require('../controllers/logs');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin/manager role
router.use(protect);
router.use(authorize('admin', 'manager'));

// @route   GET /api/logs/activity
// @desc    Get activity logs with filtering
// @access  Private (Admin/Manager)
router.get('/activity', getActivityLogs);

// @route   GET /api/logs/stock-edits
// @desc    Get stock edit logs with filtering
// @access  Private (Admin/Manager)
router.get('/stock-edits', getStockEditLogs);

// @route   GET /api/logs/summary
// @desc    Get logs summary and analytics
// @access  Private (Admin/Manager)
router.get('/summary', getLogsSummary);

module.exports = router; 