const ActivityLog = require('../models/ActivityLog');
const StockEditLog = require('../models/StockEditLog');

// @desc    Get activity logs with date filtering
// @route   GET /api/logs/activity
// @access  Private (Admin/Manager)
exports.getActivityLogs = async (req, res) => {
  try {
    const { fromDate, toDate, limit = 50, page = 1 } = req.query;

    // Build date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
      };
    } else if (fromDate) {
      dateFilter.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      dateFilter.createdAt = { $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) };
    } else {
      // Default to last 7 days if no date filter provided
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateFilter.createdAt = { $gte: lastWeek };
    }

    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find(dateFilter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalLogs = await ActivityLog.countDocuments(dateFilter);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs'
    });
  }
};

// @desc    Get stock edit logs with date filtering
// @route   GET /api/logs/stock-edits
// @access  Private (Admin/Manager)
exports.getStockEditLogs = async (req, res) => {
  try {
    const { fromDate, toDate, limit = 50, page = 1 } = req.query;

    // Build date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
      };
    } else if (fromDate) {
      dateFilter.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      dateFilter.createdAt = { $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) };
    } else {
      // Default to last 30 days if no date filter provided
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      dateFilter.createdAt = { $gte: lastMonth };
    }

    const skip = (page - 1) * limit;

    const logs = await StockEditLog.find(dateFilter)
      .populate('user', 'name email role')
      .populate('item', 'name category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalLogs = await StockEditLog.countDocuments(dateFilter);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stock edit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock edit logs'
    });
  }
};

// @desc    Get combined logs summary
// @route   GET /api/logs/summary
// @access  Private (Admin/Manager)
exports.getLogsSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter.createdAt = { $gte: today, $lt: tomorrow };
    }

    // Get activity logs summary
    const activitySummary = await ActivityLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$activity',
          count: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get stock edit logs summary
    const stockEditSummary = await StockEditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$operation',
          count: { $sum: 1 },
          lastEdit: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get total counts
    const totalActivityLogs = await ActivityLog.countDocuments(dateFilter);
    const totalStockEditLogs = await StockEditLog.countDocuments(dateFilter);

    // Get most active users
    const activeUsers = await ActivityLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$user',
          userName: { $first: '$userName' },
          activityCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { activityCount: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalActivityLogs,
          totalStockEditLogs,
          totalLogs: totalActivityLogs + totalStockEditLogs
        },
        activityBreakdown: activitySummary,
        stockEditBreakdown: stockEditSummary,
        activeUsers
      }
    });
  } catch (error) {
    console.error('Error fetching logs summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching logs summary'
    });
  }
};

// Helper function to create activity log (can be used by other controllers)
exports.createActivityLog = async (logData) => {
  try {
    return await ActivityLog.createLog(logData);
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
};

// Helper function to create stock edit log (can be used by other controllers)
exports.createStockEditLog = async (logData) => {
  try {
    return await StockEditLog.createStockLog(logData);
  } catch (error) {
    console.error('Error creating stock edit log:', error);
    throw error;
  }
}; 