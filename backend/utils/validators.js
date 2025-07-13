const { body } = require('express-validator');

// Item validation schema
exports.validateItem = [
  body('itemCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Item code must be between 1 and 10 characters')
    .matches(/^\d+$/)
    .withMessage('Item code must be numeric'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),

  body('lowerLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Lower limit must be a non-negative integer'),

  body('purchasePrice')
    .notEmpty()
    .withMessage('Purchase price is required')
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a non-negative number'),

  body('retailPrice')
    .notEmpty()
    .withMessage('Retail price is required')
    .isFloat({ min: 0 })
    .withMessage('Retail price must be a non-negative number'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),

  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Barcode cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9]*$/)
    .withMessage('Barcode must contain only letters and numbers')
];

// Stock update validation schema
exports.validateStockUpdate = [
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),

  body('lowerLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Lower limit must be a non-negative integer'),

  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a non-negative number'),

  body('retailPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Retail price must be a non-negative number'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100')
]; 