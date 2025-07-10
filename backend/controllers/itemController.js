const Item = require('../models/Item');
const { validateItem, validateStockUpdate } = require('../utils/validators');
const { createActivityLog, createStockEditLog } = require('./logs');

// Get all items with search and filtering
exports.getItems = async (req, res) => {
  try {
    const { search, category, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    // Build query
    const query = { isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      query.category = category;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const items = await Item.find(query)
      .sort(sort)
      .select('-__v');

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

// Get single item by ID
exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).select('-__v');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item', error: error.message });
  }
};

// Create new item
exports.createItem = async (req, res) => {
  try {
    // Validate request body
    const { error } = validateItem(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if item code already exists
    const isItemCodeTaken = await Item.isItemCodeTaken(req.body.itemCode);
    if (isItemCodeTaken) {
      return res.status(400).json({ message: 'Item code already exists' });
    }

    const item = new Item(req.body);
    await item.save();

    // Create activity log
    try {
      await createActivityLog({
        user: req.user._id,
        userName: req.user.name,
        activity: 'Item Created',
        description: `New item "${item.name}" (${item.itemCode}) created`,
        relatedEntity: {
          entityType: 'item',
          entityId: item._id
        },
        metadata: {
          itemCode: item.itemCode,
          itemName: item.name,
          initialStock: item.quantityInStock
        }
      });
    } catch (logError) {
      console.error('Error creating activity log:', logError);
    }

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    // Validate request body
    const { error } = validateItem(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if item code is being changed and if it's already taken
    if (req.body.itemCode) {
      const existingItem = await Item.findOne({ 
        itemCode: req.body.itemCode.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingItem) {
        return res.status(400).json({ message: 'Item code already exists' });
      }
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

// Delete/Deactivate item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-__v');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating item', error: error.message });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    // Validate request body
    const { error } = validateStockUpdate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { quantity, operation } = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Calculate new quantity
    let newQuantity = item.quantityInStock;
    if (operation === 'add') {
      newQuantity += quantity;
    } else if (operation === 'subtract') {
      newQuantity -= quantity;
      if (newQuantity < 0) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
    }

    const oldQuantity = item.quantityInStock;
    
    // Update quantity
    item.quantityInStock = newQuantity;
    await item.save();

    // Create stock edit log
    try {
      await createStockEditLog({
        user: req.user._id,
        userName: req.user.name,
        item: item._id,
        itemCode: item.itemCode,
        itemName: item.name,
        operation: 'stock_update',
        currentStock: {
          oldValue: oldQuantity,
          newValue: newQuantity
        },
        purchaseQuantity: operation === 'add' ? quantity : 0,
        purchasePrice: {
          oldValue: item.purchasePrice || 0,
          newValue: item.purchasePrice || 0
        },
        retailPrice: {
          oldValue: item.sellingPrice || 0,
          newValue: item.sellingPrice || 0
        },
        discount: {
          oldValue: item.discount || 0,
          newValue: item.discount || 0
        },
        reason: `Manual stock ${operation}`,
        relatedTransaction: null
      });
    } catch (logError) {
      console.error('Error creating stock edit log:', logError);
    }

    // Create activity log
    try {
      await createActivityLog({
        user: req.user._id,
        userName: req.user.name,
        activity: 'Stock Updated',
        description: `Stock ${operation} for "${item.name}" (${item.itemCode}): ${oldQuantity} → ${newQuantity}`,
        relatedEntity: {
          entityType: 'item',
          entityId: item._id
        },
        metadata: {
          itemCode: item.itemCode,
          itemName: item.name,
          operation: operation,
          quantity: quantity,
          oldStock: oldQuantity,
          newStock: newQuantity
        }
      });
    } catch (logError) {
      console.error('Error creating activity log:', logError);
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
}; 