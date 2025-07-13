import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiAlertCircle, FiDownload, FiUpload, FiPackage, FiFile, FiCheck, FiX, FiEye, FiTrash2 } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ItemModal from '../components/ItemModal';
import * as XLSX from 'xlsx';
import { API_URL } from '../services/api';
import PageHeader from '../components/PageHeader';

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
    newStock: '',
    barcode: ''
  });
  const [errors, setErrors] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
  // Bulk upload states
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [validItems, setValidItems] = useState([]);
  const [invalidItems, setInvalidItems] = useState([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [updatePrices, setUpdatePrices] = useState(true);

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
      
      // Ctrl+U or Cmd+U to open bulk upload
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setShowBulkUpload(true);
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

      const searchValue = formData.itemCode.trim();
      let response;
      let item;

      // First try to search by item code
      try {
        response = await axios.get(
          BACKEND_API_URL+`/items/code/${searchValue}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

        if (response.data.success) {
          item = response.data.data;
        }
      } catch (codeError) {
        // If item code search fails, try barcode search
        try {
          response = await axios.get(
            BACKEND_API_URL+`/items/barcode/${searchValue}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.data.success) {
            item = response.data.data;
          }
        } catch (barcodeError) {
          // If both fail, try general search
          try {
            response = await axios.get(
              BACKEND_API_URL+`/items/search?q=${encodeURIComponent(searchValue)}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (response.data.success && response.data.data.length > 0) {
              item = response.data.data[0]; // Take the first result
            }
          } catch (searchError) {
            throw new Error('Item not found');
          }
        }
      }

      if (!item) {
        throw new Error('Item not found');
      }

      setFormData(prev => ({
        ...prev,
        itemCode: item.itemCode || '', // Always set the actual itemCode from the found item
        itemName: item.name || '',
        description: item.description || '',
        location: item.location || '',
        currentStock: item.quantityInStock?.toString() || '0',
        purchasePrice: item.purchasePrice?.toString() || '',
        retailPrice: item.retailPrice?.toString() || '',
        itemDiscount: item.discount?.toString() || '0',
        lowerLimit: item.lowerLimit?.toString() || '',
        barcode: item.barcode || ''
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
        itemCode: '', // Clear the itemCode field on error
        itemName: '',
        description: '',
        location: '',
        currentStock: '',
        purchasePrice: '',
        retailPrice: '',
        itemDiscount: '',
        lowerLimit: '',
        barcode: ''
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
    let firstErrorField = null;

    // Item Code validation
    if (!formData.itemCode) {
      newErrors.itemCode = 'Item Code is required';
      firstErrorField = itemCodeInputRef;
      }

    // Location validation
    if (!formData.location) {
      newErrors.location = 'Location is required';
      if (!firstErrorField) {
        firstErrorField = document.querySelector('input[name="location"]');
      }
    }

    // New Stock validation
    if (!formData.newStock) {
      newErrors.newStock = 'New Stock is required';
      if (!firstErrorField) {
        firstErrorField = document.querySelector('input[name="newStock"]');
      }
    } else if (isNaN(formData.newStock)) {
      newErrors.newStock = 'Must be a number';
      if (!firstErrorField) {
        firstErrorField = document.querySelector('input[name="newStock"]');
    }
    }

    // Lower Limit validation
    if (formData.lowerLimit && isNaN(formData.lowerLimit)) {
      newErrors.lowerLimit = 'Must be a number';
      if (!firstErrorField) {
        firstErrorField = document.querySelector('input[name="lowerLimit"]');
    }
    }

    // Item Discount validation
    if (formData.itemDiscount && isNaN(formData.itemDiscount)) {
      newErrors.itemDiscount = 'Must be a number';
      if (!firstErrorField) {
        firstErrorField = document.querySelector('input[name="itemDiscount"]');
    }
    }

    setErrors(newErrors);

    // Focus the first field with an error
    if (firstErrorField) {
      setTimeout(() => {
        firstErrorField.focus();
        if (firstErrorField.select) {
          firstErrorField.select();
        }
      }, 100);
      return false;
    }

    return true;
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
      console.log('Using itemCode for API call:', formData.itemCode);

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
        
        // Focus and select item code input after successful update for next search
        setTimeout(() => {
        if (itemCodeInputRef.current) {
          itemCodeInputRef.current.focus();
          itemCodeInputRef.current.select();
        }
        }, 100);
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
    // Create template data based on price update option
    const templateData = updatePrices ? [
      {
        'Item Code': '',
        'New Stock': '',
        'Purchase Price': '',
        'Retail Price': ''
      }
    ] : [
      {
        'Item Code': '',
        'New Stock': ''
      }
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Add instructions sheet based on price update option
    const instructions = updatePrices ? [
      ['Instructions (With Price Update):'],
      ['1. All fields are required'],
      ['2. Item Code must be a valid existing item code (numeric)'],
      ['3. New Stock must be a positive number'],
      ['4. Purchase Price and Retail Price must be positive numbers with up to 2 decimal places'],
      [''],
      ['Example:'],
      ['Item Code | New Stock | Purchase Price | Retail Price'],
      ['1         | 10        | 100.00        | 150.00'],
      ['2         | 5         | 50.00         | 75.00']
    ] : [
      ['Instructions (Stock Only Update):'],
      ['1. All fields are required'],
      ['2. Item Code must be a valid existing item code (numeric)'],
      ['3. New Stock must be a positive number'],
      ['4. Prices will not be updated - only stock quantities will change'],
      [''],
      ['Example:'],
      ['Item Code | New Stock'],
      ['1         | 10       '],
      ['2         | 5        ']
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    const filename = updatePrices ? 'stock_update_with_prices_template.xlsx' : 'stock_update_only_template.xlsx';
    XLSX.writeFile(wb, filename);
    toast.success(`Template downloaded successfully (${updatePrices ? 'With Prices' : 'Stock Only'})`);
  };

  const validateStockData = async (data) => {
    const errors = [];
    const requiredFields = updatePrices 
      ? ['Item Code', 'New Stock', 'Purchase Price', 'Retail Price']
      : ['Item Code', 'New Stock'];
    
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

    // Validate prices only if price update is enabled
    if (updatePrices) {
      if (data['Purchase Price'] && (isNaN(data['Purchase Price']) || data['Purchase Price'] < 0)) {
        errors.push('Purchase Price must be a positive number');
      }
      if (data['Retail Price'] && (isNaN(data['Retail Price']) || data['Retail Price'] < 0)) {
        errors.push('Retail Price must be a positive number');
      }
    }

    return errors;
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = async (file) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setUploadedFile(file);
    await processFile(file);
  };

  const processFile = async (file) => {
    setUploadLoading(true);
    setUploadProgress(0);
    setUploadStatus('Reading file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setUploadStatus('Processing data...');
        setUploadProgress(30);
        
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setUploadStatus('Validating items...');
        setUploadProgress(60);

        // Validate and categorize items
        const valid = [];
        const invalid = [];
        const processedCodes = new Set(); // Track codes within the current upload
        
        for (let index = 0; index < jsonData.length; index++) {
          const item = jsonData[index];
          const errors = await validateStockData(item);
          
          // Check for duplicates within the current upload
          if (item['Item Code'] && processedCodes.has(item['Item Code'].toLowerCase())) {
            errors.push(`Duplicate item code within upload: "${item['Item Code']}"`);
          } else if (item['Item Code']) {
            processedCodes.add(item['Item Code'].toLowerCase());
          }
          
          const processedItem = {
            ...item,
            rowIndex: index + 2,
            id: `item-${index}`
          };
          
          if (errors.length > 0) {
            invalid.push({
              ...processedItem,
              errors
            });
          } else {
            valid.push(processedItem);
          }
        }

        setValidItems(valid);
        setInvalidItems(invalid);
        setPreviewData(jsonData);
        setShowPreview(true);
        setUploadProgress(100);
        setUploadStatus('File processed successfully!');
        
        toast.success(`File processed: ${valid.length} valid items, ${invalid.length} items with errors`);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Error processing file. Please check the format and try again.');
        resetUploadState();
      } finally {
        setUploadLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const resetUploadState = () => {
    setUploadedFile(null);
    setPreviewData([]);
    setShowPreview(false);
    setValidItems([]);
    setInvalidItems([]);
    setUploadProgress(0);
    setUploadStatus('');
    setFileInputKey(Date.now());
  };

  // Reset upload state when price update option changes
  const handleUpdatePricesChange = (value) => {
    setUpdatePrices(value);
    if (uploadedFile || showPreview) {
      resetUploadState();
      toast.info('Upload cleared due to option change. Please upload your file again.');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    await handleFileSelection(file);
  };

  const confirmBulkUpload = async () => {
    if (validItems.length === 0) {
      toast.error('No valid items to upload');
      return;
    }

    setUploadLoading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing stock updates...');

    try {
      // Prepare data for upload
      const updatesToProcess = await Promise.all(validItems.map(async item => {
        const token = localStorage.getItem('token');
        const itemResponse = await axios.get(
          BACKEND_API_URL+`/items/code/${item['Item Code']}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const itemData = itemResponse.data.data;

        const stockData = {
          quantity: parseInt(item['New Stock']),
          location: itemData.location,
          lowerLimit: itemData.lowerLimit,
          discount: itemData.discount
        };

        // Only include prices if price update is enabled
        if (updatePrices) {
          stockData.purchasePrice = parseFloat(item['Purchase Price']);
          stockData.retailPrice = parseFloat(item['Retail Price']);
        } else {
          // Keep existing prices
          stockData.purchasePrice = itemData.purchasePrice;
          stockData.retailPrice = itemData.retailPrice;
        }

        return {
          itemCode: item['Item Code'],
          stockData
        };
      }));

      setUploadStatus('Updating stock...');
      setUploadProgress(50);

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

      setUploadStatus('Generating report...');
      setUploadProgress(90);

      // Generate and download result Excel
      generateResultExcel(results);
      setUploadProgress(100);
      setUploadStatus('Update complete!');
      
      toast.success(`Successfully updated ${results.successful} items`);
      
      // Wait a moment then reset
      setTimeout(() => {
        resetUploadState();
        setShowBulkUpload(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(error.response?.data?.message || 'Failed to update stock');
      setUploadProgress(0);
      setUploadStatus('Update failed');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PageHeader 
        title="Add Stocks" 
        subtitle="Add new stock items to inventory"
        icon={FiPackage}
      />

      <div className="max-w-4xl mx-auto p-6">
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
            className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBulkUpload(true)}
                  title="Bulk Stock Update (Ctrl+U)"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  tabIndex="0"
                >
                  <FiUpload className="text-lg" />
                  <span>Bulk Update</span>
                </motion.button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Item Code with Search */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code / Barcode *
                  </label>
                  <div className="relative">
                    <input
                      ref={itemCodeInputRef}
                      type="text"
                      name="itemCode"
                      value={formData.itemCode}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter item code, barcode, or item name and press Enter or F3 to search"
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
                    onFocus={(e) => e.target.select()}
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
                    Barcode
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
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
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
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

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border-2 border-blue-200 shadow-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-blue-100">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiUpload className="text-green-600 mr-2" />
                  Bulk Stock Update
                </h3>
                <button
                  onClick={() => {
                    setShowBulkUpload(false);
                    resetUploadState();
                  }}
                  className="text-gray-600 hover:text-gray-800 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Close modal"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {!uploadedFile && !showPreview && (
                  <div className="space-y-6">
                    {/* Price Update Option */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-3">Update Options:</h5>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="updateOption"
                            checked={updatePrices}
                            onChange={() => handleUpdatePricesChange(true)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-blue-700">Update Stock + Prices</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="updateOption"
                            checked={!updatePrices}
                            onChange={() => handleUpdatePricesChange(false)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-blue-700">Update Stock Only</span>
                        </label>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        {updatePrices 
                          ? 'Both stock quantities and prices will be updated'
                          : 'Only stock quantities will be updated, prices will remain unchanged'
                        }
                      </p>
                    </div>

                    {/* File Upload Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        border-2 border-dashed rounded-lg p-8 text-center transition-colors
                        ${isDragOver 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                        }
                      `}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <FiFile className="text-4xl text-gray-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-700 mb-2">
                            {isDragOver ? 'Drop your Excel file here' : 'Upload Stock Update File'}
                          </h4>
                          <p className="text-sm text-gray-500 mb-4">
                            Drag and drop your Excel file here, or click to browse
                          </p>
                          <label className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
                            <FiUpload className="mr-2" />
                            Choose File
                            <input
                              ref={fileInputRef}
                              key={fileInputKey}
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="text-xs text-gray-400">
                          Supported formats: .xlsx, .xls (Max size: 10MB)
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h5 className="font-medium text-green-800 mb-2">Instructions:</h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Download the template first to see the required format</li>
                        <li>• Fill in all required fields: Item Code, New Stock{updatePrices ? ', Purchase Price, Retail Price' : ''}</li>
                        <li>• Item Code must be a valid existing item code</li>
                        <li>• New Stock{updatePrices ? ' and prices' : ''} should be positive numbers</li>
                        <li>• You can preview and validate data before updating</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadLoading && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{uploadStatus}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      />
                    </div>
                  </div>
                )}

                {/* File Preview and Validation */}
                {showPreview && !uploadLoading && (
                  <div className="space-y-6">
                    {/* File Info */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FiFile className="text-2xl text-green-600" />
                          <div>
                            <h4 className="font-medium text-gray-800">{uploadedFile?.name}</h4>
                            <p className="text-sm text-gray-500">
                              {(uploadedFile?.size / 1024).toFixed(1)} KB • {previewData.length} items
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={resetUploadState}
                          className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove file"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Validation Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center space-x-2">
                          <FiCheck className="text-green-600" />
                          <h5 className="font-medium text-green-800">Valid Items</h5>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{validItems.length}</p>
                        <p className="text-sm text-green-600">Ready to update</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="flex items-center space-x-2">
                          <FiX className="text-red-600" />
                          <h5 className="font-medium text-red-800">Items with Errors</h5>
                        </div>
                        <p className="text-2xl font-bold text-red-700">{invalidItems.length}</p>
                        <p className="text-sm text-red-600">Need to be fixed</p>
                      </div>
                    </div>

                    {/* Invalid Items */}
                    {invalidItems.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <h5 className="font-medium text-red-800 mb-3">Items with Errors:</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {invalidItems.slice(0, 5).map((item, index) => (
                            <div key={index} className="bg-white rounded p-3 border border-red-200">
                              <p className="font-medium text-red-700">
                                Row {item.rowIndex}: {item['Item Code'] || 'Unknown Item'}
                              </p>
                              <ul className="text-sm text-red-600 mt-1">
                                {item.errors.map((error, errIndex) => (
                                  <li key={errIndex}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {invalidItems.length > 5 && (
                            <p className="text-sm text-red-600 text-center">
                              ... and {invalidItems.length - 5} more items with errors
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Valid Items Preview */}
                    {validItems.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h5 className="font-medium text-green-800 mb-3">Valid Items Preview:</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-green-200">
                                <th className="text-left p-2">Item Code</th>
                                <th className="text-right p-2">New Stock</th>
                                {updatePrices && (
                                  <>
                                    <th className="text-right p-2">Purchase Price</th>
                                    <th className="text-right p-2">Retail Price</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {validItems.slice(0, 5).map((item, index) => (
                                <tr key={index} className="border-b border-green-100">
                                  <td className="p-2 font-medium">{item['Item Code']}</td>
                                  <td className="p-2 text-right">{item['New Stock']}</td>
                                  {updatePrices && (
                                    <>
                                      <td className="p-2 text-right">Rs. {Number(item['Purchase Price']).toFixed(2)}</td>
                                      <td className="p-2 text-right">Rs. {Number(item['Retail Price']).toFixed(2)}</td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {validItems.length > 5 && (
                            <p className="text-sm text-green-600 text-center mt-2">
                              ... and {validItems.length - 5} more valid items
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={resetUploadState}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Upload Different File
                      </button>
                      <button
                        onClick={confirmBulkUpload}
                        disabled={validItems.length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        <FiUpload />
                        <span>Update {validItems.length} Items</span>
                      </button>
                    </div>
                  </div>
                )}
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
    </div>
  );
};

export default AddStocks; 