import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiDownload, FiFilter, FiX, FiTrendingUp, FiTrendingDown, FiPackage, FiShoppingCart, FiDollarSign } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Loading from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../services/api';

const ItemBalance = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    minBalance: '',
    maxBalance: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });

  const BACKEND_API_URL = API_URL;

  const fetchItemBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL + '/item-balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setItems(response.data.data);
      } else {
        setError('Invalid data format received from server');
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching item balance:', err);
      setError(err.response?.data?.message || 'Failed to fetch item balance');
      setItems([]);
      toast.error('Failed to fetch item balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemBalance();
  }, []);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL + '/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minBalance: '',
      maxBalance: ''
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedItems = items
    .filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesMinBalance = !filters.minBalance || item.remainingBalance >= Number(filters.minBalance);
      const matchesMaxBalance = !filters.maxBalance || item.remainingBalance <= Number(filters.maxBalance);

      return matchesSearch && matchesCategory && matchesMinBalance && matchesMaxBalance;
    })
    .sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle nested objects
      if (sortConfig.key === 'lastMonthPurchases') {
        aValue = a.lastMonthPurchases.quantity;
        bValue = b.lastMonthPurchases.quantity;
      } else if (sortConfig.key === 'lastMonthSales') {
        aValue = a.lastMonthSales.quantity;
        bValue = b.lastMonthSales.quantity;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const handleExportToExcel = () => {
    const exportData = filteredAndSortedItems.map(item => ({
      'Item Code': item.itemCode,
      'Item Name': item.name,
      'Category': item.category,
      'Current Stock': item.currentStock,
      'Last Month Purchases (Qty)': item.lastMonthPurchases.quantity,
      'Last Month Purchases (Value)': item.lastMonthPurchases.value.toFixed(2),
      'Last Month Sales (Qty)': item.lastMonthSales.quantity,
      'Last Month Sales (Value)': item.lastMonthSales.value.toFixed(2),
      'Remaining Balance': item.remainingBalance
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item Balance Report');

    // Add summary sheet
    const summaryData = [
      ['Item Balance Report Summary'],
      ['Generated on', new Date().toLocaleString()],
      ['Total Items', filteredAndSortedItems.length],
      ['Total Current Stock', filteredAndSortedItems.reduce((sum, item) => sum + item.currentStock, 0)],
      ['Total Last Month Purchases', filteredAndSortedItems.reduce((sum, item) => sum + item.lastMonthPurchases.quantity, 0)],
      ['Total Last Month Sales', filteredAndSortedItems.reduce((sum, item) => sum + item.lastMonthSales.quantity, 0)],
      ['Total Remaining Balance', filteredAndSortedItems.reduce((sum, item) => sum + item.remainingBalance, 0)]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    XLSX.writeFile(wb, `item_balance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Item balance report exported successfully');
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getBalanceColor = (balance) => {
    if (balance < 0) return 'text-red-600';
    if (balance === 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return <Loading message="Loading item balance data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center">
          <FiX className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Item Balance Report</h1>
          <p className="text-gray-600">Track your inventory with last month's purchases, sales, and remaining balance</p>
        </div>

        {/* Controls */}
        <div className="bg-white/90 rounded-lg p-6 mb-6 border-2 border-blue-200 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search by item code, name, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiFilter className="w-4 h-4" />
              Filters
            </motion.button>

            {/* Export */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Export Excel
            </motion.button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-blue-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={filters.category}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category._id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Balance</label>
                    <input
                      type="number"
                      name="minBalance"
                      value={filters.minBalance}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum balance"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Balance</label>
                    <input
                      type="number"
                      name="maxBalance"
                      value={filters.maxBalance}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Maximum balance"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 rounded-lg p-6 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Items</p>
                <p className="text-2xl font-bold text-gray-800">{filteredAndSortedItems.length}</p>
              </div>
              <FiPackage className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 rounded-lg p-6 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Current Stock</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredAndSortedItems.reduce((sum, item) => sum + item.currentStock, 0)}
                </p>
              </div>
              <FiTrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 rounded-lg p-6 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Last Month Purchases</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredAndSortedItems.reduce((sum, item) => sum + item.lastMonthPurchases.quantity, 0)}
                </p>
              </div>
              <FiShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/90 rounded-lg p-6 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Last Month Sales</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredAndSortedItems.reduce((sum, item) => sum + item.lastMonthSales.quantity, 0)}
                </p>
              </div>
              <FiDollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </motion.div>
        </div>

        {/* Table */}
        <div className="bg-white/90 rounded-lg overflow-hidden border-2 border-blue-200 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('itemCode')}
                  >
                    Item Code {getSortIcon('itemCode')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('name')}
                  >
                    Item Name {getSortIcon('name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('category')}
                  >
                    Category {getSortIcon('category')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('currentStock')}
                  >
                    Current Stock {getSortIcon('currentStock')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('lastMonthPurchases')}
                  >
                    Last Month Purchases {getSortIcon('lastMonthPurchases')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('lastMonthSales')}
                  >
                    Last Month Sales {getSortIcon('lastMonthSales')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('remainingBalance')}
                  >
                    Remaining Balance {getSortIcon('remainingBalance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {filteredAndSortedItems.map((item, index) => (
                  <motion.tr
                    key={item._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {item.itemCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div>
                        <div className="font-medium">{item.lastMonthPurchases.quantity}</div>
                        <div className="text-xs text-gray-600">Rs. {item.lastMonthPurchases.value.toFixed(2)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div>
                        <div className="font-medium">{item.lastMonthSales.quantity}</div>
                        <div className="text-xs text-gray-600">Rs. {item.lastMonthSales.value.toFixed(2)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getBalanceColor(item.remainingBalance)}`}>
                        {item.remainingBalance}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedItems.length === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No items found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemBalance; 