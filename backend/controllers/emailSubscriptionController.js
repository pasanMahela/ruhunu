const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const EmailSubscription = require('../models/EmailSubscription');
const Sale = require('../models/Sale');
const nodemailer = require('nodemailer');

// Create email transporter (configure with your email provider)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// @desc    Get all email subscriptions for sales reports
// @route   GET /api/email-subscriptions/sales-reports
// @access  Private
exports.getSalesReportSubscriptions = asyncHandler(async (req, res, next) => {
  const subscriptions = await EmailSubscription.find({
    reportType: 'sales-reports'
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subscriptions.length,
    data: subscriptions
  });
});

// @desc    Create email subscription for sales reports
// @route   POST /api/email-subscriptions/sales-reports
// @access  Private
exports.createSalesReportSubscription = asyncHandler(async (req, res, next) => {
  const { email, scheduleTime, isActive = true } = req.body;

  // Check if email already exists for this report type
  const existingSubscription = await EmailSubscription.findOne({
    email,
    reportType: 'sales-reports'
  });

  if (existingSubscription) {
    return next(new ErrorResponse('This email is already subscribed to sales reports', 400));
  }

  const subscription = await EmailSubscription.create({
    email,
    scheduleTime,
    isActive,
    reportType: 'sales-reports',
    createdBy: req.user.id
  });

  // Add to scheduler if active
  if (isActive) {
    const emailScheduler = require('../services/emailScheduler');
    await emailScheduler.addScheduledEmail(subscription);
  }

  res.status(201).json({
    success: true,
    data: subscription
  });
});

// @desc    Update email subscription
// @route   PUT /api/email-subscriptions/sales-reports/:id
// @access  Private
exports.updateSalesReportSubscription = asyncHandler(async (req, res, next) => {
  const { scheduleTime, isActive } = req.body;

  const subscription = await EmailSubscription.findById(req.params.id);

  if (!subscription) {
    return next(new ErrorResponse('Email subscription not found', 404));
  }

  if (scheduleTime !== undefined) subscription.scheduleTime = scheduleTime;
  if (isActive !== undefined) subscription.isActive = isActive;

  await subscription.save();

  // Update scheduler
  const emailScheduler = require('../services/emailScheduler');
  await emailScheduler.updateScheduledEmail(subscription);

  res.status(200).json({
    success: true,
    data: subscription
  });
});

// @desc    Delete email subscription
// @route   DELETE /api/email-subscriptions/sales-reports/:id
// @access  Private
exports.deleteSalesReportSubscription = asyncHandler(async (req, res, next) => {
  const subscription = await EmailSubscription.findById(req.params.id);

  if (!subscription) {
    return next(new ErrorResponse('Email subscription not found', 404));
  }

  // Remove from scheduler
  const emailScheduler = require('../services/emailScheduler');
  emailScheduler.removeScheduledEmail(subscription._id.toString());

  await subscription.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Send sales report now to all subscribed emails
// @route   POST /api/email-subscriptions/send-report-now
// @access  Private
exports.sendReportNow = asyncHandler(async (req, res, next) => {
  // Get all active subscriptions for sales reports
  const subscriptions = await EmailSubscription.find({
    reportType: 'sales-reports',
    isActive: true
  });

  if (subscriptions.length === 0) {
    return next(new ErrorResponse('No active email subscriptions found', 400));
  }

  // Get today's date for the report (using local timezone)
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  // Format today's date properly for display
  const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');

  console.log('Email report date range:', {
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    todayString: todayString,
    localDate: today.toLocaleDateString()
  });

  // Fetch today's sales data
  const todaysSales = await Sale.find({
    createdAt: {
      $gte: todayStart,
      $lte: todayEnd
    }
  })
  .populate('customer', 'name')
  .sort({ createdAt: -1 });

  console.log(`Found ${todaysSales.length} sales for today`);

  // Calculate today's metrics from the Sale model structure
  const todaysMetrics = {
    totalSales: todaysSales.reduce((sum, sale) => sum + sale.total, 0),
    totalProfit: 0, // Will calculate from items
    totalQuantity: 0, // Will calculate from items
    totalItems: 0 // Will calculate from items
  };

  // Generate today's detailed report from items array
  const todaysDetailed = [];
  const itemSummary = {};
  
  todaysSales.forEach(sale => {
    sale.items.forEach(item => {
      // Calculate profit (assuming cost price is available, otherwise set to 0)
      const profit = 0; // We don't have cost price in the current model
      
      todaysDetailed.push({
        saleDate: sale.createdAt,
        itemName: item.name,
        itemCode: item.itemCode,
        customerName: sale.customerName || 'Walk-in Customer',
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        total: item.total,
        profit: profit
      });
      
      // Update metrics
      todaysMetrics.totalQuantity += item.quantity;
      
      // Update item summary
      if (!itemSummary[item.itemCode]) {
        itemSummary[item.itemCode] = {
          itemName: item.name,
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0
        };
      }
      itemSummary[item.itemCode].totalQuantity += item.quantity;
      itemSummary[item.itemCode].totalRevenue += item.total;
      itemSummary[item.itemCode].totalProfit += profit;
    });
  });
  
  todaysMetrics.totalItems = Object.keys(itemSummary).length;

  const todaysSummary = Object.values(itemSummary)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Create today's report data
  const todaysReportData = {
    detailed: todaysDetailed,
    summary: todaysSummary,
    metrics: todaysMetrics,
    dateRange: {
      fromDate: todayString,
      toDate: todayString  // Same date for both from and to
    },
    customerSearch: null
  };

  const transporter = createTransporter();
  const emailPromises = [];

  // Generate HTML email content with today's data
  const htmlContent = generateReportEmailHTML(todaysReportData);

      for (const subscription of subscriptions) {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: subscription.email,
        subject: `Daily Sales Report - ${todayString}`,
        html: htmlContent
      };

    emailPromises.push(
      transporter.sendMail(mailOptions).catch(error => {
        console.error(`Failed to send email to ${subscription.email}:`, error);
        return { error: true, email: subscription.email };
      })
    );
  }

  const results = await Promise.all(emailPromises);
  const failedEmails = results.filter(result => result && result.error);

      res.status(200).json({
      success: true,
      message: `Daily report sent to ${subscriptions.length - failedEmails.length} out of ${subscriptions.length} emails`,
      data: {
        totalEmails: subscriptions.length,
        successfulEmails: subscriptions.length - failedEmails.length,
        failedEmails: failedEmails.map(f => f.email),
        reportDate: todayString,
        transactionsIncluded: todaysDetailed.length,
        totalSales: todaysMetrics.totalSales
      }
    });
});

// Helper function to generate HTML email content
const generateReportEmailHTML = (reportData) => {
  const { detailed, summary, metrics, dateRange, customerSearch } = reportData;
  const dateRangeText = dateRange.fromDate === dateRange.toDate ? dateRange.fromDate : `${dateRange.fromDate} to ${dateRange.toDate}`;

  // Calculate additional metrics
  const totalTransactions = detailed.length;
  const averageTransactionValue = totalTransactions > 0 ? (metrics.totalSales / totalTransactions) : 0;
  const totalDiscounts = detailed.reduce((sum, item) => sum + (item.discount || 0), 0);
  const profitMargin = metrics.totalSales > 0 ? ((metrics.totalProfit / metrics.totalSales) * 100) : 0;

  // Get unique customers
  const uniqueCustomers = [...new Set(detailed.map(item => item.customerName))];
  
  // Get top customers by sales
  const customerSales = {};
  detailed.forEach(item => {
    if (!customerSales[item.customerName]) {
      customerSales[item.customerName] = { total: 0, transactions: 0 };
    }
    customerSales[item.customerName].total += item.total;
    customerSales[item.customerName].transactions += 1;
  });
  
  const topCustomers = Object.entries(customerSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sales Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 1000px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
        .report-title { font-size: 20px; color: #666; margin-bottom: 10px; }
        .date-range { font-size: 16px; color: #888; }
        .metrics { margin: 30px 0; }
        .metrics-table { width: 100%; border-collapse: separate; border-spacing: 10px; margin: 15px 0; }
        .metrics-table td { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; width: 25%; vertical-align: top; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 8px; display: block; }
        .metric-label { font-size: 14px; opacity: 0.9; display: block; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .table th { background: #2563eb; color: white; padding: 12px 8px; text-align: left; font-weight: 600; font-size: 14px; }
        .table td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        .table tr:hover { background-color: #f8f9fa; }
        .amount { text-align: right; font-weight: 500; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        .no-data { text-align: center; color: #666; font-style: italic; padding: 20px; }
        .highlight { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        @media (max-width: 768px) { .two-column { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">🏢 Ruhunu Tyre House</div>
          <div class="report-title">Daily Sales Report</div>
          <div class="date-range">Date: ${dateRangeText}</div>
          ${customerSearch ? `<div class="date-range">Customer Filter: ${customerSearch}</div>` : ''}
          <div class="date-range" style="font-style: italic; color: #666; margin-top: 10px;">
            📅 This report contains sales data for today only
          </div>
        </div>
        
        <div class="metrics">
          <table class="metrics-table">
            <tr>
              <td>
                <span class="metric-value">Rs. ${metrics.totalSales.toFixed(2)}</span>
                <span class="metric-label">Total Sales</span>
              </td>
              <td>
                <span class="metric-value">Rs. ${metrics.totalProfit.toFixed(2)}</span>
                <span class="metric-label">Total Profit</span>
              </td>
              <td>
                <span class="metric-value">${metrics.totalQuantity}</span>
                <span class="metric-label">Items Sold</span>
              </td>
              <td>
                <span class="metric-value">${totalTransactions}</span>
                <span class="metric-label">Total Transactions</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="metric-value">${uniqueCustomers.length}</span>
                <span class="metric-label">Unique Customers</span>
              </td>
              <td>
                <span class="metric-value">Rs. ${averageTransactionValue.toFixed(2)}</span>
                <span class="metric-label">Avg Transaction</span>
              </td>
              <td>
                <span class="metric-value">${profitMargin.toFixed(1)}%</span>
                <span class="metric-label">Profit Margin</span>
              </td>
              <td>
                <span class="metric-value">Rs. ${totalDiscounts.toFixed(2)}</span>
                <span class="metric-label">Total Discounts</span>
              </td>
            </tr>
          </table>
        </div>

        <div class="highlight">
          <h3 style="margin-top: 0; color: #2563eb;">📈 Key Insights</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Best Performing Item:</strong> ${summary.length > 0 ? summary[0].itemName : 'N/A'} (Rs. ${summary.length > 0 ? summary[0].totalRevenue.toFixed(2) : '0.00'} revenue)</li>
            <li><strong>Most Profitable Item:</strong> ${summary.length > 0 ? summary.sort((a, b) => b.totalProfit - a.totalProfit)[0].itemName : 'N/A'} (Rs. ${summary.length > 0 ? summary.sort((a, b) => b.totalProfit - a.totalProfit)[0].totalProfit.toFixed(2) : '0.00'} profit)</li>
            <li><strong>Top Customer:</strong> ${topCustomers.length > 0 ? topCustomers[0].name : 'N/A'} (Rs. ${topCustomers.length > 0 ? topCustomers[0].total.toFixed(2) : '0.00'} total)</li>
            <li><strong>Average Items per Transaction:</strong> ${totalTransactions > 0 ? (metrics.totalQuantity / totalTransactions).toFixed(1) : '0'}</li>
          </ul>
        </div>

        <div class="two-column">
          <div class="section">
            <div class="section-title">🏆 Top 5 Customers</div>
            ${topCustomers.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Transactions</th>
                    <th>Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  ${topCustomers.map(customer => `
                    <tr>
                      <td>${customer.name}</td>
                      <td class="amount">${customer.transactions}</td>
                      <td class="amount">Rs. ${customer.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="no-data">No customer data available</div>'}
          </div>

          <div class="section">
            <div class="section-title">📊 Top 5 Items by Revenue</div>
            ${summary.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary.slice(0, 5).map(item => `
                    <tr>
                      <td>${item.itemName}</td>
                      <td class="amount">${item.totalQuantity}</td>
                      <td class="amount">Rs. ${item.totalRevenue.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="no-data">No item data available</div>'}
          </div>
        </div>

        <div class="section">
          <div class="section-title">📋 Complete Transaction Details</div>
          ${detailed.length > 0 ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Item Name</th>
                  <th>Item Code</th>
                  <th>Customer</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                ${detailed.map(item => `
                  <tr>
                    <td>${new Date(item.saleDate).toLocaleString()}</td>
                    <td>${item.itemName}</td>
                    <td>${item.itemCode || 'N/A'}</td>
                    <td>${item.customerName}</td>
                    <td class="amount">${item.quantity}</td>
                    <td class="amount">Rs. ${item.price.toFixed(2)}</td>
                    <td class="amount">Rs. ${(item.discount || 0).toFixed(2)}</td>
                    <td class="amount">Rs. ${item.total.toFixed(2)}</td>
                    <td class="amount">Rs. ${item.profit.toFixed(2)}</td>
                    <td class="amount">${item.total > 0 ? ((item.profit / item.total) * 100).toFixed(1) : 0}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">No transaction data available for this period</div>'}
        </div>

        <div class="section">
          <div class="section-title">📈 Complete Item Summary</div>
          ${summary.length > 0 ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Total Qty</th>
                  <th>Total Revenue</th>
                  <th>Total Profit</th>
                  <th>Profit Margin</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                ${summary.map(item => `
                  <tr>
                    <td>${item.itemName}</td>
                    <td class="amount">${item.totalQuantity}</td>
                    <td class="amount">Rs. ${item.totalRevenue.toFixed(2)}</td>
                    <td class="amount">Rs. ${item.totalProfit.toFixed(2)}</td>
                    <td class="amount">${item.totalRevenue > 0 ? ((item.totalProfit / item.totalRevenue) * 100).toFixed(1) : 0}%</td>
                    <td class="amount">Rs. ${item.totalQuantity > 0 ? (item.totalRevenue / item.totalQuantity).toFixed(2) : 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">No summary data available for this period</div>'}
        </div>
        
        <div class="footer">
          <p><strong>🏢 Ruhunu Tyre House</strong> - Comprehensive Sales Report</p>
          <p>📧 Generated and sent automatically on: ${new Date().toLocaleString()}</p>
          <p>📊 Total Records: ${detailed.length} transactions | ${summary.length} unique items | ${uniqueCustomers.length} customers</p>
          <p style="margin-top: 15px; font-style: italic;">This is an automated email containing complete sales data. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}; 

// Helper function to generate today's report data (for scheduler)
const generateTodaysReport = async () => {
  const Sale = require('../models/Sale');
  
  // Get today's date range in Sri Lanka timezone
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  // Format dates for local display
  const formatLocalDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const todayString = formatLocalDate(today);
  
  console.log('Email report date range:', {
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    todayString: todayString,
    localDate: formatLocalDate(today)
  });

  // Get today's sales
  const todaysSales = await Sale.find({
    createdAt: {
      $gte: todayStart,
      $lte: todayEnd
    }
  }).populate('customer');

  console.log(`Found ${todaysSales.length} sales for today`);

  // Process sales data
  const todaysDetailed = [];
  const itemSummary = {};
  let todaysMetrics = {
    totalSales: 0,
    totalProfit: 0,
    totalQuantity: 0
  };

  // Process each sale
  todaysSales.forEach(sale => {
    sale.items.forEach(item => {
      const itemTotal = item.quantity * item.price;
      const itemProfit = (item.price - (item.costPrice || 0)) * item.quantity;
      
      // Add to detailed report
      todaysDetailed.push({
        saleDate: sale.createdAt,
        itemName: item.itemName,
        itemCode: item.itemCode,
        customerName: sale.customer ? sale.customer.name : 'Walk-in Customer',
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        total: itemTotal,
        profit: itemProfit
      });
      
      // Update metrics
      todaysMetrics.totalSales += itemTotal;
      todaysMetrics.totalProfit += itemProfit;
      todaysMetrics.totalQuantity += item.quantity;
      
      // Update item summary
      if (!itemSummary[item.itemName]) {
        itemSummary[item.itemName] = {
          itemName: item.itemName,
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0
        };
      }
      
      itemSummary[item.itemName].totalQuantity += item.quantity;
      itemSummary[item.itemName].totalRevenue += itemTotal;
      itemSummary[item.itemName].totalProfit += itemProfit;
    });
  });

  // Convert item summary to array and sort by revenue
  const todaysSummary = Object.values(itemSummary).sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    detailed: todaysDetailed,
    summary: todaysSummary,
    metrics: todaysMetrics,
    dateRange: {
      fromDate: todayString,
      toDate: todayString
    },
    customerSearch: null
  };
};

// Export additional functions for use by scheduler
module.exports.generateTodaysReport = generateTodaysReport;
module.exports.createTransporter = createTransporter;
module.exports.generateReportEmailHTML = generateReportEmailHTML;