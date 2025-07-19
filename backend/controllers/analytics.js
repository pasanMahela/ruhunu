const Sale = require('../models/Sale');
const Item = require('../models/Item');
const User = require('../models/User');
const mongoose = require('mongoose');

// Real-time Sales Tracking
exports.getRealTimeSales = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Real-time sales aggregation
    const salesData = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$total' },
          totalItems: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    // Hourly sales for today
    const hourlySales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          sales: { $sum: '$total' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Recent transactions (last 10)
    const recentTransactions = await Sale.find({
      paymentStatus: 'completed'
    })
    .populate('cashier', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('billNumber total paymentMethod createdAt cashier customerName');

    res.status(200).json({
      success: true,
      data: {
        summary: salesData[0] || {
          totalSales: 0,
          totalTransactions: 0,
          averageTransaction: 0,
          totalItems: 0
        },
        hourlySales,
        recentTransactions,
        period,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting real-time sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching real-time sales data'
    });
  }
};

// Profit/Loss Analysis
exports.getProfitLossAnalysis = async (req, res) => {
  try {
    const { period = 'month', groupBy = 'day' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Profit/Loss by time period
    let groupByFormat;
    switch (groupBy) {
      case 'hour':
        groupByFormat = { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        groupByFormat = { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        groupByFormat = { 
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupByFormat = { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        groupByFormat = { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const profitLossData = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.item',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: '$itemDetails' },
      {
        $group: {
          _id: groupByFormat,
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          cost: { $sum: { $multiply: ['$items.quantity', '$itemDetails.purchasePrice'] } },
          profit: { 
            $sum: { 
              $subtract: [
                { $multiply: ['$items.quantity', '$items.price'] },
                { $multiply: ['$items.quantity', '$itemDetails.purchasePrice'] }
              ]
            }
          },
          transactions: { $addToSet: '$_id' }
        }
      },
      {
        $addFields: {
          transactionCount: { $size: '$transactions' },
          profitMargin: {
            $cond: [
              { $eq: ['$revenue', 0] },
              0,
              { $multiply: [{ $divide: ['$profit', '$revenue'] }, 100] }
            ]
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Profit by category
    const profitByCategory = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.item',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: '$itemDetails' },
      {
        $lookup: {
          from: 'categories',
          localField: 'itemDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $group: {
          _id: '$categoryDetails.name',
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          cost: { $sum: { $multiply: ['$items.quantity', '$itemDetails.purchasePrice'] } },
          profit: { 
            $sum: { 
              $subtract: [
                { $multiply: ['$items.quantity', '$items.price'] },
                { $multiply: ['$items.quantity', '$itemDetails.purchasePrice'] }
              ]
            }
          },
          quantity: { $sum: '$items.quantity' }
        }
      },
      {
        $addFields: {
          profitMargin: {
            $cond: [
              { $eq: ['$revenue', 0] },
              0,
              { $multiply: [{ $divide: ['$profit', '$revenue'] }, 100] }
            ]
          }
        }
      },
      { $sort: { profit: -1 } }
    ]);

    // Top performing products
    const topProducts = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'items',
          localField: 'items.item',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: '$itemDetails' },
      {
        $group: {
          _id: '$items.item',
          name: { $first: '$itemDetails.name' },
          itemCode: { $first: '$itemDetails.itemCode' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          cost: { $sum: { $multiply: ['$items.quantity', '$itemDetails.purchasePrice'] } },
          profit: { 
            $sum: { 
              $subtract: [
                { $multiply: ['$items.quantity', '$items.price'] },
                { $multiply: ['$items.quantity', '$itemDetails.purchasePrice'] }
              ]
            }
          },
          quantity: { $sum: '$items.quantity' }
        }
      },
      {
        $addFields: {
          profitMargin: {
            $cond: [
              { $eq: ['$revenue', 0] },
              0,
              { $multiply: [{ $divide: ['$profit', '$revenue'] }, 100] }
            ]
          }
        }
      },
      { $sort: { profit: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        profitLossData,
        profitByCategory,
        topProducts,
        period,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Error getting profit/loss analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profit/loss analysis'
    });
  }
};

// Customer Behavior Analytics
exports.getCustomerBehaviorAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Customer purchase frequency
    const customerFrequency = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed',
          customer: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$customer',
          customerName: { $first: '$customerName' },
          customerNic: { $first: '$customerNic' },
          totalPurchases: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          lastPurchase: { $max: '$createdAt' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    // Purchase patterns by day of week
    const purchasePatternsByDay = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          transactions: { $sum: 1 },
          revenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Payment method preferences
    const paymentMethodStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          averageAmount: { $avg: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Customer segmentation
    const customerSegments = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed',
          customer: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$total' },
          purchaseCount: { $sum: 1 }
        }
      },
      {
        $bucket: {
          groupBy: '$totalSpent',
          boundaries: [0, 10000, 50000, 100000, 500000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            averageSpent: { $avg: '$totalSpent' },
            totalRevenue: { $sum: '$totalSpent' }
          }
        }
      }
    ]);

    // Repeat customer rate
    const repeatCustomerStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed',
          customer: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$customer',
          purchaseCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: {
              $cond: [{ $gt: ['$purchaseCount', 1] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          repeatCustomerRate: {
            $cond: [
              { $eq: ['$totalCustomers', 0] },
              0,
              { $multiply: [{ $divide: ['$repeatCustomers', '$totalCustomers'] }, 100] }
            ]
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        customerFrequency,
        purchasePatternsByDay,
        paymentMethodStats,
        customerSegments,
        repeatCustomerStats: repeatCustomerStats[0] || { 
          totalCustomers: 0, 
          repeatCustomers: 0, 
          repeatCustomerRate: 0 
        },
        period,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Error getting customer behavior analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer behavior analytics'
    });
  }
};

// Peak Hours Analysis
exports.getPeakHoursAnalysis = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    // Hourly analysis
    const hourlyAnalysis = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          transactions: { $sum: 1 },
          revenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          uniqueCustomers: { $addToSet: '$customer' }
        }
      },
      {
        $addFields: {
          uniqueCustomerCount: { $size: '$uniqueCustomers' }
        }
      },
      {
        $project: {
          hour: '$_id',
          transactions: 1,
          revenue: 1,
          averageOrderValue: 1,
          uniqueCustomerCount: 1
        }
      },
      { $sort: { hour: 1 } }
    ]);

    // Day of week analysis
    const dayOfWeekAnalysis = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          transactions: { $sum: 1 },
          revenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          uniqueCustomers: { $addToSet: '$customer' }
        }
      },
      {
        $addFields: {
          uniqueCustomerCount: { $size: '$uniqueCustomers' },
          dayName: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Sunday' },
                { case: { $eq: ['$_id', 2] }, then: 'Monday' },
                { case: { $eq: ['$_id', 3] }, then: 'Tuesday' },
                { case: { $eq: ['$_id', 4] }, then: 'Wednesday' },
                { case: { $eq: ['$_id', 5] }, then: 'Thursday' },
                { case: { $eq: ['$_id', 6] }, then: 'Friday' },
                { case: { $eq: ['$_id', 7] }, then: 'Saturday' }
              ],
              default: 'Unknown'
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Staff performance during peak hours
    const staffPerformance = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $addFields: {
          hour: { $hour: '$createdAt' }
        }
      },
      {
        $group: {
          _id: {
            cashier: '$cashier',
            hour: '$hour'
          },
          transactions: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.cashier',
          foreignField: '_id',
          as: 'cashierDetails'
        }
      },
      { $unwind: '$cashierDetails' },
      {
        $group: {
          _id: '$_id.cashier',
          cashierName: { $first: '$cashierDetails.name' },
          hourlyPerformance: {
            $push: {
              hour: '$_id.hour',
              transactions: '$transactions',
              revenue: '$revenue'
            }
          },
          totalTransactions: { $sum: '$transactions' },
          totalRevenue: { $sum: '$revenue' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Peak hours identification
    const peakHours = hourlyAnalysis
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 3)
      .map(hour => ({
        hour: hour.hour,
        transactions: hour.transactions,
        revenue: hour.revenue,
        timeRange: `${hour.hour}:00 - ${hour.hour + 1}:00`
      }));

    // Peak days identification
    const peakDays = dayOfWeekAnalysis
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 3)
      .map(day => ({
        day: day.dayName,
        transactions: day.transactions,
        revenue: day.revenue
      }));

    res.status(200).json({
      success: true,
      data: {
        hourlyAnalysis,
        dayOfWeekAnalysis,
        staffPerformance,
        peakHours,
        peakDays,
        period,
        dateRange: { startDate, endDate },
        recommendations: {
          staffOptimization: `Consider scheduling more staff during ${peakHours[0]?.timeRange || 'peak hours'}`,
          busyDays: `${peakDays[0]?.day || 'Peak day'} is your busiest day - ensure adequate preparation`,
          quietPeriods: hourlyAnalysis
            .sort((a, b) => a.transactions - b.transactions)
            .slice(0, 2)
            .map(h => `${h.hour}:00-${h.hour + 1}:00`)
        }
      }
    });

  } catch (error) {
    console.error('Error getting peak hours analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching peak hours analysis'
    });
  }
};

// Dashboard Summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const { date } = req.query;
    let now = new Date();
    
    // If a specific date is requested, use that date
    if (date) {
      now = new Date(date);
    }
    
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's (or specified date's) summary
    const todayStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          transactions: { $sum: 1 },
          items: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    // Week comparison (from the reference date)
    const weekStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lt: endOfDay },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          transactions: { $sum: 1 }
        }
      }
    ]);

    // Month comparison (from the reference date)
    const monthStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lt: endOfDay },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          transactions: { $sum: 1 }
        }
      }
    ]);

    // Low stock alerts (only for current data, not historical)
    const lowStockItems = date ? [] : await Item.find({
      stock: { $lte: 10 }
    }).select('name itemCode stock reorderLevel').limit(5);

    // Top selling items for the day
    const topItemsToday = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          paymentStatus: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: '$itemDetails' },
      {
        $project: {
          name: '$itemDetails.name',
          itemCode: '$itemDetails.itemCode',
          quantity: 1,
          revenue: 1
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        today: todayStats[0] || { sales: 0, transactions: 0, items: 0 },
        week: weekStats[0] || { sales: 0, transactions: 0 },
        month: monthStats[0] || { sales: 0, transactions: 0 },
        lowStockItems,
        topItemsToday,
        lastUpdated: new Date(),
        requestedDate: date || 'today'
      }
    });

  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary'
    });
  }
}; 