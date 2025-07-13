import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiSearch, 
  FiCalendar, 
  FiEye, 
  FiTrash2, 
  FiPrinter, 
  FiRefreshCw,
  FiFileText,
  FiDollarSign
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import BillTemplate from '../components/BillTemplate';

const SearchPage = () => {
  const [searchCriteria, setSearchCriteria] = useState({
    date: '',
    billNumber: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [showBillDetails, setShowBillDetails] = useState(false);

  // Search for bills based on criteria
  const handleSearch = async () => {
    if (!searchCriteria.date && !searchCriteria.billNumber) {
      toast.error('Please enter a date or bill number to search');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCriteria.date) {
        params.append('date', searchCriteria.date);
      }
      if (searchCriteria.billNumber) {
        params.append('billNumber', searchCriteria.billNumber);
      }

      const response = await api.get(`/sales/search?${params}`);
      setSearchResults(response.data.data || []);
      
      if (response.data.data.length === 0) {
        toast.info('No bills found matching your search criteria');
      } else {
        toast.success(`Found ${response.data.data.length} bill(s)`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.message || 'Error searching bills');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Load recent bills on page load
  useEffect(() => {
    loadRecentBills();
  }, []);

  const loadRecentBills = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sales/recent?limit=20');
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error loading recent bills:', error);
    } finally {
      setLoading(false);
    }
  };

  // View bill details
  const handleViewBill = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      setSelectedBill(response.data.data);
      setShowBillDetails(true);
    } catch (error) {
      console.error('Error fetching bill details:', error);
      toast.error('Error loading bill details');
    }
  };

  // Delete bill confirmation
  const handleDeleteClick = (sale) => {
    setBillToDelete(sale);
    setShowDeleteConfirm(true);
  };

  // Delete bill
  const handleDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      await api.delete(`/sales/${billToDelete._id}`);
      toast.success('Bill deleted successfully');
      
      // Remove from results
      setSearchResults(prev => prev.filter(sale => sale._id !== billToDelete._id));
      
      setShowDeleteConfirm(false);
      setBillToDelete(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error(error.response?.data?.message || 'Error deleting bill');
    }
  };

  // Print bill
  const handlePrintBill = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      const billData = response.data.data;
      
      // Use the thermal printer optimized template
      BillTemplate.printThermalBill(billData);
    } catch (error) {
      console.error('Error printing bill:', error);
      toast.error('Error preparing bill for printing');
    }
  };



  // Handle input changes
  const handleInputChange = (field, value) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear search and show recent bills
  const handleClearSearch = () => {
    setSearchCriteria({ date: '', billNumber: '' });
    loadRecentBills();
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Find Bills" 
        subtitle="Search and manage sales transactions"
        icon={FiSearch}
      />

      <div className="p-6">
        {/* Search Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={searchCriteria.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Bill Number Input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiFileText className="inline mr-1" />
                Bill Number
              </label>
              <input
                type="text"
                placeholder="Enter bill number..."
                value={searchCriteria.billNumber}
                onChange={(e) => handleInputChange('billNumber', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <FiRefreshCw className="animate-spin" /> : <FiSearch />}
                Search Bills
              </button>
              
              <button
                onClick={handleClearSearch}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              >
                <FiRefreshCw />
                Recent
              </button>
            </div>
          </div>
        </motion.div>

        {/* Search Results */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-md"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Search Results ({searchResults.length})
            </h2>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <FiRefreshCw className="animate-spin text-2xl text-green-600 mr-2" />
                <span className="text-gray-600">Searching...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <FiFileText className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No bills found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try searching with different criteria or view recent bills
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Value
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.map((sale, index) => (
                    <motion.tr 
                      key={sale._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.billNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <FiDollarSign className="text-green-600 mr-1" />
                          Rs. {sale.totalAmount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewBill(sale._id)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-md transition-colors"
                            title="View Bill"
                          >
                            <FiEye />
                          </button>
                          <button
                            onClick={() => handlePrintBill(sale._id)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-md transition-colors"
                            title="Print Bill"
                          >
                            <FiPrinter />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sale)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-md transition-colors"
                            title="Delete Bill"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteBill}
            title="Delete Bill"
            message={`Are you sure you want to delete bill ${billToDelete?.billNumber}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
          />
        )}

        {/* Bill Details Modal */}
        {showBillDetails && selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Bill Details - {selectedBill.billNumber}
                  </h2>
                  <button
                    onClick={() => setShowBillDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Bill Information */}
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Transaction Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Date:</span> {new Date(selectedBill.createdAt).toLocaleString()}</p>
                      <p><span className="font-medium">Bill Number:</span> {selectedBill.billNumber}</p>
                      <p><span className="font-medium">Cashier:</span> {selectedBill.cashier?.name || selectedBill.cashier || 'System'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Customer Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedBill.customerName || 'Walk-in Customer'}</p>
                      {selectedBill.customerNIC && (
                        <p><span className="font-medium">NIC:</span> {selectedBill.customerNIC}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Code</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Unit Price</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBill.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm">{item.name}</td>
                            <td className="px-4 py-2 text-sm">{item.itemCode}</td>
                            <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">Rs. {item.price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right">Rs. {item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>Rs. {selectedBill.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedBill.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount:</span>
                          <span>- Rs. {selectedBill.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Amount:</span>
                        <span>Rs. {selectedBill.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span>Rs. {selectedBill.amountPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change:</span>
                        <span>Rs. {selectedBill.change.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => handlePrintBill(selectedBill._id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <FiPrinter />
                  Print
                </button>
                <button
                  onClick={() => setShowBillDetails(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage; 
 
 
 
 