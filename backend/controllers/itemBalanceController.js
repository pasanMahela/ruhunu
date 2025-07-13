const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Item = require('../models/Item');
const Sale = require('../models/Sale');
const StockPurchase = require('../models/StockPurchase');

// @desc    Get item balance report
// @route   GET /api/item-balance
// @access  Private (Admin only)
exports.getItemBalance = asyncHandler(async (req, res, next) => {
  // Get last 30 days date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  // Set time to start of day for thirtyDaysAgo and end of day for now
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);

  // Get all items with their categories
  const items = await Item.find().populate('category', 'name');

  // Get last 30 days purchases
  const lastMonthPurchases = await StockPurchase.aggregate([
    {
      $match: {
        createdAt: {
          $gte: thirtyDaysAgo,
          $lte: now
        }
      }
    },
    {
      $group: {
        _id: '$item',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalPurchaseValue' },
        itemCode: { $first: '$itemCode' },
        itemName: { $first: '$itemName' }
      }
    }
  ]);

  // Get last 30 days sales
  const lastMonthSales = await Sale.aggregate([
    {
      $match: {
        createdAt: {
          $gte: thirtyDaysAgo,
          $lte: now
        }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$items.item',
        totalQuantity: { $sum: '$items.quantity' },
        totalValue: { $sum: '$items.total' },
        itemCode: { $first: '$items.itemCode' },
        itemName: { $first: '$items.name' }
      }
    }
  ]);

  // Create maps for easy lookup
  const purchaseMap = new Map();
  lastMonthPurchases.forEach(purchase => {
    purchaseMap.set(purchase._id.toString(), purchase);
  });

  const salesMap = new Map();
  lastMonthSales.forEach(sale => {
    salesMap.set(sale._id.toString(), sale);
  });

  // Build the balance report
  const balanceReport = items.map(item => {
    const purchase = purchaseMap.get(item._id.toString()) || {
      totalQuantity: 0,
      totalValue: 0
    };

    const sale = salesMap.get(item._id.toString()) || {
      totalQuantity: 0,
      totalValue: 0
    };

    return {
      _id: item._id,
      itemCode: item.itemCode,
      name: item.name,
      category: item.category?.name || 'Uncategorized',
      currentStock: item.quantityInStock,
      lastMonthPurchases: {
        quantity: purchase.totalQuantity,
        value: purchase.totalValue
      },
      lastMonthSales: {
        quantity: sale.totalQuantity,
        value: sale.totalValue
      },
      remainingBalance: purchase.totalQuantity - sale.totalQuantity
    };
  });

  res.status(200).json({
    success: true,
    data: balanceReport,
    period: {
      start: thirtyDaysAgo,
      end: now
    }
  });
});

// @desc    Get item balance by item ID
// @route   GET /api/item-balance/:itemId
// @access  Private (Admin only)
exports.getItemBalanceById = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.itemId).populate('category', 'name');
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.itemId}`, 404));
  }

  // Get last 30 days date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  // Set time to start of day for thirtyDaysAgo and end of day for now
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);

  // Get last 30 days purchases for this item
  const lastMonthPurchases = await StockPurchase.aggregate([
    {
      $match: {
        item: item._id,
        createdAt: {
          $gte: thirtyDaysAgo,
          $lte: now
        }
      }
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalPurchaseValue' },
        purchaseCount: { $sum: 1 }
      }
    }
  ]);

  // Get last 30 days sales for this item
  const lastMonthSales = await Sale.aggregate([
    {
      $match: {
        createdAt: {
          $gte: thirtyDaysAgo,
          $lte: now
        }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $match: {
        'items.item': item._id
      }
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$items.quantity' },
        totalValue: { $sum: '$items.total' },
        saleCount: { $sum: 1 }
      }
    }
  ]);

  const purchase = lastMonthPurchases[0] || { totalQuantity: 0, totalValue: 0, purchaseCount: 0 };
  const sale = lastMonthSales[0] || { totalQuantity: 0, totalValue: 0, saleCount: 0 };

  const balanceData = {
    item: {
      _id: item._id,
      itemCode: item.itemCode,
      name: item.name,
      category: item.category?.name || 'Uncategorized',
      currentStock: item.quantityInStock,
      purchasePrice: item.purchasePrice,
      retailPrice: item.retailPrice
    },
    lastMonthPurchases: {
      quantity: purchase.totalQuantity,
      value: purchase.totalValue,
      count: purchase.purchaseCount
    },
    lastMonthSales: {
      quantity: sale.totalQuantity,
      value: sale.totalValue,
      count: sale.saleCount
    },
    remainingBalance: purchase.totalQuantity - sale.totalQuantity,
    period: {
      start: thirtyDaysAgo,
      end: now
    }
  };

  res.status(200).json({
    success: true,
    data: balanceData
  });
}); 