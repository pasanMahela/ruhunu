const express = require('express');
const {
  getSalesReportSubscriptions,
  createSalesReportSubscription,
  updateSalesReportSubscription,
  deleteSalesReportSubscription,
  sendReportNow
} = require('../controllers/emailSubscriptionController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

// Sales report subscription routes
router.route('/sales-reports')
  .get(getSalesReportSubscriptions)
  .post(createSalesReportSubscription);

router.route('/sales-reports/:id')
  .put(updateSalesReportSubscription)
  .delete(deleteSalesReportSubscription);

// Send report now
router.post('/send-report-now', sendReportNow);

// Scheduler status route (for debugging)
router.get('/scheduler-status', (req, res) => {
  const emailScheduler = require('../services/emailScheduler');
  const status = emailScheduler.getSchedulerStatus();
  res.json({
    success: true,
    data: status
  });
});

module.exports = router; 