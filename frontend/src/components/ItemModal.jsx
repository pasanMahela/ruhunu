import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CategoryModal from './CategoryModal';
import { API_URL } from '../services/api';

const ItemModal = ({ isOpen, onClose, onSuccess, item = null }) => {

  const BACKEND_API_URL = API_URL;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    location: '',
    lowerLimit: 0,
    purchasePrice: 0,
    retailPrice: 0,
    discount: 0,
    barcode: ''
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category._id,
        description: item.description || '',
        location: item.location || '',
        lowerLimit: item.lowerLimit || 0,
        purchasePrice: item.purchasePrice || 0,
        retailPrice: item.retailPrice || 0,
        discount: item.discount || 0,
        barcode: item.barcode || ''
      });
    } else {
      setFormData({
        name: '',
        category: '',
        description: '',
        location: '',
        lowerLimit: 0,
        purchasePrice: 0,
        retailPrice: 0,
        discount: 0,
        barcode: ''
      });
    }
  }, [item]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await axios.get(BACKEND_API_URL+'/categories', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      console.log('Submitting form data:', formData);
      console.log('Barcode value:', formData.barcode, 'Type:', typeof formData.barcode);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      if (item) {
        // Update existing item
        const response = await axios.put(
          BACKEND_API_URL+`/items/${item._id}`,
          formData,
          config
        );
        console.log('Update response:', response.data);
        toast.success('Item updated successfully');
      } else {
        // Create new item
        const response = await axios.post(
          BACKEND_API_URL+'/items',
          formData,
          config
        );
        console.log('Create response:', response.data);
        toast.success(`Item created successfully with code: ${response.data.data.itemCode}`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      if (error.response?.data?.message?.includes('already exists')) {
        toast.error('An item with this name already exists');
      } else {
        toast.error(error.response?.data?.message || 'Error saving item');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white backdrop-blur-sm rounded-xl shadow-2xl border-2 border-blue-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b-2 border-blue-200">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                  {item ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="category"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Category
                    </label>
                    <div className="flex space-x-2">
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="flex-1 px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors"
                      >
                        <FiPlus size={20} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="location"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lowerLimit"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Lower Limit
                    </label>
                    <input
                      type="number"
                      id="lowerLimit"
                      name="lowerLimit"
                      value={formData.lowerLimit}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="purchasePrice"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      id="purchasePrice"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="retailPrice"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Retail Price
                    </label>
                    <input
                      type="number"
                      id="retailPrice"
                      name="retailPrice"
                      value={formData.retailPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="discount"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      id="discount"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="1"
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="barcode"
                      className="block text-gray-700 text-sm font-medium mb-2"
                    >
                      Barcode
                    </label>
                    <input
                      type="text"
                      id="barcode"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="description"
                    className="block text-gray-700 text-sm font-medium mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => {
          fetchCategories();
          setIsCategoryModalOpen(false);
        }}
      />
    </>
  );
};

export default ItemModal; 