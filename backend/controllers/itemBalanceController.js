const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Item = require('../models/Item');
const Sale = require('../models/Sale');
const StockPurchase = require('../models/StockPurchase');

// @desc    Get item balance report
// @route   GET /api/item-balance
// @access  Private (Admin only)
exports.getItemBalance = asyncHandler(async (req, res, next) => {
  // Get last month's date range
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get all items with their categories
  const items = await Item.find().populate('category', 'name');

  // Get last month's purchases
  const lastMonthPurchases = await StockPurchase.aggregate([
    {
      $match: {
        createdAt: {
          $gte: lastMonth,
          $lte: lastMonthEnd
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

  // Get last month's sales
  const lastMonthSales = await Sale.aggregate([
    {
      $match: {
        createdAt: {
          $gte: lastMonth,
          $lte: lastMonthEnd
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
      remainingBalance: item.quantityInStock + purchase.totalQuantity - sale.totalQuantity
    };
  });

  res.status(200).json({
    success: true,
    data: balanceReport,
    period: {
      start: lastMonth,
      end: lastMonthEnd
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

  // Get last month's date range
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get last month's purchases for this item
  const lastMonthPurchases = await StockPurchase.aggregate([
    {
      $match: {
        item: item._id,
        createdAt: {
          $gte: lastMonth,
          $lte: lastMonthEnd
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

  // Get last month's sales for this item
  const lastMonthSales = await Sale.aggregate([
    {
      $match: {
        createdAt: {
          $gte: lastMonth,
          $lte: lastMonthEnd
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
    remainingBalance: item.quantityInStock + purchase.totalQuantity - sale.totalQuantity,
    period: {
      start: lastMonth,
      end: lastMonthEnd
    }
  };

  res.status(200).json({
    success: true,
    data: balanceData
  });
}); 