const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const { createActivityLog, createStockEditLog } = require('./logs');

// @desc    Create a new sale
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res) => {
  try {
    const {
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus,
      customer,
      customerNic,
      customerName,
      amountPaid,
      balance
    } = req.body;

    console.log('Received sale data:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required and must not be empty'
      });
    }

    if (!subtotal || !total || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Subtotal, total, and payment method are required'
      });
    }

    // Validate items array
    for (const item of items) {
      if (!item.item || !item.name || !item.quantity || !item.price || !item.total) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have item ID, name, quantity, price, and total'
        });
      }
    }

    // Create new sale with cashier information
    const sale = new Sale({
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus: paymentStatus || 'completed',
      customer: customer || null,
      customerNic: customerNic || null,
      customerName: customerName?.trim() || 'Walk-in Customer',
      amountPaid,
      balance,
      cashier: req.user._id
    });

    await sale.save();

    // Update item quantities and create stock edit logs
    for (const item of items) {
      const itemDoc = await Item.findById(item.item);
      if (itemDoc) {
        const oldStock = itemDoc.quantityInStock;
        const newStock = oldStock - item.quantity;
        
        await Item.findByIdAndUpdate(item.item, {
          $inc: { quantityInStock: -item.quantity }
        });

        // Create stock edit log
        try {
          await createStockEditLog({
            user: req.user._id,
            userName: req.user.name,
            item: item.item,
            itemCode: itemDoc.itemCode || itemDoc.code,
            itemName: item.name,
            operation: 'stock_update',
            currentStock: {
              oldValue: oldStock,
              newValue: newStock
            },
            purchaseQuantity: 0,
            purchasePrice: {
              oldValue: itemDoc.purchasePrice || 0,
              newValue: itemDoc.purchasePrice || 0
            },
            retailPrice: {
              oldValue: itemDoc.sellingPrice || 0,
              newValue: itemDoc.sellingPrice || 0
            },
            discount: {
              oldValue: itemDoc.discount || 0,
              newValue: itemDoc.discount || 0
            },
            reason: 'Sale transaction',
            relatedTransaction: sale._id
          });
        } catch (logError) {
          console.error('Error creating stock edit log:', logError);
        }
      }
    }

    // Update customer purchase statistics if customer is provided
    if (customer) {
      try {
        const customerDoc = await Customer.findById(customer);
        if (customerDoc) {
          await customerDoc.updatePurchaseStats(total);
        }
      } catch (customerError) {
        console.warn('Error updating customer stats:', customerError);
        // Don't fail the sale if customer update fails
      }
    }

    // Create activity log
    try {
      await createActivityLog({
        user: req.user._id,
        userName: req.user.name,
        activity: 'Sale Created',
        description: `Sale ${sale.billNumber} completed for ${customerName} - Total: Rs. ${total}`,
        relatedEntity: {
          entityType: 'sale',
          entityId: sale._id
        },
        metadata: {
          billNumber: sale.billNumber,
          total: total,
          paymentMethod: paymentMethod,
          itemCount: items.length
        }
      });
    } catch (logError) {
      console.error('Error creating activity log:', logError);
    }

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sale',
      error: error.message
    });
  }
};

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('cashier', 'name') // Populate cashier information
      .populate('customer', 'nic name customerType') // Populate customer information
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales',
      error: error.message
    });
  }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name email')
      .populate('customer', 'nic name email phone customerType totalSpent purchaseCount');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Map the data to include required fields for frontend
    const mappedSale = {
      ...sale.toObject(),
      totalAmount: sale.total,
      change: sale.balance
    };

    res.status(200).json({
      success: true,
      data: mappedSale
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sale'
    });
  }
};

// @desc    Get sales reports with analytics
// @route   GET /api/sales/reports
// @access  Private
exports.getSalesReports = async (req, res) => {
  try {
    const { fromDate, toDate, customerSearch } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'From date and to date are required'
      });
    }

    // Build the aggregation pipeline
    const matchStage = {
      createdAt: {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
      }
    };

    // Add customer search filter if provided
    if (customerSearch && customerSearch.trim()) {
      matchStage.customerName = {
        $regex: customerSearch.trim(),
        $options: 'i'
      };
    }

    // Detailed report - get all sales with item details
    const detailedSales = await Sale.aggregate([
      { $match: matchStage },
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
        $project: {
          saleDate: '$createdAt',
          itemName: '$items.name',
          itemCode: '$items.itemCode',
          customerName: '$customerName',
          quantity: '$items.quantity',
          price: '$items.price',
          discount: '$items.discount',
          total: '$items.total',
          profit: {
            $subtract: [
              '$items.total',
              { $multiply: ['$itemDetails.purchasePrice', '$items.quantity'] }
            ]
          },
          stockBalance: '$itemDetails.quantityInStock'
        }
      },
      { $sort: { saleDate: -1 } }
    ]);

    // Summary report - aggregate by item
    const summaryReport = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            itemId: '$items.item',
            itemName: '$items.name'
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          totalDiscount: { $sum: '$items.discount' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id.itemId',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: '$itemDetails' },
      {
        $project: {
          itemName: '$_id.itemName',
          totalQuantity: 1,
          totalRevenue: 1,
          totalDiscount: 1,
          salesCount: 1,
          totalProfit: {
            $subtract: [
              '$totalRevenue',
              { $multiply: ['$itemDetails.purchasePrice', '$totalQuantity'] }
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Calculate overall metrics
    const overallMetrics = await Sale.aggregate([
      { $match: matchStage },
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
          _id: null,
          totalSales: { $sum: '$items.total' },
          totalQuantity: { $sum: '$items.quantity' },
          totalDiscount: { $sum: '$items.discount' },
          totalProfit: {
            $sum: {
              $subtract: [
                '$items.total',
                { $multiply: ['$itemDetails.purchasePrice', '$items.quantity'] }
              ]
            }
          },
          uniqueItems: { $addToSet: '$items.item' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalQuantity: 1,
          totalDiscount: 1,
          totalProfit: 1,
          totalItems: { $size: '$uniqueItems' }
        }
      }
    ]);

    // Default metrics if no data found
    const metrics = overallMetrics.length > 0 ? overallMetrics[0] : {
      totalSales: 0,
      totalQuantity: 0,
      totalDiscount: 0,
      totalProfit: 0,
      totalItems: 0
    };

    res.json({
      success: true,
      data: {
        detailed: detailedSales,
        summary: summaryReport,
        metrics: metrics,
        dateRange: {
          from: fromDate,
          to: toDate
        },
        filters: {
          customerSearch: customerSearch || null
        }
      }
    });

  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sales report',
      error: error.message
    });
  }
};

// @desc    Get item sales reports with detailed transaction history
// @route   GET /api/sales/item-reports
// @access  Private
exports.getItemSalesReports = async (req, res) => {
  try {
    const { fromDate, toDate, itemCode } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'From date and to date are required'
      });
    }

    // Build the aggregation pipeline
    const matchStage = {
      createdAt: {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
      }
    };

    // Add item code filter if provided
    if (itemCode && itemCode.trim()) {
      matchStage['items.itemCode'] = {
        $regex: itemCode.trim(),
        $options: 'i'
      };
    }

    // Get detailed sales data for specific items
    const salesData = await Sale.aggregate([
      { $match: matchStage },
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
      // Apply item code filter after lookup if specified
      ...(itemCode && itemCode.trim() ? [{
        $match: {
          $or: [
            { 'items.itemCode': { $regex: itemCode.trim(), $options: 'i' } },
            { 'itemDetails.itemCode': { $regex: itemCode.trim(), $options: 'i' } },
            { 'items.name': { $regex: itemCode.trim(), $options: 'i' } },
            { 'itemDetails.name': { $regex: itemCode.trim(), $options: 'i' } }
          ]
        }
      }] : []),
      {
        $project: {
          saleDate: '$createdAt',
          itemName: '$items.name',
          itemCode: '$items.itemCode',
          customerName: '$customerName',
          quantity: '$items.quantity',
          price: '$items.price',
          discount: '$items.discount',
          total: '$items.total',
          profit: {
            $subtract: [
              '$items.total',
              { $multiply: ['$itemDetails.purchasePrice', '$items.quantity'] }
            ]
          }
        }
      },
      { $sort: { saleDate: -1 } } // Most recent first
    ]);

    // Calculate metrics
    const metrics = {
      totalTransactions: salesData.length,
      totalQuantity: salesData.reduce((sum, item) => sum + item.quantity, 0),
      totalRevenue: salesData.reduce((sum, item) => sum + item.total, 0),
      totalDiscount: salesData.reduce((sum, item) => sum + item.discount, 0),
      totalProfit: salesData.reduce((sum, item) => sum + item.profit, 0),
      averagePrice: salesData.length > 0
        ? salesData.reduce((sum, item) => sum + item.price, 0) / salesData.length
        : 0
    };

    res.json({
      success: true,
      data: {
        salesData,
        metrics,
        dateRange: {
          from: fromDate,
          to: toDate
        },
        filters: {
          itemCode: itemCode || null
        }
      }
    });

  } catch (error) {
    console.error('Error generating item sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating item sales report',
      error: error.message
    });
  }
};

// @desc    Search bills by date, bill number, or both
// @route   GET /api/sales/search
// @access  Private
exports.searchBills = async (req, res) => {
  try {
    const { date, billNumber } = req.query;

    // Build search criteria
    let matchCriteria = {};

    // Add date filter if provided
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(searchDate.getDate() + 1);
      
      matchCriteria.createdAt = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    // Add bill number filter if provided
    if (billNumber) {
      matchCriteria.billNumber = {
        $regex: billNumber.trim(),
        $options: 'i'
      };
    }

    // If no criteria provided, return empty results
    if (!date && !billNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either date or bill number to search'
      });
    }

    const sales = await Sale.find(matchCriteria)
      .populate('cashier', 'name email')
      .populate('customer', 'nic name customerType')
      .select('billNumber createdAt customerName customerNic total items subtotal tax discount amountPaid balance paymentMethod paymentStatus')
      .sort({ createdAt: -1 })
      .limit(100); // Limit results to prevent overload
    
    // Map the data to include totalAmount field
    const mappedSales = sales.map(sale => ({
      ...sale.toObject(),
      totalAmount: sale.total,
      change: sale.balance
    }));

    res.json({
      success: true,
      data: mappedSales,
      count: mappedSales.length,
      filters: {
        date: date || null,
        billNumber: billNumber || null
      }
    });

  } catch (error) {
    console.error('Error searching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching bills',
      error: error.message
    });
  }
};

// @desc    Get recent bills
// @route   GET /api/sales/recent
// @access  Private
exports.getRecentBills = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 bills

    const sales = await Sale.find()
      .populate('cashier', 'name email')
      .populate('customer', 'nic name customerType')
      .select('billNumber createdAt customerName customerNic total items subtotal tax discount amountPaid balance paymentMethod paymentStatus')
      .sort({ createdAt: -1 })
      .limit(limitNum);
    
    // Map the data to include totalAmount field
    const mappedSales = sales.map(sale => ({
      ...sale.toObject(),
      totalAmount: sale.total,
      change: sale.balance
    }));

    res.json({
      success: true,
      data: mappedSales,
      count: mappedSales.length
    });

  } catch (error) {
    console.error('Error fetching recent bills:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent bills',
      error: error.message
    });
  }
};

// @desc    Delete a sale
// @route   DELETE /api/sales/:id
// @access  Private (Admin only)
exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Check if user has permission (admin only)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Restore item quantities (reverse the sale)
    for (const item of sale.items) {
      await Item.findByIdAndUpdate(item.item, {
        $inc: { quantityInStock: item.quantity }
      });
    }

    // Update customer statistics if customer exists
    if (sale.customer) {
      try {
        const customer = await Customer.findById(sale.customer);
        if (customer) {
          // Reduce purchase count and total spent
          await Customer.findByIdAndUpdate(sale.customer, {
            $inc: {
              purchaseCount: -1,
              totalSpent: -sale.totalAmount
            }
          });
        }
      } catch (customerError) {
        console.warn('Error updating customer stats during deletion:', customerError);
      }
    }

    // Delete the sale
    await Sale.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sale',
      error: error.message
    });
  }
}; 