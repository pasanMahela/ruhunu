import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiFileText, 
  FiCalendar, 
  FiRefreshCw, 
  FiUser, 
  FiPackage, 
  FiActivity,
  FiTrendingUp,
  FiPieChart,
  FiFilter,
  FiDownload
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const LogsPage = () => {
  // State management
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: ''
  });
  
  // Data states
  const [activityLogs, setActivityLogs] = useState([]);
  const [stockEditLogs, setStockEditLogs] = useState([]);
  const [logsSummary, setLogsSummary] = useState(null);
  
  // Pagination states
  const [activityPagination, setActivityPagination] = useState({});
  const [stockEditPagination, setStockEditPagination] = useState({});

  // Initialize with current date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter({
      fromDate: today,
      toDate: today
    });
    loadLogsData(today, today);
  }, []);

  // Load all logs data
  const loadLogsData = async (fromDate = '', toDate = '') => {
    setLoading(true);
    try {
      await Promise.all([
        loadActivityLogs(fromDate, toDate),
        loadStockEditLogs(fromDate, toDate),
        loadLogsSummary(fromDate, toDate)
      ]);
    } catch (error) {
      console.error('Error loading logs data:', error);
      toast.error('Failed to load logs data');
    } finally {
      setLoading(false);
    }
  };

  // Load activity logs
  const loadActivityLogs = async (fromDate = '', toDate = '', page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await api.get(`/logs/activity?${params}`);
      if (response.data.success) {
        setActivityLogs(response.data.data);
        setActivityPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      toast.error('Failed to load activity logs');
    }
  };

  // Load stock edit logs
  const loadStockEditLogs = async (fromDate = '', toDate = '', page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await api.get(`/logs/stock-edits?${params}`);
      if (response.data.success) {
        setStockEditLogs(response.data.data);
        setStockEditPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading stock edit logs:', error);
      toast.error('Failed to load stock edit logs');
    }
  };

  // Load logs summary
  const loadLogsSummary = async (fromDate = '', toDate = '') => {
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await api.get(`/logs/summary?${params}`);
      if (response.data.success) {
        setLogsSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error loading logs summary:', error);
    }
  };

  // Handle filter application
  const handleApplyFilter = () => {
    if (dateFilter.fromDate && dateFilter.toDate && 
        new Date(dateFilter.fromDate) > new Date(dateFilter.toDate)) {
      toast.error('From date cannot be later than To date');
      return;
    }
    loadLogsData(dateFilter.fromDate, dateFilter.toDate);
  };

  // Handle clear filter
  const handleClearFilter = () => {
    setDateFilter({ fromDate: '', toDate: '' });
    loadLogsData();
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyFilter();
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Format date for display (date only)
  const formatDateOnly = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          <FiFileText className="inline mr-3" />
          Activity Logs
        </h1>
        <p className="text-gray-600">Monitor system activities and audit trails</p>
      </motion.div>

      {/* Summary Cards */}
      {logsSummary && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"
        >
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiActivity className="text-blue-600 text-2xl mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Total Logs</h3>
                <p className="text-3xl font-bold text-blue-600">{logsSummary.summary.totalLogs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiUser className="text-green-600 text-2xl mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Activity Logs</h3>
                <p className="text-3xl font-bold text-green-600">{logsSummary.summary.totalActivityLogs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiPackage className="text-orange-600 text-2xl mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Stock Edits</h3>
                <p className="text-3xl font-bold text-orange-600">{logsSummary.summary.totalStockEditLogs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiTrendingUp className="text-purple-600 text-2xl mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Active Users</h3>
                <p className="text-3xl font-bold text-purple-600">{logsSummary.activeUsers.length}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-md p-6 mb-6"
      >
        <div className="flex flex-wrap gap-4 items-end">
          {/* From Date */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiCalendar className="inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={dateFilter.fromDate}
              onChange={(e) => handleInputChange('fromDate', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiCalendar className="inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={dateFilter.toDate}
              onChange={(e) => handleInputChange('toDate', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <FiRefreshCw className="animate-spin" /> : <FiFilter />}
              View Report
            </button>
            
            <button
              onClick={handleClearFilter}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <FiRefreshCw />
              Clear
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiUser className="inline mr-2" />
              Activity Logs ({activityLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiPackage className="inline mr-2" />
              Stock Edit Logs ({stockEditLogs.length})
            </button>
          </nav>
        </div>
      </motion.div>

      {/* Logs Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-lg shadow-md"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Activity Logs
              </h2>
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <FiRefreshCw className="animate-spin text-2xl text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading...</span>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FiFileText className="text-gray-400 text-4xl mx-auto mb-4" />
                  <p className="text-gray-500">No activity logs found for the selected date range</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Log ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.map((log, index) => (
                      <motion.tr 
                        key={log._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.logId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateOnly(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.activity}
                          {log.description && (
                            <div className="text-xs text-gray-500 mt-1">{log.description}</div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'stock' && (
          <motion.div
            key="stock"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-lg shadow-md"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Stock Edit Logs
              </h2>
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <FiRefreshCw className="animate-spin text-2xl text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading...</span>
                </div>
              ) : stockEditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FiPackage className="text-gray-400 text-4xl mx-auto mb-4" />
                  <p className="text-gray-500">No stock edit logs found for the selected date range</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan="2">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan="2">
                        Date Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan="2">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan="2">
                        Product ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan="2">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                        Current Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan="2">
                        Purchase Qty
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                        Purchase Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                        Retail Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                        Discount
                      </th>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Old</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">New</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Old</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">New</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Old</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">New</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Old</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">New</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockEditLogs.map((log, index) => (
                      <motion.tr 
                        key={log._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.sequenceNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.itemCode}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {log.itemName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {log.currentStock.oldValue}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {log.currentStock.newValue}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {log.purchaseQuantity}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          Rs. {log.purchasePrice.oldValue.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          Rs. {log.purchasePrice.newValue.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          Rs. {log.retailPrice.oldValue.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          Rs. {log.retailPrice.newValue.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {log.discount.oldValue.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {log.discount.newValue.toFixed(1)}%
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogsPage; 