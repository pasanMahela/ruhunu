const Item = require('../models/Item');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Category = require('../models/Category');
const StockPurchase = require('../models/StockPurchase');

// @desc    Get all items
// @route   GET /api/items
// @access  Private
exports.getItems = asyncHandler(async (req, res, next) => {
  console.log('Getting all items...');
  try {
    console.log('Attempting database query...');
    const items = await Item.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    console.log('Database query completed');
    console.log('Items found:', items.length);
    
    if (!items) {
      console.log('No items found in database');
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    console.log('Sending response...');
    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error in getItems:', error);
    return next(new ErrorResponse('Error fetching items', 500));
  }
});

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id)
    .populate('category', 'name');

  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Create new item
// @route   POST /api/items
// @access  Private (Admin, Cashier)
exports.createItem = async (req, res) => {
  try {
    // Check if item with same name exists
    const existingItem = await Item.findOne({ name: req.body.name });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'An item with this name already exists'
      });
    }

    // Generate next item code
    const itemCode = await Item.generateNextItemCode();
    
    // Create the item with the generated code
    const item = await Item.create({
      ...req.body,
      itemCode
    });

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating item',
      error: error.message
    });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private/Admin/Manager
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // If name is being updated, check if it's already taken by another item
    if (name) {
      const existingItem = await Item.findOne({ 
        name, 
        _id: { $ne: id } // Exclude current item from the check
      });
      
      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'An item with this name already exists'
        });
      }
    }

    const item = await Item.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating item',
      error: error.message
    });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id or /api/items/code/:itemCode
// @access  Private/Admin
exports.deleteItem = asyncHandler(async (req, res, next) => {
  let item;
  
  // Check if the request is using itemCode
  if (req.params.itemCode) {
    item = await Item.findOne({ itemCode: req.params.itemCode });
  } else {
    item = await Item.findById(req.params.id);
  }

  if (!item) {
    return next(new ErrorResponse(`Item not found`, 404));
  }

  await item.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update stock
// @route   PATCH /api/items/code/:itemCode/stock
// @access  Private (Admin, Cashier)
exports.updateStock = asyncHandler(async (req, res, next) => {
  const { itemCode } = req.params;
  const { quantity, location, lowerLimit, purchasePrice, retailPrice, discount } = req.body;

  // Find the item by code
  const item = await Item.findOne({ itemCode });
  if (!item) {
    return next(new ErrorResponse(`Item not found with code ${itemCode}`, 404));
  }

  // Update the item
  const updatedItem = await Item.findByIdAndUpdate(
    item._id,
    {
      $inc: { quantityInStock: quantity },
      ...(location && { location }),
      ...(lowerLimit !== undefined && { lowerLimit }),
      ...(purchasePrice !== undefined && { purchasePrice }),
      ...(retailPrice !== undefined && { retailPrice }),
      ...(discount !== undefined && { discount })
    },
    { new: true, runValidators: true }
  ).populate('category', 'name');

  // Create StockPurchase record if quantity is positive (stock addition)
  if (quantity > 0) {
    const finalPurchasePrice = purchasePrice || item.purchasePrice;
    const finalRetailPrice = retailPrice || item.retailPrice;
    const totalPurchaseValue = quantity * finalPurchasePrice;

    await StockPurchase.create({
      item: item._id,
      itemCode: item.itemCode,
      itemName: item.name,
      quantity: quantity,
      purchasePrice: finalPurchasePrice,
      retailPrice: finalRetailPrice,
      totalPurchaseValue: totalPurchaseValue,
      addedBy: req.user._id,
      addedByUser: req.user.name,
      notes: `Stock added via AddStocks page`
    });
  }

  res.status(200).json({
    success: true,
    data: updatedItem
  });
});

// @desc    Get single item by itemCode
// @route   GET /api/items/code/:itemCode
// @access  Private
exports.getItemByCode = asyncHandler(async (req, res, next) => {
  const item = await Item.findOne({ itemCode: req.params.itemCode })
    .populate('category', 'name');

  if (!item) {
    return next(new ErrorResponse(`Item not found with code of ${req.params.itemCode}`, 404));
  }

  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Search items
// @route   GET /api/items/search
// @access  Private
exports.searchItems = async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Search query:', q);
    
    if (!q) {
      console.log('No search query provided');
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    console.log('Searching items with query:', q);
    const items = await Item.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { itemCode: { $regex: q, $options: 'i' } }
      ]
    }).populate('category', 'name');

    console.log('Found items:', items.length);
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching items',
      error: error.message
    });
  }
};

// @desc    Create multiple items (bulk upload)
// @route   POST /api/items/bulk
// @access  Private/Admin
exports.createBulkItems = asyncHandler(async (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return next(new ErrorResponse('Please provide an array of items to create', 400));
  }

  try {
    const results = {
      success: [],
      errors: []
    };

    // Process items sequentially to maintain order and handle errors properly
    for (const itemData of items) {
      try {
        // Check if item with same name exists
        const existingItem = await Item.findOne({ name: itemData.name });
        if (existingItem) {
          results.errors.push({
            item: itemData.name,
            error: 'An item with this name already exists'
          });
          continue;
        }

        // Generate next item code
        const itemCode = await Item.generateNextItemCode();
        
        // Create the item
        const item = await Item.create({
          ...itemData,
          itemCode
        });

        results.success.push({
          name: item.name,
          itemCode: item.itemCode
        });
      } catch (error) {
        results.errors.push({
          item: itemData.name,
          error: error.message
        });
      }
    }

    // Return results
    res.status(200).json({
      success: true,
      data: {
        totalProcessed: items.length,
        successful: results.success.length,
        failed: results.errors.length,
        successfulItems: results.success,
        failedItems: results.errors
      }
    });
  } catch (error) {
    console.error('Error in bulk item creation:', error);
    return next(new ErrorResponse('Error processing bulk item creation', 500));
  }
}); 