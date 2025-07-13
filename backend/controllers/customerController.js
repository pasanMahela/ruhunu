const Customer = require('../models/Customer');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build search query
  let query = {};
  
  // Search by name, NIC, email, or phone
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { name: searchRegex },
      { nic: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  // Filter by customer type
  if (req.query.customerType) {
    query.customerType = req.query.customerType;
  }

  // Filter by status
  if (req.query.status) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    switch (req.query.status) {
      case 'active':
        query.lastPurchaseDate = { $gte: thirtyDaysAgo };
        break;
      case 'inactive':
        query.lastPurchaseDate = { $gte: ninetyDaysAgo, $lt: thirtyDaysAgo };
        break;
      case 'dormant':
        query.lastPurchaseDate = { $lt: ninetyDaysAgo };
        break;
      case 'new':
        query.lastPurchaseDate = { $exists: false };
        break;
    }
  }

  // Filter by active status
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true';
  }

  // Sort options
  let sortBy = { createdAt: -1 };
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(':');
    sortBy = { [parts[0]]: parts[1] === 'desc' ? -1 : 1 };
  }

  const customers = await Customer.find(query)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort(sortBy)
    .skip(startIndex)
    .limit(limit);

  const total = await Customer.countDocuments(query);

  res.status(200).json({
    success: true,
    count: customers.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: customers
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!customer) {
    return next(new ErrorResponse(`Customer not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = asyncHandler(async (req, res, next) => {
  // Check if customer already exists with this NIC
  const existingCustomer = await Customer.findOne({ nic: req.body.nic });
  if (existingCustomer) {
    return next(new ErrorResponse(`Customer with NIC ${req.body.nic} already exists`, 400));
  }

  // Generate customer number
  const customerCount = await Customer.countDocuments();
  const customerNumber = `CUST${String(customerCount + 1).padStart(4, '0')}`;

  // Add created by user and customer number
  req.body.createdBy = req.user._id;
  req.body.customerNumber = customerNumber;

  const customer = await Customer.create(req.body);

  res.status(201).json({
    success: true,
    data: customer
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  let customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new ErrorResponse(`Customer not found with id ${req.params.id}`, 404));
  }

  // Check if NIC is being changed and if it already exists
  if (req.body.nic && req.body.nic !== customer.nic) {
    const existingCustomer = await Customer.findOne({ nic: req.body.nic });
    if (existingCustomer) {
      return next(new ErrorResponse(`Customer with NIC ${req.body.nic} already exists`, 400));
    }
  }

  // Add updated by user
  req.body.updatedBy = req.user._id;

  customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new ErrorResponse(`Customer not found with id ${req.params.id}`, 404));
  }

  // Soft delete - just mark as inactive
  customer.isActive = false;
  customer.updatedBy = req.user._id;
  await customer.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Search customers by NIC or name
// @route   GET /api/customers/search/:query
// @access  Private
exports.searchCustomers = asyncHandler(async (req, res, next) => {
  const customers = await Customer.findByNicOrName(req.params.query)
    .select('nic name email phone customerType totalSpent purchaseCount lastPurchaseDate status')
    .limit(10);

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers
  });
});

// @desc    Get customer by NIC
// @route   GET /api/customers/nic/:nic
// @access  Private
exports.getCustomerByNic = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ nic: req.params.nic.toUpperCase() });

  if (!customer) {
    return next(new ErrorResponse(`Customer not found with NIC ${req.params.nic}`, 404));
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Update customer purchase stats
// @route   PUT /api/customers/:id/purchase
// @access  Private
exports.updatePurchaseStats = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new ErrorResponse(`Customer not found with id ${req.params.id}`, 404));
  }

  const { saleAmount } = req.body;
  
  if (!saleAmount || saleAmount <= 0) {
    return next(new ErrorResponse('Valid sale amount is required', 400));
  }

  await customer.updatePurchaseStats(saleAmount);

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Get customer analytics
// @route   GET /api/customers/analytics/overview
// @access  Private
exports.getCustomerAnalytics = asyncHandler(async (req, res, next) => {
  const analytics = await Customer.getAnalytics();
  
  // Get customer distribution by type
  const customerTypeDistribution = await Customer.aggregate([
    { $group: { _id: '$customerType', count: { $sum: 1 } } }
  ]);

  // Get customer distribution by status
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const statusDistribution = await Customer.aggregate([
    {
      $project: {
        status: {
          $cond: [
            { $not: ['$lastPurchaseDate'] },
            'new',
            {
              $cond: [
                { $gte: ['$lastPurchaseDate', thirtyDaysAgo] },
                'active',
                {
                  $cond: [
                    { $gte: ['$lastPurchaseDate', ninetyDaysAgo] },
                    'inactive',
                    'dormant'
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Get top customers by spending
  const topCustomers = await Customer.find({ totalSpent: { $gt: 0 } })
    .select('nic name totalSpent purchaseCount lastPurchaseDate customerType')
    .sort({ totalSpent: -1 })
    .limit(10);

  // Get recent customers
  const recentCustomers = await Customer.find()
    .select('nic name totalSpent purchaseCount createdAt customerType')
    .sort({ createdAt: -1 })
    .limit(10);

  // Monthly customer growth
  const monthlyGrowth = await Customer.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: analytics[0] || {
        totalCustomers: 0,
        activeCustomers: 0,
        totalSpent: 0,
        averageSpentPerCustomer: 0,
        totalLoyaltyPoints: 0
      },
      customerTypeDistribution,
      statusDistribution,
      topCustomers,
      recentCustomers,
      monthlyGrowth
    }
  });
});

// @desc    Update customer status
// @route   PATCH /api/customers/:id/status
// @access  Private
exports.updateCustomerStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['active', 'inactive', 'banned', 'suspended'];
  if (!status || !validStatuses.includes(status)) {
    return next(new ErrorResponse(`Status must be one of: ${validStatuses.join(', ')}`, 400));
  }
  
  const customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    return next(new ErrorResponse(`Customer not found with id ${req.params.id}`, 404));
  }
  
  const oldStatus = customer.status;
  
  // Update status and updatedBy
  customer.status = status;
  customer.updatedBy = req.user._id;
  
  // If status is being set to inactive or banned, also set isActive to false
  if (status === 'inactive' || status === 'banned') {
    customer.isActive = false;
  } else {
    customer.isActive = true;
  }
  
  await customer.save();
  
  res.status(200).json({
    success: true,
    data: customer,
    message: `Customer status updated from ${oldStatus} to ${status}`
  });
});

// @desc    Test NIC validation
// @route   POST /api/customers/test-nic
// @access  Private
exports.testNicValidation = asyncHandler(async (req, res, next) => {
  const { nic } = req.body;
  
  console.log('Testing NIC validation for:', nic);
  
  const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
  const isValid = nicRegex.test(nic);
  
  console.log('NIC validation result:', { nic, isValid });
  
  res.status(200).json({
    success: true,
    data: {
      nic,
      isValid,
      length: nic ? nic.length : 0,
      pattern: nicRegex.toString()
    }
  });
});

// @desc    Create or find customer by NIC (for POS integration)
// @route   POST /api/customers/find-or-create
// @access  Private
exports.findOrCreateCustomer = asyncHandler(async (req, res, next) => {
  const { nic, name, phone } = req.body;

  console.log('findOrCreateCustomer called with:', { nic, name, phone });

  if (!nic || !name) {
    console.log('Missing required fields:', { nic, name });
    return next(new ErrorResponse('NIC and name are required', 400));
  }

  // Validate NIC format
  const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
  if (!nicRegex.test(nic)) {
    console.log('Invalid NIC format:', nic);
    return next(new ErrorResponse(`Invalid NIC format: ${nic}. Expected 9 digits + V/X or 12 digits.`, 400));
  }

  try {
    // Try to find existing customer
    let customer = await Customer.findOne({ nic: nic.toUpperCase() });
    console.log('Existing customer search result:', customer ? 'Found' : 'Not found');

    if (!customer) {
      // Create new customer with minimal data
      const customerData = {
        nic: nic.toUpperCase(),
        name: name.trim(),
        customerNumber: `CUST${String(await Customer.countDocuments() + 1).padStart(4, '0')}`,
        createdBy: req.user._id
      };
      
      // Add phone number if provided
      if (phone && phone.trim()) {
        customerData.phone = phone.trim();
      }
      
      console.log('Creating new customer with data:', customerData);
      
      customer = await Customer.create(customerData);
      
      console.log('New customer created successfully:', customer._id);
    } else {
      // Update customer information if different
      let hasChanges = false;
      
      if (customer.name !== name.trim()) {
        console.log('Updating customer name from:', customer.name, 'to:', name.trim());
        customer.name = name.trim();
        hasChanges = true;
      }
      
      // Update phone number if provided and different
      if (phone && phone.trim() && customer.phone !== phone.trim()) {
        console.log('Updating customer phone from:', customer.phone, 'to:', phone.trim());
        customer.phone = phone.trim();
        hasChanges = true;
      }
      
      if (hasChanges) {
        customer.updatedBy = req.user._id;
        await customer.save();
        console.log('Customer information updated successfully');
      } else {
        console.log('Customer information unchanged, no update needed');
      }
    }

    res.status(200).json({
      success: true,
      data: customer,
      isNew: !customer.lastPurchaseDate
    });
  } catch (error) {
    console.error('Error in findOrCreateCustomer:', error);
    
    // Check for specific MongoDB errors
    if (error.code === 11000) {
      return next(new ErrorResponse(`Customer with NIC ${nic} already exists`, 400));
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new ErrorResponse(`Validation error: ${messages.join(', ')}`, 400));
    }
    
    return next(new ErrorResponse(`Error creating/finding customer: ${error.message}`, 500));
  }
}); 
 
 
 
 