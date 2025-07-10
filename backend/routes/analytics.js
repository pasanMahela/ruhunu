const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const {
  getRealTimeSales,
  getProfitLossAnalysis,
  getCustomerBehaviorAnalytics,
  getPeakHoursAnalysis,
  getDashboardSummary
} = require('../controllers/analytics');

// All routes require authentication and manager/admin access
router.use(protect);
router.use(authorize('admin', 'manager'));

// @desc    Get real-time sales data
// @route   GET /api/analytics/real-time-sales
// @access  Private (Manager/Admin)
router.get('/real-time-sales', asyncHandler(getRealTimeSales));

// @desc    Get profit/loss analysis
// @route   GET /api/analytics/profit-loss
// @access  Private (Manager/Admin)
router.get('/profit-loss', asyncHandler(getProfitLossAnalysis));

// @desc    Get customer behavior analytics
// @route   GET /api/analytics/customer-behavior
// @access  Private (Manager/Admin)
router.get('/customer-behavior', asyncHandler(getCustomerBehaviorAnalytics));

// @desc    Get peak hours analysis
// @route   GET /api/analytics/peak-hours
// @access  Private (Manager/Admin)
router.get('/peak-hours', asyncHandler(getPeakHoursAnalysis));

// @desc    Get dashboard summary
// @route   GET /api/analytics/dashboard-summary
// @access  Private (Manager/Admin)
router.get('/dashboard-summary', asyncHandler(getDashboardSummary));

module.exports = router; 