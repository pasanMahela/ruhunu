import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiDownload, FiUpload, FiAlertCircle, FiPackage, FiFile, FiCheck, FiX, FiEye, FiTrash2 } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CategoryModal from '../components/CategoryModal';
import * as XLSX from 'xlsx';
import { API_URL } from '../services/api';
import PageHeader from '../components/PageHeader';

const generateResultExcel = (validationResults) => {
  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  // Successful Items Sheet
  if (validationResults.successfulItems.length > 0) {
    const successfulData = validationResults.successfulItems.map(item => ({
      'Item Name': item.name,
      'Item Code': item.itemCode,
      'Status': 'Successfully Added'
    }));
    const wsSuccess = XLSX.utils.json_to_sheet(successfulData);
    XLSX.utils.book_append_sheet(wb, wsSuccess, 'Successfully Added');
  }

  // Failed Items Sheet
  if (validationResults.failedItems.length > 0) {
    const failedData = validationResults.failedItems.map(item => ({
      'Item Name': item.item,
      'Error': item.error,
      'Status': 'Failed'
    }));
    const wsFailed = XLSX.utils.json_to_sheet(failedData);
    XLSX.utils.book_append_sheet(wb, wsFailed, 'Failed Items');
  }

  // Summary Sheet
  const summaryData = [
    ['Bulk Upload Summary'],
    ['Total Items Processed', validationResults.totalProcessed],
    ['Successfully Added', validationResults.successful],
    ['Failed Items', validationResults.failed],
    [''],
    ['Generated on', new Date().toLocaleString()]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Generate and download file
  XLSX.writeFile(wb, `bulk_upload_results_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const AddNewItem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const submitButtonRef = useRef(null);
  const nameInputRef = useRef(null);
  
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
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  
  // Bulk upload states
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [validItems, setValidItems] = useState([]);
  const [invalidItems, setInvalidItems] = useState([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    fetchCategories();
    
    // Focus the first input when component mounts
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    nameInputRef.current.select();
    }

    // Add keyboard shortcuts
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (submitButtonRef.current && !loading) {
          submitButtonRef.current.click();
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
      
      // Escape to cancel/navigate back
      if (e.key === 'Escape') {
        navigate('/inventory');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, navigate]);

  
  const BACKEND_API_URL = API_URL;

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL+'/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const fetchExistingItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL+'/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching existing items:', error);
      toast.error('Failed to fetch existing items for validation');
      return [];
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Enter key on form inputs
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      
      // Find the next focusable element
      const form = e.target.form;
      const formElements = Array.from(form.elements);
      const currentIndex = formElements.indexOf(e.target);
      const nextElement = formElements[currentIndex + 1];
      
      if (nextElement && nextElement.type !== 'submit') {
        nextElement.focus();
      } else if (submitButtonRef.current) {
        // If no next element or next is submit, focus submit button
        submitButtonRef.current.focus();
      }
    }
  };

  const resetForm = () => {
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
    
    // Focus the name input after reset
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    nameInputRef.current.select();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        BACKEND_API_URL+'/items',
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success(`Item created successfully with code: ${response.data.data.itemCode}`);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating item:', error);
      if (error.response?.data?.message?.includes('already exists')) {
        toast.error('An item with this name already exists');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create item');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        'Name': '',
        'Category': categories.map(c => c.name).join(', '), // List all categories
        'Barcode': '',
        'Description': '',
        'Location': '',
        'Lower Limit': '0',
        'Purchase Price': '0.00',
        'Retail Price': '0.00',
        'Discount': '0'
      }
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Add instructions sheet
    const instructions = [
      ['Instructions:'],
      ['1. Fields marked with * are required'],
      ['2. Category must be one of the following:'],
      ...categories.map(c => [c.name]),
      ['3. Barcode is optional but must be alphanumeric if provided'],
      ['4. Prices should be numbers with up to 2 decimal places'],
      ['5. Discount should be a number between 0 and 100'],
      ['6. Lower Limit should be a positive number']
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Generate and download file
    XLSX.writeFile(wb, 'item_import_template.xlsx');
    toast.success('Template downloaded successfully (Ctrl+T)');
  };

  const validateItemData = async (data, existingItems = []) => {
    const errors = [];
    const requiredFields = ['Name', 'Category', 'Purchase Price', 'Retail Price'];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Check if item name already exists in the system
    if (data['Name']) {
      const itemExists = existingItems.some(item => 
        item.name.toLowerCase() === data['Name'].toLowerCase()
      );
      if (itemExists) {
        errors.push(`Item with name "${data['Name']}" already exists in the system`);
      }
    }

    // Validate category
    if (data['Category'] && !categories.some(c => c.name === data['Category'])) {
      errors.push(`Invalid category: ${data['Category']}. Must be one of: ${categories.map(c => c.name).join(', ')}`);
    }

    // Validate prices
    if (data['Purchase Price'] && (isNaN(data['Purchase Price']) || data['Purchase Price'] < 0)) {
      errors.push('Purchase Price must be a positive number');
    }
    if (data['Retail Price'] && (isNaN(data['Retail Price']) || data['Retail Price'] < 0)) {
      errors.push('Retail Price must be a positive number');
    }

    // Validate discount
    if (data['Discount'] && (isNaN(data['Discount']) || data['Discount'] < 0 || data['Discount'] > 100)) {
      errors.push('Discount must be a number between 0 and 100');
    }

    // Validate lower limit
    if (data['Lower Limit'] && (isNaN(data['Lower Limit']) || data['Lower Limit'] < 0)) {
      errors.push('Lower Limit must be a positive number');
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
        setUploadProgress(20);
        
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setUploadStatus('Fetching existing items...');
        setUploadProgress(40);

        // Fetch existing items for validation
        const existingItems = await fetchExistingItems();

        setUploadStatus('Validating items...');
        setUploadProgress(60);

        // Validate and categorize items
        const valid = [];
        const invalid = [];
        const processedNames = new Set(); // Track names within the current upload
        
        for (let index = 0; index < jsonData.length; index++) {
          const item = jsonData[index];
          const errors = await validateItemData(item, existingItems);
          
          // Check for duplicates within the current upload
          if (item['Name'] && processedNames.has(item['Name'].toLowerCase())) {
            errors.push(`Duplicate item name within upload: "${item['Name']}"`);
          } else if (item['Name']) {
            processedNames.add(item['Name'].toLowerCase());
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
    setUploadStatus('Preparing upload...');

    try {
      // Prepare data for upload
      const itemsToAdd = validItems.map(item => ({
        name: item['Name'],
        category: categories.find(c => c.name === item['Category'])?._id,
        barcode: item['Barcode'] || '',
        description: item['Description'] || '',
        location: item['Location'] || '',
        lowerLimit: Number(item['Lower Limit']) || 0,
        purchasePrice: Number(item['Purchase Price']),
        retailPrice: Number(item['Retail Price']),
        discount: Number(item['Discount']) || 0
      }));

      setUploadStatus('Uploading items...');
      setUploadProgress(50);

      // Upload items
      const token = localStorage.getItem('token');
      const response = await axios.post(
        BACKEND_API_URL+'/items/bulk',
        { items: itemsToAdd },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setUploadStatus('Generating report...');
        setUploadProgress(90);
        
        // Generate and download result Excel
        generateResultExcel(response.data.data);
        setUploadProgress(100);
        setUploadStatus('Upload complete!');
        
        toast.success(`Successfully added ${response.data.data.successful} items`);
        
        // Wait a moment then reset
        setTimeout(() => {
          resetUploadState();
          setShowBulkUpload(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error uploading items:', error);
      toast.error(error.response?.data?.message || 'Failed to upload items');
      setUploadProgress(0);
      setUploadStatus('Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PageHeader 
        title="Add New Item" 
        subtitle="Create new inventory items"
        icon={FiPackage}
      />

      <div className="max-w-4xl mx-auto p-6">
        {loading || uploadLoading ? (
          <div className="min-h-screen flex flex-col items-center justify-center">
            {uploadLoading && (
              <div className="w-full max-w-md space-y-4 px-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                </div>
              </div>
            )}
            {loading && !uploadLoading && (
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
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-lg mb-6"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sm text-gray-600 mt-1">
                  Keyboard shortcuts: <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded">Ctrl+S</kbd> Save, 
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Ctrl+T</kbd> Template, 
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 rounded ml-1">Ctrl+U</kbd> Upload, 
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
                  title="Bulk Upload (Ctrl+U)"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  tabIndex="0"
                >
                  <FiUpload className="text-lg" />
                  <span>Bulk Upload</span>
                </motion.button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-gray-700 text-sm font-medium mb-2"
                  >
                    Name *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    onFocus={(e) => e.target.select()}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    tabIndex="1"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-gray-700 text-sm font-medium mb-2"
                  >
                    Category *
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      required
                      className="flex-1 px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="2"
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
                      title="Add new category"
                      className="px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      tabIndex="4"
                    >
                      <FiPlus size={20} />
                    </button>
                  </div>
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
                      onKeyPress={handleKeyPress}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter barcode (alphanumeric only)"
                      autoComplete="off"
                      className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="3"
                    />
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
                    onKeyPress={handleKeyPress}
                      onFocus={(e) => e.target.select()}
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="5"
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
                    onKeyPress={handleKeyPress}
                      onFocus={(e) => e.target.select()}
                    min="0"
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="6"
                  />
                </div>

                <div>
                  <label
                    htmlFor="purchasePrice"
                    className="block text-gray-700 text-sm font-medium mb-2"
                  >
                    Purchase Price *
                  </label>
                  <input
                    type="number"
                    id="purchasePrice"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                      onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    required
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="7"
                  />
                </div>

                <div>
                  <label
                    htmlFor="retailPrice"
                    className="block text-gray-700 text-sm font-medium mb-2"
                  >
                    Retail Price *
                  </label>
                  <input
                    type="number"
                    id="retailPrice"
                    name="retailPrice"
                    value={formData.retailPrice}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                      onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.01"
                    required
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="8"
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
                    onKeyPress={handleKeyPress}
                      onFocus={(e) => e.target.select()}
                    min="0"
                    max="100"
                    autoComplete="off"
                    className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      tabIndex="9"
                  />
                </div>
              </div>

              <div>
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
                  autoComplete="off"
                  className="w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  tabIndex="10"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  tabIndex="11"
                >
                  Cancel
                </motion.button>
                <motion.button
                  ref={submitButtonRef}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  tabIndex="12"
                >
                  Create Item
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
                      // Generate validation error Excel
                      const wb = XLSX.utils.book_new();
                      
                      // Validation Errors Sheet
                      const errorData = validationErrors.map(error => ({
                        'Row': error.row,
                        'Item': error.item,
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

                      // Download file
                      XLSX.writeFile(wb, `validation_errors_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                  <FiUpload className="text-blue-600 mr-2" />
                  Bulk Upload Items
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
                    {/* File Upload Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        border-2 border-dashed rounded-lg p-8 text-center transition-colors
                        ${isDragOver 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }
                      `}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <FiFile className="text-4xl text-gray-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-700 mb-2">
                            {isDragOver ? 'Drop your Excel file here' : 'Upload Excel File'}
                          </h4>
                          <p className="text-sm text-gray-500 mb-4">
                            Drag and drop your Excel file here, or click to browse
                          </p>
                          <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
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
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">Instructions:</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Download the template first to see the required format</li>
                        <li>• Fill in all required fields: Name, Category, Purchase Price, Retail Price</li>
                        <li>• Category must match one of the existing categories</li>
                        <li>• Prices should be positive numbers</li>
                        <li>• You can preview and validate data before uploading</li>
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
                        className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
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
                          <FiFile className="text-2xl text-blue-600" />
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
                        <p className="text-sm text-green-600">Ready to upload</p>
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
                                Row {item.rowIndex}: {item.Name || 'Unknown Item'}
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
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Category</th>
                                <th className="text-right p-2">Purchase Price</th>
                                <th className="text-right p-2">Retail Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validItems.slice(0, 5).map((item, index) => (
                                <tr key={index} className="border-b border-green-100">
                                  <td className="p-2 font-medium">{item.Name}</td>
                                  <td className="p-2">{item.Category}</td>
                                  <td className="p-2 text-right">Rs. {Number(item['Purchase Price']).toFixed(2)}</td>
                                  <td className="p-2 text-right">Rs. {Number(item['Retail Price']).toFixed(2)}</td>
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
                        <span>Upload {validItems.length} Items</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={() => {
            setIsCategoryModalOpen(false);
            fetchCategories();
            toast.success('Category added successfully');
          }}
        />
      </div>
    </div>
  );
};

export default AddNewItem; 