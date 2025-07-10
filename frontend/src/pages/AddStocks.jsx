import { useState, useRef, useEffect } from 'react';
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
  const fileInputRef = useRef(null);
  const submitButtonRef = useRef(null);
  const itemCodeInputRef = useRef(null);
  const searchButtonRef = useRef(null);
  
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

  useEffect(() => {
    // Focus the item code input when component mounts
    if (itemCodeInputRef.current) {
      itemCodeInputRef.current.focus();
    }

    // Add keyboard shortcuts
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save/submit
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (submitButtonRef.current && !loading && formData.itemCode && formData.newStock) {
          submitButtonRef.current.click();
        }
      }
      
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (itemCodeInputRef.current) {
          itemCodeInputRef.current.focus();
          itemCodeInputRef.current.select();
        }
      }
      
      // F3 or Ctrl+Enter to search
      if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        if (searchButtonRef.current && formData.itemCode) {
          searchButtonRef.current.click();
        }
      }
      
      // Ctrl+T or Cmd+T to download template
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        downloadTemplate();
      }
      
      // Ctrl+U or Cmd+U to upload file
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
      
      // Ctrl+N or Cmd+N to add new item
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewItemModal(true);
      }
      
      // Escape to cancel/navigate back
      if (e.key === 'Escape') {
        if (showValidationModal) {
          setShowValidationModal(false);
        } else if (showNewItemModal) {
          setShowNewItemModal(false);
        } else {
          navigate('/inventory');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, formData.itemCode, showValidationModal, showNewItemModal, navigate]);

  const handleSearch = async () => {
    if (!formData.itemCode.trim()) {
      setErrors(prev => ({ ...prev, itemCode: 'Item Code is required' }));
      if (itemCodeInputRef.current) {
        itemCodeInputRef.current.focus();
      }
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
      toast.success('Item found! Cursor moved to Location field.');
      
      // Focus the location field next since other fields are populated
      setTimeout(() => {
        const locationField = document.querySelector('input[name="location"]');
        if (locationField) {
          locationField.focus();
        }
      }, 100);
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

  // Handle Enter key on form inputs
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Special handling for item code - trigger search, then move to location
      if (e.target.name === 'itemCode') {
        if (formData.itemCode.trim()) {
          handleSearch();
          // After search, focus will be moved to location in handleSearch success
        }
        return;
      }
      
      // For other inputs, move to next field in the specified order
      const fieldOrder = ['location', 'newStock', 'purchasePrice', 'retailPrice', 'itemDiscount'];
      const currentField = e.target.name;
      const currentIndex = fieldOrder.indexOf(currentField);
      
      if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
        // Move to next field in order
        const nextFieldName = fieldOrder[currentIndex + 1];
        const nextField = document.querySelector(`input[name="${nextFieldName}"]`);
        if (nextField) {
          nextField.focus();
        }
      } else if (currentField === 'itemDiscount') {
        // Last field - move to submit button
        if (submitButtonRef.current) {
          submitButtonRef.current.focus();
        }
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.itemCode) {
      newErrors.itemCode = 'Item Code is required';
      if (itemCodeInputRef.current) {
        itemCodeInputRef.current.focus();
      }
    }
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.newStock) {
      newErrors.newStock = 'New Stock is required';
    } else if (isNaN(formData.newStock)) {
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
        toast.success('Stock updated successfully! Press Ctrl+F to search for another item.');
        setFormData(prev => ({
          ...prev,
          currentStock: (parseInt(prev.currentStock) + parseInt(prev.newStock)).toString(),
          newStock: ''
        }));
        
        // Focus item code input for next search
        if (itemCodeInputRef.current) {
          itemCodeInputRef.current.focus();
          itemCodeInputRef.current.select();
        }
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
    toast.success('Template downloaded successfully (Ctrl+T)');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
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
            className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                  Add Stocks
                </h1>
                <p className="text-sm text-gray-600 mt-1"> <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">F3</kbd> Find Item,
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Ctrl+S</kbd> Save, 
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Ctrl+T</kbd> Template, 
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Ctrl+U</kbd> Upload,
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Ctrl+N</kbd> New Item,
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Esc</kbd> Cancel
                </p>
              </div>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadTemplate}
                  title="Download Template (Ctrl+T)"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  tabIndex="0"
                >
                  <FiDownload className="text-lg" />
                  <span>Download Template</span>
                </motion.button>
                <label 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                  title="Upload Excel File (Ctrl+U)"
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <FiUpload className="text-lg" />
                  <span>Upload Excel</span>
                  <input
                    ref={fileInputRef}
                    key={fileInputKey}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    tabIndex="-1"
                  />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Item Code with Search */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code *
                  </label>
                  <div className="relative">
                    <input
                      ref={itemCodeInputRef}
                      type="text"
                      name="itemCode"
                      value={formData.itemCode}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter item code and press Enter or F3 to search"
                      autoComplete="off"
                      className={`w-full px-4 py-2 bg-white border-2 ${
                        errors.itemCode ? 'border-red-500' : 'border-blue-200'
                      } rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      tabIndex="1"
                    />
                    {errors.itemCode && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-600 text-sm mt-1"
                      >
                        {errors.itemCode}
                      </motion.p>
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  <motion.button
                    ref={searchButtonRef}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSearch}
                    disabled={searchLoading}
                    title="Search Item (F3 or Ctrl+Enter)"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 border-2 border-blue-500 focus:outline-none"
                    tabIndex="2"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                    tabIndex="-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter location"
                    autoComplete="off"
                    className={`w-full px-4 py-2 bg-white border ${
                      errors.location ? 'border-red-500' : 'border-blue-300'
                    } rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    tabIndex="3"
                  />
                  {errors.location && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.location}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                    tabIndex="-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lower Limit
                  </label>
                  <input
                    type="number"
                    name="lowerLimit"
                    value={formData.lowerLimit}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    min="0"
                    autoComplete="off"
                    className={`w-full px-4 py-2 bg-white border ${
                      errors.lowerLimit ? 'border-red-500' : 'border-blue-300'
                    } rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    tabIndex="7"
                  />
                  {errors.lowerLimit && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.lowerLimit}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="text"
                    value={formData.currentStock}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                    tabIndex="-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Stock *
                  </label>
                  <input
                    type="number"
                    name="newStock"
                    value={formData.newStock}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    min="0"
                    placeholder="Enter quantity to add"
                    autoComplete="off"
                    className={`w-full px-4 py-2 bg-white border ${
                      errors.newStock ? 'border-red-500' : 'border-blue-300'
                    } rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    tabIndex="4"
                  />
                  {errors.newStock && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.newStock}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price Rs. *
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    min="0"
                    step="0.01"
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    tabIndex="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retail Price Rs. *
                  </label>
                  <input
                    type="number"
                    name="retailPrice"
                    value={formData.retailPrice}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    min="0"
                    step="0.01"
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    tabIndex="6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Discount %
                  </label>
                  <input
                    type="number"
                    name="itemDiscount"
                    value={formData.itemDiscount}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    min="0"
                    max="100"
                    autoComplete="off"
                    className={`w-full px-4 py-2 bg-white border ${
                      errors.itemDiscount ? 'border-red-500' : 'border-blue-300'
                    } rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    tabIndex="7"
                  />
                  {errors.itemDiscount && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
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
                  title="Add new item to inventory (Ctrl+N)"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1"
                  tabIndex="9"
                >
                  <FiPlus className="w-4 h-4" />
                  Add new item to inventory
                </motion.button>

                <motion.button
                  ref={submitButtonRef}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 border border-blue-600 focus:outline-none"
                  tabIndex="8"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiAlertCircle className="text-red-600 mr-2" />
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <FiDownload className="text-lg" />
                  <span>Download Errors</span>
                </motion.button>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="text-gray-600 hover:text-gray-800 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {validationErrors.map((error, index) => (
                <div key={index} className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-red-700 font-medium mb-2">Row {error.row} - {error.item}:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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