const Sale = require('../models/Sale');
const Item = require('../models/Item');
const User = require('../models/User');

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total sales for today
    const todaySales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Get total sales
    const totalSales = await Sale.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Get total customers (unique customer names)
    const totalCustomers = await Sale.length;

    // Get inventory value
    const inventoryValue = await Item.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantityInStock', '$retailPrice'] } }
        }
      }
    ]);

    // Get low stock items
    const lowStockItems = await Item.find({
      $expr: { $lte: ['$quantityInStock', '$lowerLimit'] }
    }).select('name itemCode quantityInStock lowerLimit');

    // Get recent activity (last 5 sales)
    const recentActivity = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName total createdAt')
      .populate('cashier', 'name');

    // Get sales data for the last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const salesData = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get top selling items
    const topSellingItems = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      stats: {
        todaySales: todaySales[0]?.total || 0,
        totalSales: totalSales[0]?.total || 0,
        totalCustomers,
        inventoryValue: inventoryValue[0]?.total || 0
      },
      lowStockItems,
      recentActivity,
      salesData: {
        labels: salesData.map(item => item._id),
        datasets: [{
          label: 'Daily Sales',
          data: salesData.map(item => item.total),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      topSellingItems: {
        labels: topSellingItems.map(item => item._id),
        datasets: [{
          data: topSellingItems.map(item => item.total),
          backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)'
          ]
        }]
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
}; 