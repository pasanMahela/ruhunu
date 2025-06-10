const Sale = require('../models/Sale');
const Item = require('../models/Item');

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
      customerName: customerName?.trim() || 'Walk-in Customer',
      amountPaid,
      balance,
      cashier: req.user._id
    });

    await sale.save();

    // Update item quantities
    for (const item of items) {
      await Item.findByIdAndUpdate(item.item, {
        $inc: { quantityInStock: -item.quantity }
      });
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
      .populate('cashier', 'name email');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sale'
    });
  }
}; 