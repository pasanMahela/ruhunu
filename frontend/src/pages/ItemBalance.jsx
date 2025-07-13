import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiDownload, FiPrinter, FiEye, FiCalendar, FiUser, FiPackage, FiTrendingUp, FiDollarSign, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Loading from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../services/api';
import { COMPANY, CURRENCY } from '../constants/appConfig';
import PageHeader from '../components/PageHeader';

// Memoized table row component
const ItemRow = memo(({ item, index, getBalanceColor }) => (
  <motion.tr
    key={item._id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.02, 0.3) }} // Limit animation delay
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
        <div className="text-xs text-gray-600">{CURRENCY.SYMBOL} {item.lastMonthPurchases.value.toFixed(2)}</div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
      <div>
        <div className="font-medium">{item.lastMonthSales.quantity}</div>
        <div className="text-xs text-gray-600">{CURRENCY.SYMBOL} {item.lastMonthSales.value.toFixed(2)}</div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">
      <span className={`font-medium ${getBalanceColor(item.remainingBalance)}`}>
        {item.remainingBalance}
      </span>
    </td>
  </motion.tr>
));

// Memoized summary card component
const SummaryCard = memo(({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white/90 rounded-lg p-6 border-2 border-blue-200 shadow-lg"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
  </motion.div>
));

// Memoized pagination component
const Pagination = memo(({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      const end = Math.min(totalPages, start + maxVisible - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-blue-200">
      <div className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
        
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              page === currentPage
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Configurable items per page
  const [isExporting, setIsExporting] = useState(false);

  const BACKEND_API_URL = API_URL;

  // Memoized fetch function
  const fetchItemBalance = useCallback(async () => {
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
  }, [BACKEND_API_URL]);

  useEffect(() => {
    fetchItemBalance();
  }, [fetchItemBalance]);

  // Memoized fetch categories function
  const fetchCategories = useCallback(async () => {
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
  }, [BACKEND_API_URL]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Memoized filter change handler
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // Memoized clear filters function
  const clearFilters = useCallback(() => {
    setFilters({
      category: '',
      minBalance: '',
      maxBalance: ''
    });
    setCurrentPage(1);
  }, []);

  // Memoized sort handler
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  }, []);

  // Memoized search handler
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  // Memoized filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    return items
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
  }, [items, searchTerm, filters, sortConfig]);

  // Memoized pagination calculations
  const paginationData = useMemo(() => {
    const totalItems = filteredAndSortedItems.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredAndSortedItems.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      currentItems,
      startIndex,
      endIndex: Math.min(endIndex, totalItems)
    };
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  // Memoized summary calculations
  const summaryData = useMemo(() => {
    return {
      totalItems: filteredAndSortedItems.length,
      totalCurrentStock: filteredAndSortedItems.reduce((sum, item) => sum + item.currentStock, 0),
      totalLastMonthPurchases: filteredAndSortedItems.reduce((sum, item) => sum + item.lastMonthPurchases.quantity, 0),
      totalLastMonthSales: filteredAndSortedItems.reduce((sum, item) => sum + item.lastMonthSales.quantity, 0),
      totalRemainingBalance: filteredAndSortedItems.reduce((sum, item) => sum + item.remainingBalance, 0)
    };
  }, [filteredAndSortedItems]);

  // Memoized export function
  const handleExportToExcel = useCallback(async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      const exportData = filteredAndSortedItems.map(item => ({
        'Item Code': item.itemCode,
        'Item Name': item.name,
        'Category': item.category,
        'Current Stock': item.currentStock,
        'Last 30 Days Purchases (Qty)': item.lastMonthPurchases.quantity,
        'Last 30 Days Purchases (Value)': item.lastMonthPurchases.value.toFixed(2),
        'Last 30 Days Sales (Qty)': item.lastMonthSales.quantity,
        'Last 30 Days Sales (Value)': item.lastMonthSales.value.toFixed(2),
        'Remaining Balance': item.remainingBalance
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Item Balance Report');

      // Add summary sheet
      const summaryDataForExport = [
        ['Item Balance Report Summary'],
        ['Company', COMPANY.NAME],
        ['Generated on', new Date().toLocaleString()],
        ['Total Items', summaryData.totalItems],
        ['Total Current Stock', summaryData.totalCurrentStock],
        ['Total Last 30 Days Purchases', summaryData.totalLastMonthPurchases],
        ['Total Last 30 Days Sales', summaryData.totalLastMonthSales],
        ['Total Remaining Balance', summaryData.totalRemainingBalance]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryDataForExport);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      XLSX.writeFile(wb, `item_balance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Item balance report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  }, [filteredAndSortedItems, summaryData, isExporting]);

  // Memoized helper functions
  const getSortIcon = useCallback((key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  }, [sortConfig]);

  const getBalanceColor = useCallback((balance) => {
    if (balance < 0) return 'text-red-600';
    if (balance === 0) return 'text-yellow-600';
    return 'text-green-600';
  }, []);

  // Memoized page change handler
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Scroll to top of table when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) {
    return <Loading message="Loading item balance data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center">
          <FiEye className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={fetchItemBalance}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PageHeader 
        title="Item Balance Report" 
        subtitle="Track your inventory with last 30 days purchases, sales, and remaining balance"
        icon={FiPackage}
      />

      <div className="max-w-7xl mx-auto p-6">
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
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Results info */}
            <div className="text-sm text-gray-600">
              Showing {paginationData.startIndex + 1}-{paginationData.endIndex} of {paginationData.totalItems} items
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
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export XLSX'}
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
          <SummaryCard
            title="Total Items"
            value={summaryData.totalItems}
            icon={FiPackage}
            color="text-blue-600"
            delay={0}
          />
          <SummaryCard
            title="Total Current Stock"
            value={summaryData.totalCurrentStock}
            icon={FiTrendingUp}
            color="text-green-600"
            delay={0.1}
          />
          <SummaryCard
            title="Last 30 Days Purchases"
            value={summaryData.totalLastMonthPurchases}
            icon={FiDollarSign}
            color="text-blue-600"
            delay={0.2}
          />
          <SummaryCard
            title="Last 30 Days Sales"
            value={summaryData.totalLastMonthSales}
            icon={FiDollarSign}
            color="text-yellow-600"
            delay={0.3}
          />
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
                    Last 30 Days Purchases {getSortIcon('lastMonthPurchases')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSort('lastMonthSales')}
                  >
                    Last 30 Days Sales {getSortIcon('lastMonthSales')}
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
                {paginationData.currentItems.map((item, index) => (
                  <ItemRow
                    key={item._id}
                    item={item}
                    index={index}
                    getBalanceColor={getBalanceColor}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {paginationData.totalItems === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No items found matching your criteria</p>
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={paginationData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ItemBalance; 