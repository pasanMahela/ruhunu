import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../services/api';

const StockModal = ({ isOpen, onClose, item, action, onSuccess }) => {

  const BACKEND_API_URL = API_URL;
  
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!quantity || isNaN(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (action === 'out' && Number(quantity) > item.quantityInStock) {
      setError('Cannot remove more items than available in stock');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        BACKEND_API_URL+`/items/${item._id}/stock`,
        {
          operation: action === 'in' ? 'add' : 'subtract',
          quantity: Number(quantity)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`Stock ${action === 'in' ? 'added' : 'removed'} successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update stock';
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
            className="bg-white rounded-lg shadow-xl w-full max-w-md border-2 border-blue-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {action === 'in' ? 'Stock In' : 'Stock Out'}
                </h2>
                <button
                  onClick={onClose}
                    className="text-gray-600 hover:text-gray-800"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600">Item: {item.name}</p>
                <p className="text-gray-600">Current Stock: {item.quantityInStock}</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity to {action === 'in' ? 'Add' : 'Remove'}
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    step="1"
                    className={`w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      error ? 'border-red-500' : 'border-blue-200'
                    }`}
                    placeholder={`Enter quantity to ${action === 'in' ? 'add' : 'remove'}`}
                  />
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-1 text-sm text-red-600"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border-2 border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-4 py-2 rounded-md text-white ${
                      action === 'in'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : action === 'in' ? 'Add Stock' : 'Remove Stock'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StockModal; 