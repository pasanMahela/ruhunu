import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiEdit2, FiSave, FiX, FiPackage, FiPlus, FiArrowLeft } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import CategoryModal from '../components/CategoryModal';
import Loading from '../components/Loading';

const EditItem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const BACKEND_API_URL = API_URL;
  
  // Refs for focus management
  const itemCodeRef = useRef(null);
  const nameInputRef = useRef(null);
  
  // Search states
  const [itemCode, setItemCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Item data states
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    location: '',
    lowerLimit: 0,
    purchasePrice: 0,
    retailPrice: 0,
    discount: 0
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            if (itemCodeRef.current) {
              itemCodeRef.current.focus();
              itemCodeRef.current.select();
            }
            break;
          case 's':
            e.preventDefault();
            if (selectedItem) {
              handleSubmit(e);
            }
            break;
          case 'Escape':
            e.preventDefault();
            if (selectedItem) {
              handleClear();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const handleSearch = async () => {
    if (!itemCode.trim()) {
      setErrors(prev => ({ ...prev, itemCode: 'Item Code is required' }));
      if (itemCodeRef.current) {
        itemCodeRef.current.focus();
      }
      return;
    }

    setSearchLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_API_URL}/items/code/${itemCode}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const item = response.data.data;
        setSelectedItem(item);
        setFormData({
          name: item.name,
          category: item.category._id,
          description: item.description || '',
          location: item.location || '',
          lowerLimit: item.lowerLimit || 0,
          purchasePrice: item.purchasePrice || 0,
          retailPrice: item.retailPrice || 0,
          discount: item.discount || 0
        });
        
        toast.success('Item found! You can now edit the details.');
        
        // Focus the name field
        setTimeout(() => {
          if (nameInputRef.current) {
            nameInputRef.current.focus();
          }
        }, 100);
      } else {
        throw new Error(response.data.message || 'Item not found');
      }
    } catch (error) {
      console.error('Error searching item:', error);
      toast.error(error.response?.data?.message || 'Item not found');
      setSelectedItem(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        location: '',
        lowerLimit: 0,
        purchasePrice: 0,
        retailPrice: 0,
        discount: 0
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (formData.purchasePrice < 0) {
      newErrors.purchasePrice = 'Purchase price cannot be negative';
    }
    
    if (formData.retailPrice < 0) {
      newErrors.retailPrice = 'Retail price cannot be negative';
    }
    
    if (formData.discount < 0 || formData.discount > 100) {
      newErrors.discount = 'Discount must be between 0 and 100';
    }
    
    if (formData.lowerLimit < 0) {
      newErrors.lowerLimit = 'Lower limit cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) {
      toast.error('Please search for an item first');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${BACKEND_API_URL}/items/${selectedItem._id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Item updated successfully!');
        
        // Update the selected item with new data
        setSelectedItem(prev => ({
          ...prev,
          ...formData,
          category: categories.find(cat => cat._id === formData.category) || prev.category
        }));
        
        // Focus back to Item Code field for next item
        setTimeout(() => {
          if (itemCodeRef.current) {
            itemCodeRef.current.focus();
            itemCodeRef.current.select();
          }
        }, 100);
      } else {
        throw new Error(response.data.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      if (error.response?.data?.message?.includes('already exists')) {
        toast.error('An item with this name already exists');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update item');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setItemCode('');
    setSelectedItem(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      location: '',
      lowerLimit: 0,
      purchasePrice: 0,
      retailPrice: 0,
      discount: 0
    });
    setErrors({});
    
    if (itemCodeRef.current) {
      itemCodeRef.current.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (e.target === itemCodeRef.current) {
        handleSearch();
      } else if (selectedItem) {
        // Move to next field or submit
        const form = e.target.form;
        const formElements = Array.from(form.elements);
        const currentIndex = formElements.indexOf(e.target);
        const nextElement = formElements[currentIndex + 1];
        
        if (nextElement && nextElement.type !== 'submit') {
          nextElement.focus();
        } else {
          handleSubmit(e);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <PageHeader 
        title="Edit Item" 
        subtitle="Search and edit item details"
        icon={FiEdit2}
      />

      <div className="max-w-6xl mx-auto">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <FiSearch className="text-2xl text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Search Item</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Item Code
              </label>
              <input
                ref={itemCodeRef}
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter item code and press Enter"
                className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.itemCode ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.itemCode && (
                <p className="text-red-500 text-sm mt-1">{errors.itemCode}</p>
              )}
            </div>
            
            <div className="flex items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSearch}
                disabled={searchLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {searchLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <FiSearch className="w-5 h-5" />
                )}
                {searchLoading ? 'Searching...' : 'Search'}
              </motion.button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Tip:</strong> Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+F</kbd> to focus search field</p>
          </div>
        </motion.div>

        {/* Edit Form Section */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <FiPackage className="text-2xl text-blue-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Edit Item Details</h2>
                    <p className="text-gray-600">Item Code: {selectedItem.itemCode}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClear}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <FiX className="w-4 h-4" />
                    Clear
                  </motion.button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Item Name *
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Category *
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`flex-1 px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.category ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Category</option>
                        {categories.map(category => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FiPlus className="w-5 h-5" />
                      </motion.button>
                    </div>
                    {errors.category && (
                      <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  {/* Lower Limit */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Lower Limit
                    </label>
                    <input
                      type="number"
                      name="lowerLimit"
                      value={formData.lowerLimit}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      min="0"
                      className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.lowerLimit ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.lowerLimit && (
                      <p className="text-red-500 text-sm mt-1">{errors.lowerLimit}</p>
                    )}
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Purchase Price (Rs.)
                    </label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.purchasePrice ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.purchasePrice && (
                      <p className="text-red-500 text-sm mt-1">{errors.purchasePrice}</p>
                    )}
                  </div>

                  {/* Retail Price */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Retail Price (Rs.)
                    </label>
                    <input
                      type="number"
                      name="retailPrice"
                      value={formData.retailPrice}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.retailPrice ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.retailPrice && (
                      <p className="text-red-500 text-sm mt-1">{errors.retailPrice}</p>
                    )}
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      min="0"
                      max="100"
                      step="0.01"
                      className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.discount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.discount && (
                      <p className="text-red-500 text-sm mt-1">{errors.discount}</p>
                    )}
                  </div>
                </div>

                {/* Current Stock Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Current Stock Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Quantity in Stock:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {selectedItem.quantityInStock || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Created:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {new Date(selectedItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Last Updated:</span>
                      <span className="font-medium text-blue-900 ml-2">
                        {new Date(selectedItem.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <FiSave className="w-5 h-5" />
                    )}
                    {loading ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => navigate('/inventory')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                    Back to Inventory
                  </motion.button>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Shortcuts:</strong> Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+S</kbd> to save, <kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to clear</p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={fetchCategories}
      />
    </div>
  );
};

export default EditItem; 