import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiAlertCircle, FiDownload, FiUpload } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ItemModal from '../components/ItemModal';
import * as XLSX from 'xlsx';
import { API_URL } from '../services/api';

const generateResultExcel = (validationResults) => {
  const wb = XLSX.utils.book_new();

  // Successful Updates Sheet
  if (validationResults.successfulItems.length > 0) {
    const successfulData = validationResults.successfulItems.map(item => ({
      'Item Code': item.itemCode,
      'Item Name': item.name,
      'New Stock Added': item.quantity,
      'Total Stock': item.totalStock,
      'Purchase Price': item.purchasePrice.toFixed(2),
      'Retail Price': item.retailPrice.toFixed(2),
      'Status': 'Successfully Updated'
    }));
    const wsSuccess = XLSX.utils.json_to_sheet(successfulData);
    XLSX.utils.book_append_sheet(wb, wsSuccess, 'Successfully Updated');
  }

  // Failed Updates Sheet
  if (validationResults.failedItems.length > 0) {
    const failedData = validationResults.failedItems.map(item => ({
      'Item Code': item.itemCode,
      'Item Name': item.name,
      'Error': item.error,
      'Status': 'Failed'
    }));
    const wsFailed = XLSX.utils.json_to_sheet(failedData);
    XLSX.utils.book_append_sheet(wb, wsFailed, 'Failed Updates');
  }

  // Summary Sheet
  const summaryData = [
    ['Bulk Stock Update Summary'],
    ['Total Items Processed', validationResults.totalProcessed],
    ['Successfully Updated', validationResults.successful],
    ['Failed Updates', validationResults.failed],
    [''],
    ['Generated on', new Date().toLocaleString()]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  XLSX.writeFile(wb, `bulk_stock_update_results_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const AddStocks = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    description: '',
    location: '',
    lowerLimit: '',
    currentStock: '',
    purchasePrice: '',
    retailPrice: '',
    itemDiscount: '',
    newStock: ''
  });
  const [errors, setErrors] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const BACKEND_API_URL = API_URL;

  const handleSearch = async () => {
    if (!formData.itemCode.trim()) {
      setErrors(prev => ({ ...prev, itemCode: 'Item Code is required' }));
      return;
    }

    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(
        BACKEND_API_URL+`/items/code/${formData.itemCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch item');
      }

      const item = response.data.data;
      if (!item) {
        throw new Error('Item not found');
      }

      setFormData(prev => ({
        ...prev,
        itemName: item.name || '',
        description: item.description || '',
        location: item.location || '',
        currentStock: item.quantityInStock?.toString() || '0',
        purchasePrice: item.purchasePrice?.toString() || '',
        retailPrice: item.retailPrice?.toString() || '',
        itemDiscount: item.discount?.toString() || '0',
        lowerLimit: item.lowerLimit?.toString() || ''
      }));
      setErrors({});
      toast.success('Item found');
    } catch (error) {
      console.error('Error searching for item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Item not found';
      toast.error(errorMessage);
      setErrors(prev => ({ ...prev, itemCode: errorMessage }));
      
      // Clear form data on error
      setFormData(prev => ({
        ...prev,
        itemName: '',
        description: '',
        location: '',
        currentStock: '',
        purchasePrice: '',
        retailPrice: '',
        itemDiscount: '',
        lowerLimit: ''
      }));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.itemCode) newErrors.itemCode = 'Item Code is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.newStock) newErrors.newStock = 'New Stock is required';
    if (formData.newStock && isNaN(formData.newStock)) {
      newErrors.newStock = 'Must be a number';
    }
    if (formData.lowerLimit && isNaN(formData.lowerLimit)) {
      newErrors.lowerLimit = 'Must be a number';
    }
    if (formData.itemDiscount && isNaN(formData.itemDiscount)) {
      newErrors.itemDiscount = 'Must be a number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const stockData = {
        quantity: parseInt(formData.newStock),
        location: formData.location,
        lowerLimit: parseInt(formData.lowerLimit),
        purchasePrice: parseFloat(formData.purchasePrice),
        retailPrice: parseFloat(formData.retailPrice),
        discount: parseFloat(formData.itemDiscount)
      };

      console.log('Sending request with data:', stockData);

      const response = await axios.patch(
        BACKEND_API_URL+`/items/code/${formData.itemCode}/stock`,
        stockData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Stock updated successfully');
        setFormData(prev => ({
          ...prev,
          currentStock: (parseInt(prev.currentStock) + parseInt(prev.newStock)).toString(),
          newStock: ''
        }));
      } else {
        throw new Error(response.data.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(error.response?.data?.message || 'Error updating stock');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create template data with only required fields
    const templateData = [
      {
        'Item Code': '',
        'New Stock': '',
        'Purchase Price': '',
        'Retail Price': ''
      }
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Add instructions sheet
    const instructions = [
      ['Instructions:'],
      ['1. All fields are required'],
      ['2. Item Code must be a valid existing item code'],
      ['3. New Stock must be a positive number'],
      ['4. Purchase Price and Retail Price must be positive numbers with up to 2 decimal places'],
      [''],
      ['Example:'],
      ['Item Code | New Stock | Purchase Price | Retail Price'],
      ['ITM001    | 10        | 100.00        | 150.00']
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    XLSX.writeFile(wb, 'stock_update_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const validateStockData = async (data) => {
    const errors = [];
    const requiredFields = ['Item Code', 'New Stock', 'Purchase Price', 'Retail Price'];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Validate item code exists
    if (data['Item Code']) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          BACKEND_API_URL+`/items/code/${data['Item Code']}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (!response.data.success) {
          errors.push(`Invalid Item Code: ${data['Item Code']}`);
        }
      } catch (error) {
        errors.push(`Invalid Item Code: ${data['Item Code']}`);
      }
    }

    // Validate new stock
    if (data['New Stock'] && (isNaN(data['New Stock']) || data['New Stock'] < 0)) {
      errors.push('New Stock must be a positive number');
    }

    // Validate prices
    if (data['Purchase Price'] && (isNaN(data['Purchase Price']) || data['Purchase Price'] < 0)) {
      errors.push('Purchase Price must be a positive number');
    }
    if (data['Retail Price'] && (isNaN(data['Retail Price']) || data['Retail Price'] < 0)) {
      errors.push('Retail Price must be a positive number');
    }

    return errors;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setValidationErrors([]);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate all items
          const allErrors = [];
          for (const item of jsonData) {
            const errors = await validateStockData(item);
            if (errors.length > 0) {
              allErrors.push({
                row: jsonData.indexOf(item) + 2,
                errors,
                item: item['Item Code'] || 'Unknown Item'
              });
            }
          }

          if (allErrors.length > 0) {
            setValidationErrors(allErrors);
            setShowValidationModal(true);
            return;
          }

          // If validation passes, prepare data for upload
          const updatesToProcess = await Promise.all(jsonData.map(async item => {
            const token = localStorage.getItem('token');
            const itemResponse = await axios.get(
              BACKEND_API_URL+`/items/code/${item['Item Code']}`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            const itemData = itemResponse.data.data;

            return {
              itemCode: item['Item Code'],
              stockData: {
                quantity: parseInt(item['New Stock']),
                purchasePrice: parseFloat(item['Purchase Price']),
                retailPrice: parseFloat(item['Retail Price']),
                location: itemData.location,
                lowerLimit: itemData.lowerLimit,
                discount: itemData.discount
              }
            };
          }));

          // Process updates
          const results = {
            successfulItems: [],
            failedItems: [],
            totalProcessed: updatesToProcess.length,
            successful: 0,
            failed: 0
          };

          for (const update of updatesToProcess) {
            try {
              const token = localStorage.getItem('token');
              const response = await axios.patch(
                BACKEND_API_URL+`/items/code/${update.itemCode}/stock`,
                update.stockData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  }
                }
              );

              if (response.data.success) {
                results.successfulItems.push({
                  itemCode: update.itemCode,
                  name: response.data.data.name,
                  quantity: update.stockData.quantity,
                  totalStock: response.data.data.quantityInStock,
                  purchasePrice: update.stockData.purchasePrice,
                  retailPrice: update.stockData.retailPrice
                });
                results.successful++;
              } else {
                throw new Error(response.data.message || 'Failed to update stock');
              }
            } catch (error) {
              results.failedItems.push({
                itemCode: update.itemCode,
                name: update.itemCode,
                error: error.response?.data?.message || 'Failed to update stock'
              });
              results.failed++;
            }
          }

          // Generate and download result Excel
          generateResultExcel(results);
          toast.success(`Successfully updated ${results.successful} items`);
          setFileInputKey(Date.now());
          navigate('/inventory');
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Error processing file. Please check the format and try again.');
          setFileInputKey(Date.now());
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error reading file');
      setFileInputKey(Date.now());
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6">
      {loading || uploadLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 bg-clip-text text-transparent">
                Add Stocks
              </h1>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-slate-700/50 text-white rounded-lg flex items-center space-x-2 hover:bg-slate-700 transition-colors"
                >
                  <FiDownload className="text-lg" />
                  <span>Download Template</span>
                </motion.button>
                <label className="px-4 py-2 bg-slate-700/50 text-white rounded-lg flex items-center space-x-2 hover:bg-slate-700 transition-colors cursor-pointer">
                  <FiUpload className="text-lg" />
                  <span>Upload Excel</span>
                  <input
                    key={fileInputKey}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Item Code with Search */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Item Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="itemCode"
                      value={formData.itemCode}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 bg-slate-800/50 border ${
                        errors.itemCode ? 'border-red-500' : 'border-slate-700'
                      } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                      placeholder="Enter item code"
                    />
                    {errors.itemCode && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-1"
                      >
                        {errors.itemCode}
                      </motion.p>
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSearch}
                    disabled={searchLoading}
                    className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg hover:from-slate-800 hover:to-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 border border-slate-600"
                  >
                    {searchLoading ? (
                      <motion.div
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <FiSearch className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Item Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-slate-800/50 border ${
                      errors.location ? 'border-red-500' : 'border-slate-700'
                    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                    placeholder="Enter location"
                  />
                  {errors.location && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-1"
                    >
                      {errors.location}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Lower Limit
                  </label>
                  <input
                    type="number"
                    name="lowerLimit"
                    value={formData.lowerLimit}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-slate-800/50 border ${
                      errors.lowerLimit ? 'border-red-500' : 'border-slate-700'
                    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  />
                  {errors.lowerLimit && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-1"
                    >
                      {errors.lowerLimit}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="text"
                    value={formData.currentStock}
                    readOnly
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    New Stock
                  </label>
                  <input
                    type="number"
                    name="newStock"
                    value={formData.newStock}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-slate-800/50 border ${
                      errors.newStock ? 'border-red-500' : 'border-slate-700'
                    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  />
                  {errors.newStock && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-1"
                    >
                      {errors.newStock}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Purchase Price Rs.
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Retail Price Rs.
                  </label>
                  <input
                    type="number"
                    name="retailPrice"
                    value={formData.retailPrice}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Item Discount %
                  </label>
                  <input
                    type="number"
                    name="itemDiscount"
                    value={formData.itemDiscount}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-slate-800/50 border ${
                      errors.itemDiscount ? 'border-red-500' : 'border-slate-700'
                    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  />
                  {errors.itemDiscount && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-1"
                    >
                      {errors.itemDiscount}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowNewItemModal(true)}
                  className="text-slate-300 hover:text-white flex items-center gap-2"
                >
                  <FiPlus className="w-4 h-4" />
                  Add new item to inventory
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg hover:from-slate-800 hover:to-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 border border-slate-600"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Add to Stock'
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-300 flex items-center">
                <FiAlertCircle className="text-red-400 mr-2" />
                Validation Errors
              </h3>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const wb = XLSX.utils.book_new();
                    
                    // Validation Errors Sheet
                    const errorData = validationErrors.map(error => ({
                      'Row': error.row,
                      'Item Code': error.item,
                      'Errors': error.errors.join(', ')
                    }));
                    const wsErrors = XLSX.utils.json_to_sheet(errorData);
                    XLSX.utils.book_append_sheet(wb, wsErrors, 'Validation Errors');

                    // Summary Sheet
                    const summaryData = [
                      ['Validation Summary'],
                      ['Total Items Checked', validationErrors.length],
                      ['Items with Errors', validationErrors.length],
                      [''],
                      ['Generated on', new Date().toLocaleString()]
                    ];
                    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
                    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

                    XLSX.writeFile(wb, `stock_validation_errors_${new Date().toISOString().split('T')[0]}.xlsx`);
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center space-x-2"
                >
                  <FiDownload className="text-lg" />
                  <span>Download Errors</span>
                </motion.button>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {validationErrors.map((error, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-red-400 font-medium mb-2">Row {error.row} - {error.item}:</p>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {error.errors.map((err, errIndex) => (
                      <li key={errIndex}>{err}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showNewItemModal && (
          <ItemModal
            onClose={() => setShowNewItemModal(false)}
            onSuccess={() => {
              setShowNewItemModal(false);
              toast.success('New item added successfully');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddStocks; 