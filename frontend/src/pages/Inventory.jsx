import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiArrowUp, FiArrowDown, FiPrinter, FiDownload, FiFilter, FiX, FiPackage, FiEye, FiGrid, FiList, FiAlertTriangle, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ItemModal from '../components/ItemModal';
import StockModal from '../components/StockModal';
import ConfirmModal from '../components/ConfirmModal';
import Loading from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import { API_URL } from '../services/api';
import PageHeader from '../components/PageHeader';

// Category color mapping
const categoryColors = {
  'Electronics': 'bg-blue-100 text-blue-800 border-blue-200',
  'Clothing': 'bg-purple-100 text-purple-800 border-purple-200',
  'Food': 'bg-green-100 text-green-800 border-green-200',
  'Books': 'bg-orange-100 text-orange-800 border-orange-200',
  'Other': 'bg-gray-100 text-gray-800 border-gray-200'
};

// Stock status colors
const getStockStatus = (stock, lowerLimit = 10) => {
  if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Out of Stock', icon: FiAlertTriangle };
  if (stock <= lowerLimit) return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Low Stock', icon: FiAlertTriangle };
  return { color: 'text-green-600', bg: 'bg-green-50', label: 'In Stock', icon: FiCheckCircle };
};

const Inventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    stockStatus: '', // 'low', 'out', 'in'
    minPrice: '',
    maxPrice: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockModal, setStockModal] = useState({ isOpen: false, item: null, action: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Limit items per page for performance

  const BACKEND_API_URL = API_URL;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL+'/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setItems(response.data.data);
      } else {
        console.error('Invalid response format:', response.data);
        setError('Invalid data format received from server');
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err.response?.data?.message || 'Failed to fetch items');
      setItems([]);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [BACKEND_API_URL]);

  useEffect(() => {
    fetchItems();
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL+'/categories', {
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
  }, []);

  // Extract unique locations from items - memoized
  const uniqueLocations = useMemo(() => {
    if (items.length > 0) {
      return [...new Set(items.map(item => item.location).filter(Boolean))];
    }
    return [];
  }, [items]);

  useEffect(() => {
    setLocations(uniqueLocations);
  }, [uniqueLocations]);

  // Debounce search term for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      category: '',
      location: '',
      stockStatus: '',
      minPrice: '',
      maxPrice: ''
    });
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const getSortIcon = useCallback((field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />;
  }, [sortField, sortDirection]);

  // Memoized filtering and sorting for performance
  const filteredAndSortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    const minPriceNum = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPriceNum = filters.maxPrice ? Number(filters.maxPrice) : null;
    
    return items
      .filter(item => {
        // Search filter
        if (debouncedSearchTerm && !(
          item.name?.toLowerCase().includes(searchLower) ||
          item.itemCode?.toLowerCase().includes(searchLower) ||
          item.barcode?.toLowerCase().includes(searchLower) ||
          item.category?.name?.toLowerCase().includes(searchLower)
        )) {
          return false;
        }
        
        // Category filter
        if (filters.category && item.category?.name !== filters.category) {
          return false;
        }
        
        // Location filter
        if (filters.location && item.location !== filters.location) {
          return false;
        }
        
        // Stock status filter
        if (filters.stockStatus) {
          const stock = item.quantityInStock;
          const limit = item.lowerLimit || 10;
          
          if (filters.stockStatus === 'out' && stock !== 0) return false;
          if (filters.stockStatus === 'low' && (stock === 0 || stock > limit)) return false;
          if (filters.stockStatus === 'in' && stock <= limit) return false;
        }
        
        // Price filters
        if (minPriceNum !== null && item.retailPrice < minPriceNum) return false;
        if (maxPriceNum !== null && item.retailPrice > maxPriceNum) return false;

        return true;
      })
      .sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === 'category') {
          aValue = a.category?.name || '';
          bValue = b.category?.name || '';
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortDirection === 'asc' ? result : -result;
      });
  }, [items, debouncedSearchTerm, filters, sortField, sortDirection]);

  // Optimized keyboard shortcuts with useCallback
  const handleKeyPress = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      setIsAddModalOpen(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const handleDelete = async (item) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await axios.delete(
        BACKEND_API_URL+`/items/code/${item.itemCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Item deleted successfully');
        setItems(prevItems => prevItems.filter(i => i.itemCode !== item.itemCode));
        setDeleteModal({ isOpen: false, item: null });
      } else {
        throw new Error(response.data.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'Error deleting item');
    }
  };

  const handleStockAction = (item, action) => {
    setStockModal({ isOpen: true, item, action });
  };

  const canManageStock = user?.role === 'admin' || user?.role === 'cashier';
  const isAdmin = user?.role === 'admin';

  const getCategoryColor = (category) => {
    if (!category || !category.name) return categoryColors.Other;
    return categoryColors[category.name] || categoryColors.Other;
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    const items = filteredAndSortedItems.map(item => ({
      'Item Code': item.itemCode,
      'Name': item.name,
      'Category': item.category?.name || 'Uncategorized',
      'Location': item.location,
      'Purchase Price': `Rs. ${item.purchasePrice.toFixed(2)}`,
      'Retail Price': `Rs. ${item.retailPrice.toFixed(2)}`,
      'Discount': `${item.discount}%`,
      'Stock': item.quantityInStock
    }));

    const printContent = `
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            h1 { text-align: center; color: #333; margin-bottom: 10px; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .date { text-align: right; color: #666; font-size: 14px; }
            .summary { margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory Report</h1>
            <div class="date">Generated on: ${new Date().toLocaleString()}</div>
          </div>
          <div class="summary">
            <strong>Total Items: ${items.length}</strong> | 
            <strong>Total Value: Rs. ${items.reduce((sum, item) => sum + (parseFloat(item['Retail Price'].replace('Rs. ', '')) || 0), 0).toFixed(2)}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Purchase Price</th>
                <th>Retail Price</th>
                <th>Discount</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item['Item Code']}</td>
                  <td>${item['Name']}</td>
                  <td>${item['Category']}</td>
                  <td>${item['Location']}</td>
                  <td>${item['Purchase Price']}</td>
                  <td>${item['Retail Price']}</td>
                  <td>${item['Discount']}</td>
                  <td>${item['Stock']}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportToExcel = () => {
    const items = filteredAndSortedItems.map(item => ({
      'Item Code': item.itemCode,
      'Barcode': item.barcode || '',
      'Name': item.name,
      'Category': item.category?.name || 'Uncategorized',
      'Location': item.location,
      'Purchase Price': item.purchasePrice,
      'Retail Price': item.retailPrice,
      'Discount': item.discount,
      'Stock': item.quantityInStock,
      'Stock Value': item.quantityInStock * item.retailPrice
    }));

    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    XLSX.writeFile(wb, `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Inventory exported to Excel successfully');
  };

  // Memoized summary stats for performance
  const summaryStats = useMemo(() => {
    const totalItems = filteredAndSortedItems.length;
    let totalValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    
    filteredAndSortedItems.forEach(item => {
      totalValue += item.quantityInStock * item.retailPrice;
      const stock = item.quantityInStock;
      const limit = item.lowerLimit || 10;
      
      if (stock === 0) {
        outOfStockItems++;
      } else if (stock <= limit) {
        lowStockItems++;
      }
    });
    
    return { totalItems, totalValue, lowStockItems, outOfStockItems };
  }, [filteredAndSortedItems]);

  const { totalItems, totalValue, lowStockItems, outOfStockItems } = summaryStats;

  // Pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters]);

  if (loading) {
    return <Loading message="Loading inventory..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchItems}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </motion.button>
      </div>
    );
  }

  const ItemCard = memo(({ item }) => {
    const stockStatus = getStockStatus(item.quantityInStock, item.lowerLimit);
    const StatusIcon = stockStatus.icon;
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-500">#{item.itemCode}</span>
              {item.barcode && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {item.barcode}
                </span>
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                {item.category?.name || 'Uncategorized'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{item.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{item.location}</p>
          </div>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Stock Status</span>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
              <StatusIcon className="w-3 h-3" />
              {stockStatus.label}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Quantity</span>
            <span className="font-medium">{item.quantityInStock}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Retail Price</span>
            <span className="font-medium">Rs. {item.retailPrice.toFixed(2)}</span>
          </div>
          
          {item.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Discount</span>
              <span className="font-medium text-green-600">{item.discount}%</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setEditingItem(item)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
              >
                <FiEdit2 className="w-4 h-4" />
                Edit
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDeleteModal({ isOpen: true, item })}
                className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Inventory Management" 
        subtitle={`Manage ${totalItems} items • Total value: Rs. ${totalValue.toFixed(2)}`}
        icon={FiPackage}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiPackage className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">Rs. {totalValue.toFixed(0)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FiAlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <FiX className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="search-input"
                  placeholder="Search items, codes, barcodes, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                  showFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-4 h-4" />
                Filters
              </motion.button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                {viewMode === 'table' ? <FiGrid className="w-4 h-4" /> : <FiList className="w-4 h-4" />}
                {viewMode === 'table' ? 'Grid' : 'Table'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportToExcel}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Export
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePrintAll}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FiPrinter className="w-4 h-4" />
                Print
              </motion.button>
              
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Item
                </motion.button>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      name="category"
                      value={filters.category}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <select
                      name="location"
                      value={filters.location}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Locations</option>
                      {locations.map(location => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                    <select
                      name="stockStatus"
                      value={filters.stockStatus}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="in">In Stock</option>
                      <option value="low">Low Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
                    <input
                      type="number"
                      name="minPrice"
                      value={filters.minPrice}
                      onChange={handleFilterChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                    <input
                      type="number"
                      name="maxPrice"
                      value={filters.maxPrice}
                      onChange={handleFilterChange}
                      min="0"
                      step="0.01"
                      placeholder="999999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                  >
                    <FiX className="w-4 h-4" />
                    Clear All Filters
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {paginatedItems.map((item) => (
                <ItemCard key={item._id} item={item} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleSort('itemCode')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Item Code
                        {getSortIcon('itemCode')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('barcode')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Barcode
                        {getSortIcon('barcode')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('name')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Name
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('category')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Category
                        {getSortIcon('category')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('location')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Location
                        {getSortIcon('location')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('retailPrice')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Price
                        {getSortIcon('retailPrice')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('quantityInStock')}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Stock
                        {getSortIcon('quantityInStock')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {paginatedItems.map((item) => {
                      const stockStatus = getStockStatus(item.quantityInStock, item.lowerLimit);
                      const StatusIcon = stockStatus.icon;
                      
                      return (
                        <motion.tr 
                          key={item._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{item.itemCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.barcode || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate" title={item.name}>
                              {item.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                              {item.category?.name || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {item.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            Rs. {item.retailPrice.toFixed(2)}
                            {item.discount > 0 && (
                              <span className="ml-2 text-xs text-green-600">(-{item.discount}%)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={stockStatus.color}>
                              {item.quantityInStock}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {stockStatus.label}
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setEditingItem(item)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Edit
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setDeleteModal({ isOpen: true, item })}
                                  className="text-red-600 hover:text-red-800 font-medium"
                                >
                                  Delete
                                </motion.button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              
              {totalItems === 0 && (
                <div className="text-center py-12">
                  <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No items found</p>
                  <p className="text-gray-400">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </motion.button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    
                    return (
                      <motion.button
                        key={pageNum}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </motion.button>
                    );
                  })}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchItems}
      />

      <ItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSuccess={fetchItems}
      />

      <StockModal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ isOpen: false, item: null, action: null })}
        item={stockModal.item}
        action={stockModal.action}
        onSuccess={fetchItems}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={() => handleDelete(deleteModal.item)}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteModal.item?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Inventory;