import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiSearch, FiDownload, FiPrinter, FiFilter, FiTrendingUp, FiBarChart2, FiDollarSign, FiList, FiPieChart, FiMail } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COMPANY, REPORTS } from '../constants/appConfig';
import PageHeader from '../components/PageHeader';
import EmailSubscriptionModal from '../components/EmailSubscriptionModal';

const SalesReports = () => {
  const { user } = useAuth();
  const BACKEND_API_URL = API_URL;

  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Report data states
  const [detailedReport, setDetailedReport] = useState([]);
  const [summaryReport, setSummaryReport] = useState([]);
  const [reportMetrics, setReportMetrics] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalItems: 0,
    totalQuantity: 0
  });

  // UI states
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState('detailed'); // 'detailed' or 'summary'

  // Email subscription states
  const [emailSubscriptions, setEmailSubscriptions] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Initialize dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Auto-load report when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      generateReport();
    }
  }, [fromDate, toDate]);

  // Load email subscriptions on component mount
  useEffect(() => {
    loadEmailSubscriptions();
  }, []);

  // Load email subscriptions
  const loadEmailSubscriptions = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/email-subscriptions/sales-reports`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (response.data.success) {
        setEmailSubscriptions(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading email subscriptions:', error);
    }
  };

  // Add email subscription
  const addEmailSubscription = async (email, scheduleTime) => {
    setLoadingEmails(true);
    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/email-subscriptions/sales-reports`,
        {
          email: email,
          scheduleTime: scheduleTime,
          isActive: true
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        toast.success('Email subscription added successfully');
        loadEmailSubscriptions();
      }
    } catch (error) {
      console.error('Error adding email subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to add email subscription');
    } finally {
      setLoadingEmails(false);
    }
  };

  // Remove email subscription
  const removeEmailSubscription = async (subscriptionId) => {
    setLoadingEmails(true);
    try {
      const response = await axios.delete(
        `${BACKEND_API_URL}/email-subscriptions/sales-reports/${subscriptionId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        toast.success('Email subscription removed successfully');
        loadEmailSubscriptions();
      }
    } catch (error) {
      console.error('Error removing email subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to remove email subscription');
    } finally {
      setLoadingEmails(false);
    }
  };

  // Update schedule time for subscription
  const updateScheduleTime = async (subscriptionId, newTime) => {
    try {
      const response = await axios.put(
        `${BACKEND_API_URL}/email-subscriptions/sales-reports/${subscriptionId}`,
        { scheduleTime: newTime },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        toast.success('Schedule time updated successfully');
        loadEmailSubscriptions();
      }
    } catch (error) {
      console.error('Error updating schedule time:', error);
      toast.error(error.response?.data?.message || 'Failed to update schedule time');
    }
  };

  // Send report now to all subscribed emails
  const sendReportNow = async () => {
    if (emailSubscriptions.length === 0) {
      toast.error('No email subscriptions found');
      return;
    }

    if (detailedReport.length === 0) {
      toast.error('No report data to send. Please generate a report first.');
      return;
    }

    setSendingNow(true);
    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/email-subscriptions/send-report-now`,
        {
          reportData: {
            detailed: detailedReport,
            summary: summaryReport,
            metrics: reportMetrics,
            dateRange: { fromDate, toDate },
            customerSearch
          }
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        toast.success(`Report sent to ${emailSubscriptions.length} email(s) successfully`);
      }
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(error.response?.data?.message || 'Failed to send report');
    } finally {
      setSendingNow(false);
    }
  };

  // Generate sales report
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
        ...(customerSearch && { customerSearch })
      });

      const response = await axios.get(
        `${BACKEND_API_URL}/sales/reports?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        const { detailed, summary, metrics } = response.data.data;
        setDetailedReport(detailed || []);
        setSummaryReport(summary || []);
        setReportMetrics(metrics || {
          totalSales: 0,
          totalProfit: 0,
          totalItems: 0,
          totalQuantity: 0
        });
        toast.success(`Report generated for ${detailed?.length || 0} transactions`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
      setDetailedReport([]);
      setSummaryReport([]);
      setReportMetrics({
        totalSales: 0,
        totalProfit: 0,
        totalItems: 0,
        totalQuantity: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const dateRange = `${fromDate} to ${toDate}`;
    const reportTitle = activeTab === 'detailed' ? 'Detailed Sales Report' : 'Summary Sales Report';
    
    let tableContent = '';
    
    if (activeTab === 'detailed') {
      tableContent = `
        <div class="section-title">Detailed Sales Report</div>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item Name</th>
              <th>Code</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            ${detailedReport.map(item => `
              <tr>
                <td>${new Date(item.saleDate).toLocaleDateString()}</td>
                <td>${item.itemName}</td>
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
      `;
    } else {
      tableContent = `
        <div class="section-title">Summary by Item</div>
        <table class="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Total Qty</th>
              <th>Total Revenue</th>
              <th>Total Profit</th>
              <th>Profit Margin</th>
            </tr>
          </thead>
          <tbody>
            ${summaryReport.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td class="amount">${item.totalQuantity}</td>
                <td class="amount">Rs. ${item.totalRevenue.toFixed(2)}</td>
                <td class="amount">Rs. ${item.totalProfit.toFixed(2)}</td>
                <td class="amount">${item.totalRevenue > 0 ? ((item.totalProfit / item.totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle} - ${dateRange}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .report-title { font-size: 18px; color: #666; }
            .date-range { font-size: 14px; margin: 10px 0; }
            .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
            .metric { text-align: center; padding: 10px; border: 1px solid #ddd; }
            .metric-value { font-size: 20px; font-weight: bold; color: #2563eb; }
            .metric-label { font-size: 12px; color: #666; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .section-title { font-size: 16px; font-weight: bold; margin: 30px 0 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${COMPANY.ICON} ${COMPANY.NAME}</div>
            <div class="report-title">${reportTitle}</div>
            <div class="date-range">Period: ${dateRange}</div>
            ${customerSearch ? `<div class="date-range">Customer Filter: ${customerSearch}</div>` : ''}
          </div>
          
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">Rs. ${reportMetrics.totalSales.toFixed(2)}</div>
              <div class="metric-label">Total Sales</div>
            </div>
            <div class="metric">
              <div class="metric-value">Rs. ${reportMetrics.totalProfit.toFixed(2)}</div>
              <div class="metric-label">Total Profit</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reportMetrics.totalQuantity}</div>
              <div class="metric-label">Items Sold</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reportMetrics.totalItems}</div>
              <div class="metric-label">Unique Items</div>
            </div>
          </div>

          ${tableContent}
          
          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
            ${REPORTS.GENERATED_BY_TEXT}: ${user?.name || 'System'} | Generated on: ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  // Export to XLSX
  const exportToXLSX = () => {
    let worksheetData = [];
    let filename = '';
    
    if (activeTab === 'detailed') {
      // Create worksheet data for detailed report
      worksheetData = [
        // Header
        ['Date', 'Item Name', 'Code', 'Customer', 'Qty', 'Price', 'Discount', 'Total', 'Profit'],
        // Data
        ...detailedReport.map(item => [
          new Date(item.saleDate).toLocaleDateString(),
          item.itemName,
          item.itemCode,
          item.customerName,
          item.quantity,
          parseFloat(item.price.toFixed(2)),
          parseFloat(item.discount.toFixed(2)),
          parseFloat(item.total.toFixed(2)),
          parseFloat(item.profit.toFixed(2))
        ])
      ];
      
      filename = `detailed-sales-report-${fromDate}-to-${toDate}.xlsx`;
    } else {
      // Create worksheet data for summary report
      worksheetData = [
        // Header
        ['Item Name', 'Total Qty', 'Total Revenue', 'Total Profit', 'Profit Margin (%)'],
        // Data
        ...summaryReport.map(item => [
          item.itemName,
          item.totalQuantity,
          parseFloat(item.totalRevenue.toFixed(2)),
          parseFloat(item.totalProfit.toFixed(2)),
          item.totalRevenue > 0 ? parseFloat(((item.totalProfit / item.totalRevenue) * 100).toFixed(1)) : 0
        ])
      ];
      
      filename = `summary-sales-report-${fromDate}-to-${toDate}.xlsx`;
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add some styling to the header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E3F2FD' } }
      };
    }
    
    // Auto-size columns
    const colWidths = [];
    for (let col = 0; col < worksheetData[0].length; col++) {
      let maxWidth = 0;
      for (let row = 0; row < worksheetData.length; row++) {
        const cellValue = worksheetData[row][col]?.toString() || '';
        maxWidth = Math.max(maxWidth, cellValue.length);
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 30) });
    }
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    const sheetName = activeTab === 'detailed' ? 'Detailed Sales Report' : 'Summary Report';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Save the file
    XLSX.writeFile(workbook, filename);
  };

  const TabButton = ({ id, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-all duration-200
        ${activeTab === id
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
        }
      `}
    >
      <Icon size={18} />
      <span>{label}</span>
      {count > 0 && (
        <span className={`
          text-xs px-2 py-1 rounded-full font-semibold
          ${activeTab === id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
        `}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PageHeader 
        title="Sales Reports" 
        subtitle="Comprehensive sales analytics and business intelligence"
        icon={FiBarChart2}
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-4 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <FiFilter size={16} />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <FiMail size={16} />
            Email Reports ({emailSubscriptions.length})
          </button>
          <button
            onClick={exportToXLSX}
            disabled={activeTab === 'detailed' ? detailedReport.length === 0 : summaryReport.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FiDownload size={16} />
            Export XLSX ({activeTab === 'detailed' ? 'Detailed' : 'Summary'})
          </button>
          <button
            onClick={printReport}
            disabled={activeTab === 'detailed' ? detailedReport.length === 0 : summaryReport.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FiPrinter size={16} />
            Print Report ({activeTab === 'detailed' ? 'Detailed' : 'Summary'})
          </button>
        </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Search</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by customer name..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-blue-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-blue-800">Rs. {reportMetrics.totalSales.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FiDollarSign className="text-blue-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-green-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-green-800">Rs. {reportMetrics.totalProfit.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FiTrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-purple-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items Sold</p>
                <p className="text-2xl font-bold text-purple-800">{reportMetrics.totalQuantity}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FiBarChart2 className="text-purple-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-orange-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Items</p>
                <p className="text-2xl font-bold text-orange-800">{reportMetrics.totalItems}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <FiBarChart2 className="text-orange-600" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <TabButton
            id="detailed"
            label="Detailed Sales Report"
            icon={FiList}
            count={detailedReport.length}
          />
          <TabButton
            id="summary"
            label="Summary by Item"
            icon={FiPieChart}
            count={summaryReport.length}
          />
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg border border-blue-200 shadow-sm"
        >
          {activeTab === 'detailed' ? (
            <>
              <div className="px-6 py-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiList className="mr-2" />
                  Detailed Sales Report
                </h3>
                <p className="text-sm text-gray-600">{detailedReport.length} transactions found</p>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailedReport.map((item, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(item.saleDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.itemCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.customerName}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">Rs. {item.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-orange-600">Rs. {item.discount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-blue-800">Rs. {item.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">Rs. {item.profit.toFixed(2)}</td>
                      </motion.tr>
                    ))}
                    {detailedReport.length === 0 && !loading && (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                          No sales data found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-green-100">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiPieChart className="mr-2" />
                  Summary by Item
                </h3>
                <p className="text-sm text-gray-600">{summaryReport.length} unique items</p>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
                <table className="w-full">
                  <thead className="bg-green-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Profit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryReport.map((item, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-green-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{item.totalQuantity}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">Rs. {item.totalRevenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">Rs. {item.totalProfit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-purple-600">
                          {item.totalRevenue > 0 ? ((item.totalProfit / item.totalRevenue) * 100).toFixed(1) : 0}%
                        </td>
                      </motion.tr>
                    ))}
                    {summaryReport.length === 0 && !loading && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          No summary data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Email Subscription Modal */}
      <EmailSubscriptionModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        emailSubscriptions={emailSubscriptions}
        onAddEmail={addEmailSubscription}
        onRemoveEmail={removeEmailSubscription}
        onUpdateSchedule={updateScheduleTime}
        onSendNow={sendReportNow}
        loading={loadingEmails}
        sendingNow={sendingNow}
      />
    </div>
  );
};

export default SalesReports; 
 
 
 