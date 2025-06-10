import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiDownload, FiUpload, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CategoryModal from '../components/CategoryModal';
import * as XLSX from 'xlsx';
import { API_URL } from '../services/api';

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
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  useEffect(() => {
    fetchCategories();
  }, []);

  
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      discount: 0
    });
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
      ['3. Prices should be numbers with up to 2 decimal places'],
      ['4. Discount should be a number between 0 and 100'],
      ['5. Lower Limit should be a positive number']
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Generate and download file
    XLSX.writeFile(wb, 'item_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const validateItemData = (data) => {
    const errors = [];
    const requiredFields = ['Name', 'Category', 'Purchase Price', 'Retail Price'];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setValidationErrors([]);
    setUploadProgress(0);
    setUploadStatus('Reading file...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setUploadStatus('Processing data...');
          setUploadProgress(20);
          
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          setUploadStatus('Validating items...');
          setUploadProgress(40);

          // Validate all items
          const allErrors = [];
          jsonData.forEach((item, index) => {
            const errors = validateItemData(item);
            if (errors.length > 0) {
              allErrors.push({
                row: index + 2,
                errors,
                item: item['Name'] || 'Unknown Item'
              });
            }
          });

          if (allErrors.length > 0) {
            setValidationErrors(allErrors);
            setShowValidationModal(true);
            setUploadLoading(false);
            setUploadProgress(0);
            setUploadStatus('');
            return;
          }

          setUploadStatus('Preparing data for upload...');
          setUploadProgress(60);

          // If validation passes, prepare data for upload
          const itemsToAdd = jsonData.map(item => ({
            name: item['Name'],
            category: categories.find(c => c.name === item['Category'])?._id,
            description: item['Description'] || '',
            location: item['Location'] || '',
            lowerLimit: Number(item['Lower Limit']) || 0,
            purchasePrice: Number(item['Purchase Price']),
            retailPrice: Number(item['Retail Price']),
            discount: Number(item['Discount']) || 0
          }));

          setUploadStatus('Uploading items...');
          setUploadProgress(80);

          // Upload items
          const token = localStorage.getItem('token');
          const response = await axios.post(
            BACKEND_API_URL+'/bulk',
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
            setUploadStatus('Complete!');
            
            toast.success(`Successfully added ${response.data.data.successful} items`);
            setFileInputKey(Date.now());
            
            // Wait a moment to show 100% before navigating
            setTimeout(() => {
              setUploadLoading(false);
              navigate('/inventory');
            }, 1000);
          }
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Error processing file. Please check the format and try again.');
          setFileInputKey(Date.now());
          setUploadProgress(0);
          setUploadStatus('Error occurred');
          setUploadLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error reading file');
      setFileInputKey(Date.now());
      setUploadProgress(0);
      setUploadStatus('Error occurred');
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6">
      {loading || uploadLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center">
          {uploadLoading && (
            <div className="w-full max-w-md space-y-4 px-4">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>{uploadStatus}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
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
              className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full"
            />
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 bg-clip-text text-transparent">
                Add New Item
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-slate-300 text-sm font-medium mb-2"
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
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-slate-300 text-sm font-medium mb-2"
                  >
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                      className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <FiPlus size={20} />
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-slate-300 text-sm font-medium mb-2"
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lowerLimit"
                    className="block text-slate-300 text-sm font-medium mb-2"
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
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="purchasePrice"
                    className="block text-slate-300 text-sm font-medium mb-2"
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
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="retailPrice"
                    className="block text-slate-300 text-sm font-medium mb-2"
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
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="discount"
                    className="block text-slate-300 text-sm font-medium mb-2"
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
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-slate-300 text-sm font-medium mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Item
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
  );
};

export default AddNewItem; 