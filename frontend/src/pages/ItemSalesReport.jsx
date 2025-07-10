import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiSearch, FiDownload, FiPrinter, FiFilter, FiTrendingUp, FiPackage, FiDollarSign, FiBarChart, FiTag } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ItemSalesReport = () => {
  const { user } = useAuth();
  const BACKEND_API_URL = API_URL;

  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Report data states
  const [salesData, setSalesData] = useState([]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reportMetrics, setReportMetrics] = useState({
    totalQuantity: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    averagePrice: 0,
    totalDiscount: 0
  });

  // UI states
  const [showFilters, setShowFilters] = useState(true);

  // Initialize dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Auto-load report when dates change (only if item code is provided)
  useEffect(() => {
    if (fromDate && toDate && itemCode.trim()) {
      generateReport();
    }
  }, [fromDate, toDate]);

  // Search items by code/name for suggestions
  const handleItemCodeChange = async (value) => {
    setItemCode(value);
    
    if (value.length >= 2) {
      try {
        const response = await axios.get(
          `${BACKEND_API_URL}/items/search?q=${encodeURIComponent(value)}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );

        if (response.data.success) {
          setItemSuggestions(response.data.data.slice(0, 8));
          setShowSuggestions(true);
        }
      } catch (error) {
        setItemSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setItemSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select item from suggestions
  const handleItemSelect = (item) => {
    setItemCode(item.itemCode);
    setShowSuggestions(false);
    // Auto-generate report when item is selected
    if (fromDate && toDate) {
      setTimeout(() => generateReport(), 100);
    }
  };

  // Generate item sales report
  const generateReport = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both from and to dates');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('From date cannot be later than to date');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        ...(itemCode.trim() && { itemCode: itemCode.trim() })
      });

      const response = await axios.get(
        `${BACKEND_API_URL}/sales/item-reports?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        const { salesData, metrics } = response.data.data;
        setSalesData(salesData || []);
        setReportMetrics(metrics || {
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalTransactions: 0,
          averagePrice: 0,
          totalDiscount: 0
        });
        
        if (itemCode.trim()) {
          toast.success(`Found ${salesData?.length || 0} transactions for ${itemCode}`);
        } else {
          toast.success(`Generated report for ${salesData?.length || 0} transactions`);
        }
      }
    } catch (error) {
      console.error('Error generating item sales report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
      setSalesData([]);
      setReportMetrics({
        totalQuantity: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averagePrice: 0,
        totalDiscount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const dateRange = `${fromDate} to ${toDate}`;
    const itemFilter = itemCode.trim() ? ` for Item: ${itemCode}` : '';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Item Sales Report - ${dateRange}${itemFilter}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .report-title { font-size: 18px; color: #666; }
            .date-range { font-size: 14px; margin: 10px 0; }
            .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
            .metric { text-align: center; padding: 10px; border: 1px solid #ddd; }
            .metric-value { font-size: 16px; font-weight: bold; color: #2563eb; }
            .metric-label { font-size: 11px; color: #666; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 12px; }
            .table th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .item-name { font-weight: bold; color: #333; }
            .date-col { color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">🏢 Ruhunu Tyre House</div>
            <div class="report-title">Item Sales Report</div>
            <div class="date-range">Period: ${dateRange}${itemFilter}</div>
          </div>
          
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${reportMetrics.totalTransactions}</div>
              <div class="metric-label">Transactions</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reportMetrics.totalQuantity}</div>
              <div class="metric-label">Total Qty</div>
            </div>
            <div class="metric">
              <div class="metric-value">Rs. ${reportMetrics.totalRevenue.toFixed(2)}</div>
              <div class="metric-label">Revenue</div>
            </div>
            <div class="metric">
              <div class="metric-value">Rs. ${reportMetrics.totalProfit.toFixed(2)}</div>
              <div class="metric-label">Profit</div>
            </div>
            <div class="metric">
              <div class="metric-value">Rs. ${reportMetrics.averagePrice.toFixed(2)}</div>
              <div class="metric-label">Avg. Price</div>
            </div>
            <div class="metric">
              <div class="metric-value">Rs. ${reportMetrics.totalDiscount.toFixed(2)}</div>
              <div class="metric-label">Discounts</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Date - Item Name</th>
                <th>Item Code</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Total</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${salesData.map(item => `
                <tr>
                  <td>
                    <div class="date-col">${new Date(item.saleDate).toLocaleDateString()}</div>
                    <div class="item-name">${item.itemName}</div>
                  </td>
                  <td>${item.itemCode}</td>
                  <td>${item.customerName}</td>
                  <td class="amount">${item.quantity}</td>
                  <td class="amount">Rs. ${item.price.toFixed(2)}</td>
                  <td class="amount">Rs. ${item.discount.toFixed(2)}</td>
                  <td class="amount">Rs. ${item.total.toFixed(2)}</td>
                  <td class="amount">Rs. ${item.profit.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
            Generated by: ${user?.name || 'System'} | Generated on: ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      // Header
      ['Date', 'Item Name', 'Item Code', 'Customer', 'Qty', 'Price', 'Discount', 'Total', 'Profit'],
      // Data
      ...salesData.map(item => [
        new Date(item.saleDate).toLocaleDateString(),
        item.itemName,
        item.itemCode,
        item.customerName,
        item.quantity,
        item.price.toFixed(2),
        item.discount.toFixed(2),
        item.total.toFixed(2),
        item.profit.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = itemCode.trim() 
      ? `item-sales-${itemCode}-${fromDate}-to-${toDate}.csv`
      : `item-sales-${fromDate}-to-${toDate}.csv`;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-blue-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-800 flex items-center">
                <FiPackage className="mr-3" />
                Item Sales Report
              </h1>
              <p className="text-gray-600 mt-1">Individual product performance and transaction history</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <FiFilter size={16} />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={exportToCSV}
                disabled={salesData.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FiDownload size={16} />
                Export CSV
              </button>
              <button
                onClick={printReport}
                disabled={salesData.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FiPrinter size={16} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters Section */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-blue-200 shadow-sm mb-6"
          >
            <div className="px-6 py-4 border-b border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FiFilter className="mr-2" />
                Report Filters
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Code / Name</label>
                  <div className="relative">
                    <FiTag className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={itemCode}
                      onChange={(e) => handleItemCodeChange(e.target.value)}
                      placeholder="Enter item code or name..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    {/* Item Suggestions Dropdown */}
                    {showSuggestions && itemSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {itemSuggestions.map((item) => (
                          <button
                            key={item._id}
                            onClick={() => handleItemSelect(item)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              Code: {item.itemCode} • Rs. {item.retailPrice} • Stock: {item.quantityInStock}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={generateReport}
                    disabled={loading || !fromDate || !toDate}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <FiTrendingUp size={16} />
                    )}
                    {loading ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-blue-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Transactions</p>
                <p className="text-xl font-bold text-blue-800">{reportMetrics.totalTransactions}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <FiBarChart className="text-blue-600" size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-purple-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Qty</p>
                <p className="text-xl font-bold text-purple-800">{reportMetrics.totalQuantity}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <FiPackage className="text-purple-600" size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-blue-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Revenue</p>
                <p className="text-xl font-bold text-blue-800">Rs. {reportMetrics.totalRevenue.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <FiDollarSign className="text-blue-600" size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-green-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Profit</p>
                <p className="text-xl font-bold text-green-800">Rs. {reportMetrics.totalProfit.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <FiTrendingUp className="text-green-600" size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-orange-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Avg. Price</p>
                <p className="text-xl font-bold text-orange-800">Rs. {reportMetrics.averagePrice.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <FiTag className="text-orange-600" size={16} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg border border-red-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Discounts</p>
                <p className="text-xl font-bold text-red-800">Rs. {reportMetrics.totalDiscount.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <FiTag className="text-red-600" size={16} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Report Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-blue-200 shadow-sm"
        >
          <div className="px-6 py-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FiPackage className="mr-2" />
              Item Sales Transaction History
            </h3>
            <p className="text-sm text-gray-600">
              {salesData.length} transactions found
              {itemCode.trim() && ` for item: ${itemCode}`}
            </p>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date - Item Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesData.map((item, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-500 text-xs">
                        {new Date(item.saleDate).toLocaleDateString()}
                      </div>
                      <div className="font-medium text-gray-900">{item.itemName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{item.itemCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.customerName}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">Rs. {item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right text-orange-600">Rs. {item.discount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-800">Rs. {item.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">Rs. {item.profit.toFixed(2)}</td>
                  </motion.tr>
                ))}
                {salesData.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      {itemCode.trim() 
                        ? `No sales data found for item "${itemCode}" in the selected date range`
                        : 'No sales data found for the selected criteria. Try specifying an item code for better results.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ItemSalesReport; 
 
 
 