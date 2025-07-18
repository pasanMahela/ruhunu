const Cart = require('../models/Cart');
const Item = require('../models/Item');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.item',
        select: 'name itemCode retailPrice discount quantityInStock location'
      });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cart'
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { itemId, quantity, discount } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide item ID and quantity'
      });
    }

    // Check if item exists and has enough stock
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (quantity > item.quantityInStock) {
      return res.status(400).json({
        success: false,
        message: 'Quantity exceeds available stock'
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    // Use provided discount or default to item's discount
    const itemDiscount = discount !== undefined ? discount : item.discount;

    // Check total quantity of this item in cart to ensure we don't exceed stock
    const totalQuantityInCart = cart.items
      .filter(cartItem => cartItem.item.toString() === itemId)
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);

    if (totalQuantityInCart + quantity > item.quantityInStock) {
      return res.status(400).json({
        success: false,
        message: 'Total quantity exceeds available stock'
      });
    }

    // Always add new item to cart (don't update existing ones)
    cart.items.push({ item: itemId, quantity, discount: itemDiscount });

    await cart.save();
    await cart.populate({
      path: 'items.item',
      select: 'name itemCode retailPrice discount quantityInStock location'
    });

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding to cart'
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { quantity, discount } = req.body;
    const { itemId } = req.params;

    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide quantity'
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.item.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check stock
    const item = await Item.findById(itemId);
    if (quantity > item.quantityInStock) {
      return res.status(400).json({
        success: false,
        message: 'Quantity exceeds available stock'
      });
    }

    cart.items[itemIndex].quantity = quantity;
    
    // Update discount if provided
    if (discount !== undefined) {
      cart.items[itemIndex].discount = discount;
    }
    
    await cart.save();
    await cart.populate({
      path: 'items.item',
      select: 'name itemCode retailPrice discount quantityInStock location'
    });

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart item'
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(
      item => item.item.toString() !== itemId
    );

    await cart.save();
    await cart.populate({
      path: 'items.item',
      select: 'name itemCode retailPrice discount quantityInStock location'
    });

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from cart'
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
}; 