import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiArrowUp, FiArrowDown, FiPrinter, FiDownload, FiFilter, FiX } from 'react-icons/fi';
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

// Category color mapping
const categoryColors = {
  'Electronics': 'bg-blue-600',
  'Clothing': 'bg-blue-500',
  'Food': 'bg-blue-700',
  'Books': 'bg-blue-800',
  'Other': 'bg-gray-600'
};

const Inventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    minStock: '',
    maxStock: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockModal, setStockModal] = useState({ isOpen: false, item: null, action: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const BACKEND_API_URL = API_URL;

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL+'/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check if response has the expected structure
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
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Fetch categories
  const fetchCategories = async () => {
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
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Extract unique locations from items
  useEffect(() => {
    if (items.length > 0) {
      const uniqueLocations = [...new Set(items.map(item => item.location).filter(Boolean))];
      setLocations(uniqueLocations);
    }
  }, [items]);

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
      location: '',
      minStock: '',
      maxStock: ''
    });
  };

  const filteredItems = Array.isArray(items) ? items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filters.category || item.category?.name === filters.category;
    const matchesLocation = !filters.location || item.location === filters.location;
    const matchesMinStock = !filters.minStock || item.quantityInStock >= Number(filters.minStock);
    const matchesMaxStock = !filters.maxStock || item.quantityInStock <= Number(filters.maxStock);

    return matchesSearch && matchesCategory && matchesLocation && matchesMinStock && matchesMaxStock;
  }) : [];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + N for new item
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsAddModalOpen(true);
      }
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleDelete = async (item) => {
    try {
      console.log('Attempting to delete item:', item.itemCode);
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
    const items = filteredItems.map(item => ({
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
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            h1 { text-align: center; color: #333; }
            .header { margin-bottom: 20px; }
            .date { text-align: right; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory Report</h1>
            <div class="date">Generated on: ${new Date().toLocaleString()}</div>
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
    const items = filteredItems.map(item => ({
      'Item Code': item.itemCode,
      'Name': item.name,
      'Category': item.category?.name || 'Uncategorized',
      'Location': item.location,
      'Purchase Price': item.purchasePrice,
      'Retail Price': item.retailPrice,
      'Discount': item.discount,
      'Stock': item.quantityInStock
    }));

    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    // Generate Excel file
    XLSX.writeFile(wb, `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Inventory exported to Excel successfully');
  };

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

  const ItemCard = ({ item }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-lg"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
          <p className="text-gray-600 text-sm">{item.itemCode}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)} text-white`}>
          {item.category?.name || 'Uncategorized'}
        </span>
      </div>
      
      <div className="space-y-2">
        <p className="text-gray-700">
          <span className="text-gray-600">Location:</span> {item.location}
        </p>
        <p className="text-gray-700">
          <span className="text-gray-600">Stock:</span> {item.quantityInStock}
        </p>
        <p className="text-gray-700">
          <span className="text-gray-600">Price:</span> Rs. {item.retailPrice}
        </p>
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        {isAdmin && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditingItem(item)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Edit
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDeleteModal({ isOpen: true, item })}
              className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              Delete
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent"
          >
            Inventory Management
          </motion.h1>
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrintAll}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-blue-300 flex items-center"
            >
              <FiPrinter className="mr-2" />
              Print All
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportToExcel}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-blue-300 flex items-center"
            >
              <FiDownload className="mr-2" />
              Export to Excel
            </motion.button>
            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-blue-300 flex items-center"
              >
                <FiPlus className="mr-2" />
                Add New Item
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                id="search-input"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <motion.div
              initial={false}
              animate={{
                width: showFilters ? 'auto' : 'auto',
                backgroundColor: showFilters ? 'rgb(59 130 246)' : 'rgba(147 197 253, 0.5)',
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut"
              }}
              className="relative"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 rounded-lg flex items-center space-x-2 text-gray-600 hover:text-white transition-colors duration-200"
              >
                <motion.div
                  animate={{ rotate: showFilters ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FiFilter />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ 
                    opacity: 1,
                    width: 'auto',
                    marginLeft: showFilters ? 8 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </motion.span>
              </motion.button>
            </motion.div>
          </div>
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              Grid
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              Table
            </motion.button>
          </div>
        </div>

        {/* Filters Section */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ 
                opacity: 1, 
                height: 'auto',
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                height: 0,
                y: -20
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut"
              }}
              className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 border-2 border-blue-200 shadow-lg overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearFilters}
                  className="text-gray-600 hover:text-gray-800 flex items-center space-x-1"
                >
                  <FiX />
                  <span>Clear Filters</span>
                </motion.button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    name="minStock"
                    value={filters.minStock}
                    onChange={handleFilterChange}
                    min="0"
                    placeholder="Min stock"
                    className="w-full px-3 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                  <input
                    type="number"
                    name="maxStock"
                    value={filters.maxStock}
                    onChange={handleFilterChange}
                    min="0"
                    placeholder="Max stock"
                    className="w-full px-3 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}

        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                                      <tr className="bg-blue-100">
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-64">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Purchase Price Rs.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Retail Price Rs.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Stock</th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                                  <tbody className="divide-y divide-blue-200">
                  {filteredItems.map((item) => (
                                          <tr key={item._id} className="hover:bg-blue-50">
                                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.itemCode}</td>
                        <td className="px-6 py-4 text-sm text-gray-800 break-words max-w-xs">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)} text-white`}>
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Rs. {item.purchasePrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Rs. {item.retailPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.discount}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.quantityInStock}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setEditingItem(item)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setDeleteModal({ isOpen: true, item })}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </motion.button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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