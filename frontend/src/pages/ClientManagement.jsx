import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiDownload, FiPrinter, FiUser, FiMail, FiPhone, FiMapPin, FiTrendingUp, FiCalendar, FiDollarSign, FiPackage, FiEye, FiFileText, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import * as XLSX from 'xlsx';

const ClientManagement = () => {
  const BACKEND_API_URL = API_URL;
  
  // State management
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalTab, setModalTab] = useState('details');
  const [expandedPurchases, setExpandedPurchases] = useState(new Set());

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        sortBy: sortBy
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('customerType', filterType);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await axios.get(
        `${BACKEND_API_URL}/customers?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setCustomers(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to fetch customers');
      console.error('Error fetching customers:', error);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/customers/analytics/overview`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Fetch customer purchases
  const fetchCustomerPurchases = async (customerId) => {
    setPurchasesLoading(true);
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/sales?customer=${customerId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setCustomerPurchases(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customer purchases:', error);
      toast.error('Failed to fetch customer purchases');
    } finally {
      setPurchasesLoading(false);
    }
  };

  // Initial data fetch and when filters/sort change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchAnalytics()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, filterType, filterStatus, sortBy]);

  // View customer details
  const viewCustomer = async (customerId) => {
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/customers/${customerId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setSelectedCustomer(response.data.data);
        setShowCustomerModal(true);
        setModalTab('details');
        setExpandedPurchases(new Set()); // Reset expanded purchases
        // Fetch purchases when modal opens
        fetchCustomerPurchases(customerId);
      }
    } catch (error) {
      toast.error('Failed to fetch customer details');
    }
  };

  // Download customer data as XLSX
  const downloadCustomerData = (customer, purchases) => {
    try {
      // Create customer details worksheet
      const customerData = [
        ['Customer Information', ''],
        ['Name', customer.name],
        ['NIC', customer.nic],
        ['Customer Number', customer.customerNumber || 'N/A'],
        ['Type', customer.customerType.toUpperCase()],
        ['Status', (customer.status || customer.customerStatus).toUpperCase()],
        ['Email', customer.email || 'N/A'],
        ['Phone', customer.phone || 'N/A'],
        ['Age', customer.age || 'N/A'],
        ['', ''],
        ['Purchase Statistics', ''],
        ['Total Spent', `Rs. ${customer.totalSpent.toFixed(2)}`],
        ['Total Purchases', customer.purchaseCount],
        ['Average Order Value', `Rs. ${customer.averagePurchaseAmount.toFixed(2)}`],
        ['Loyalty Points', customer.loyaltyPoints],
        ['First Purchase', customer.firstPurchaseDate ? new Date(customer.firstPurchaseDate).toLocaleDateString() : 'Never'],
        ['Last Purchase', customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'Never'],
        ['', ''],
        ['Address Information', ''],
        ['Street', customer.address?.street || 'N/A'],
        ['City', customer.address?.city || 'N/A'],
        ['District', customer.address?.district || 'N/A'],
        ['Postal Code', customer.address?.postalCode || 'N/A'],
        ['', ''],
        ['Notes', customer.notes || 'N/A']
      ];

      // Create purchases worksheet
      const purchaseData = [
        ['Bill Number', 'Date', 'Items', 'Subtotal', 'Total', 'Payment Method', 'Payment Status', 'Amount Paid', 'Balance']
      ];

      purchases.forEach(purchase => {
        purchaseData.push([
          purchase.billNumber || 'N/A',
          new Date(purchase.createdAt).toLocaleDateString(),
          purchase.items.length,
          `Rs. ${purchase.subtotal.toFixed(2)}`,
          `Rs. ${purchase.total.toFixed(2)}`,
          purchase.paymentMethod.toUpperCase(),
          purchase.paymentStatus.toUpperCase(),
          `Rs. ${purchase.amountPaid.toFixed(2)}`,
          `Rs. ${purchase.balance.toFixed(2)}`
        ]);
      });

      // Create detailed items worksheet
      const itemsData = [
        ['Bill Number', 'Date', 'Item Code', 'Item Name', 'Quantity', 'Unit Price', 'Discount %', 'Line Total']
      ];

      purchases.forEach(purchase => {
        purchase.items.forEach(item => {
          itemsData.push([
            purchase.billNumber || 'N/A',
            new Date(purchase.createdAt).toLocaleDateString(),
            item.itemCode,
            item.name,
            item.quantity,
            `Rs. ${item.price.toFixed(2)}`,
            `${item.discount}%`,
            `Rs. ${item.total.toFixed(2)}`
          ]);
        });
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add worksheets
      const wsCustomer = XLSX.utils.aoa_to_sheet(customerData);
      const wsPurchases = XLSX.utils.aoa_to_sheet(purchaseData);
      const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
      
      XLSX.utils.book_append_sheet(wb, wsCustomer, 'Customer Details');
      XLSX.utils.book_append_sheet(wb, wsPurchases, 'Purchase History');
      XLSX.utils.book_append_sheet(wb, wsItems, 'Item Details');

      // Save file
      const fileName = `Customer_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Customer data downloaded successfully');
    } catch (error) {
      console.error('Error downloading customer data:', error);
      toast.error('Failed to download customer data');
    }
  };

  // Download all customers data
  const downloadAllCustomersData = () => {
    try {
      const customersData = [
        ['Name', 'NIC', 'Customer Number', 'Type', 'Status', 'Email', 'Phone', 'Total Spent', 'Purchase Count', 'Average Order', 'Loyalty Points', 'First Purchase', 'Last Purchase', 'Created Date']
      ];

      customers.forEach(customer => {
        customersData.push([
          customer.name,
          customer.nic,
          customer.customerNumber || 'N/A',
          customer.customerType.toUpperCase(),
          (customer.status || customer.customerStatus).toUpperCase(),
          customer.email || 'N/A',
          customer.phone || 'N/A',
          `Rs. ${customer.totalSpent.toFixed(2)}`,
          customer.purchaseCount,
          `Rs. ${customer.averagePurchaseAmount.toFixed(2)}`,
          customer.loyaltyPoints,
          customer.firstPurchaseDate ? new Date(customer.firstPurchaseDate).toLocaleDateString() : 'Never',
          customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'Never',
          new Date(customer.createdAt).toLocaleDateString()
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, ws, 'All Customers');

      const fileName = `All_Customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('All customers data downloaded successfully');
    } catch (error) {
      console.error('Error downloading all customers data:', error);
      toast.error('Failed to download customers data');
    }
  };

  // Get status badge color
  const getStatusBadge = (customer) => {
    const status = customer.status || customer.customerStatus;
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      dormant: 'bg-red-100 text-red-800',
      new: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || colors.new;
  };

  // Get customer type badge color
  const getTypeBadge = (type) => {
    const colors = {
      regular: 'bg-gray-100 text-gray-800',
      wholesale: 'bg-purple-100 text-purple-800',
      vip: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800'
    };
    return colors[type] || colors.regular;
  };

  // Handle search button click
  const handleSearchClick = () => {
    fetchCustomers();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Toggle expanded purchase details
  const togglePurchaseExpansion = (purchaseId) => {
    const newExpanded = new Set(expandedPurchases);
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId);
    } else {
      newExpanded.add(purchaseId);
    }
    setExpandedPurchases(newExpanded);
  };

  // Update customer status
  const updateCustomerStatus = async (customerId, newStatus) => {
    try {
      const response = await axios.patch(
        `${BACKEND_API_URL}/customers/${customerId}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        toast.success(`Customer status updated to ${newStatus}`);
        
        // Update the customer in the list
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer._id === customerId 
              ? { ...customer, status: newStatus }
              : customer
          )
        );
        
        // Update selected customer if it's the same one
        if (selectedCustomer && selectedCustomer._id === customerId) {
          setSelectedCustomer(prev => ({ ...prev, status: newStatus }));
        }
        
        // Refresh the data
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error updating customer status:', error);
      toast.error(error.response?.data?.message || 'Failed to update customer status');
    }
  };

  if (loading) {
    return <Loading message="Loading customer data..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PageHeader 
        title="Client Management" 
        subtitle="Manage customers and analyze their purchase behavior"
        icon={FiUser}
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: FiUser },
                { id: 'customers', name: 'Customers', icon: FiUser },
                { id: 'analytics', name: 'Analytics', icon: FiTrendingUp }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="mr-2" size={16} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100">
                    <FiUser className="text-blue-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalCustomers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-green-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100">
                    <FiTrendingUp className="text-green-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.activeCustomers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-purple-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100">
                    <FiDollarSign className="text-purple-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">Rs. {analytics.overview.totalSpent?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-yellow-200 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100">
                    <FiDollarSign className="text-yellow-600" size={24} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg. Per Customer</p>
                    <p className="text-2xl font-bold text-gray-900">Rs. {analytics.overview.averageSpentPerCustomer?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Customers */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800">Recent Customers</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-medium text-gray-700">Customer</th>
                        <th className="text-left py-3 font-medium text-gray-700">Type</th>
                        <th className="text-right py-3 font-medium text-gray-700">Total Spent</th>
                        <th className="text-center py-3 font-medium text-gray-700">Purchases</th>
                        <th className="text-left py-3 font-medium text-gray-700">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recentCustomers?.map((customer) => (
                        <tr key={customer._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3">
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.nic}</div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(customer.customerType)}`}>
                              {customer.customerType.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium">Rs. {customer.totalSpent.toFixed(2)}</td>
                          <td className="py-3 text-center">{customer.purchaseCount}</td>
                          <td className="py-3 text-sm text-gray-600">
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 flex gap-2">
                  <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by name, NIC, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSearchClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Search
                  </button>
                </div>
                
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="regular">Regular</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="vip">VIP</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="dormant">Dormant</option>
                    <option value="new">New</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Customers ({customers.length})</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={downloadAllCustomersData}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <FiDownload className="mr-2" size={16} />
                    Download All
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="totalSpent:desc">Highest Spender</option>
                    <option value="purchaseCount:desc">Most Purchases</option>
                    <option value="name:asc">Name A-Z</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-6 font-medium text-gray-700">Customer</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700">Contact</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700">Type</th>
                      <th className="text-center py-3 px-6 font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-6 font-medium text-gray-700">Total Spent</th>
                      <th className="text-center py-3 px-6 font-medium text-gray-700">Purchases</th>
                      <th className="text-center py-3 px-6 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {customers.map((customer) => (
                        <motion.tr
                          key={customer._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.nic}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-sm">
                              {customer.email && (
                                <div className="flex items-center text-gray-600">
                                  <FiMail size={14} className="mr-1" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-gray-600">
                                  <FiPhone size={14} className="mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(customer.customerType)}`}>
                              {customer.customerType.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(customer)}`}>
                                      {(customer.status || customer.customerStatus).toUpperCase()}
                                    </span>
                          </td>
                          <td className="py-4 px-6 text-right font-medium">Rs. {customer.totalSpent.toFixed(2)}</td>
                          <td className="py-4 px-6 text-center">{customer.purchaseCount}</td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => viewCustomer(customer._id)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                title="View Details & Purchases"
                              >
                                <FiEye size={16} />
                              </button>
                              <button
                                onClick={() => downloadCustomerData(customer, [])}
                                className="text-green-600 hover:text-green-800 p-1 rounded"
                                title="Download Customer Data"
                              >
                                <FiDownload size={16} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Type Distribution */}
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Type Distribution</h3>
                <div className="space-y-3">
                  {analytics.customerTypeDistribution?.map((item) => (
                    <div key={item._id} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item._id}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(item.count / analytics.overview.totalCustomers) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Status Distribution */}
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Status Distribution</h3>
                <div className="space-y-3">
                  {analytics.statusDistribution?.map((item) => (
                    <div key={item._id} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item._id}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(item.count / analytics.overview.totalCustomers) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800">Top Customers by Revenue</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-medium text-gray-700">Rank</th>
                        <th className="text-left py-3 font-medium text-gray-700">Customer</th>
                        <th className="text-left py-3 font-medium text-gray-700">Type</th>
                        <th className="text-right py-3 font-medium text-gray-700">Total Spent</th>
                        <th className="text-center py-3 font-medium text-gray-700">Purchases</th>
                        <th className="text-right py-3 font-medium text-gray-700">Avg. Order</th>
                        <th className="text-left py-3 font-medium text-gray-700">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topCustomers?.map((customer, index) => (
                        <tr key={customer._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-bold text-blue-600">#{index + 1}</td>
                          <td className="py-3">
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.nic}</div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(customer.customerType)}`}>
                              {customer.customerType.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-green-600">Rs. {customer.totalSpent.toFixed(2)}</td>
                          <td className="py-3 text-center">{customer.purchaseCount}</td>
                          <td className="py-3 text-right">Rs. {customer.purchaseCount > 0 ? (customer.totalSpent / customer.purchaseCount).toFixed(2) : '0.00'}</td>
                          <td className="py-3 text-sm text-gray-600">
                            {customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Customer Detail Modal */}
        <AnimatePresence>
          {showCustomerModal && selectedCustomer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCustomerModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Customer Details - {selectedCustomer.name}</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => downloadCustomerData(selectedCustomer, customerPurchases)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <FiDownload className="mr-2" size={16} />
                      Download
                    </button>
                    <button
                      onClick={() => setShowCustomerModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'details', name: 'Customer Details', icon: FiUser },
                      { id: 'purchases', name: 'Purchase History', icon: FiPackage }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setModalTab(tab.id)}
                          className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                            modalTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="mr-2" size={16} />
                          {tab.name}
                        </button>
                      );
                    })}
                  </nav>
                </div>
                
                <div className="p-6">
                  {modalTab === 'details' && (
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">Personal Information</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Name:</span> {selectedCustomer.name}</div>
                            <div><span className="font-medium">NIC:</span> {selectedCustomer.nic}</div>
                            <div><span className="font-medium">Customer Number:</span> {selectedCustomer.customerNumber || 'N/A'}</div>
                            <div><span className="font-medium">Type:</span> 
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(selectedCustomer.customerType)}`}>
                                {selectedCustomer.customerType.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium">Status:</span> 
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCustomer)}`}>
                                {(selectedCustomer.status || selectedCustomer.customerStatus).toUpperCase()}
                              </span>
                              <select
                                value={selectedCustomer.status || selectedCustomer.customerStatus}
                                onChange={(e) => updateCustomerStatus(selectedCustomer._id, e.target.value)}
                                className="ml-2 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="banned">Banned</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </div>
                            {selectedCustomer.email && <div><span className="font-medium">Email:</span> {selectedCustomer.email}</div>}
                            {selectedCustomer.phone && <div><span className="font-medium">Phone:</span> {selectedCustomer.phone}</div>}
                            {selectedCustomer.age && <div><span className="font-medium">Age:</span> {selectedCustomer.age} years</div>}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">Purchase Statistics</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Total Spent:</span> {formatCurrency(selectedCustomer.totalSpent)}</div>
                            <div><span className="font-medium">Total Purchases:</span> {selectedCustomer.purchaseCount}</div>
                            <div><span className="font-medium">Average Order:</span> {formatCurrency(selectedCustomer.averagePurchaseAmount)}</div>
                            <div><span className="font-medium">Loyalty Points:</span> {selectedCustomer.loyaltyPoints}</div>
                            <div><span className="font-medium">First Purchase:</span> 
                              {selectedCustomer.firstPurchaseDate ? new Date(selectedCustomer.firstPurchaseDate).toLocaleDateString() : 'Never'}
                            </div>
                            <div><span className="font-medium">Last Purchase:</span> 
                              {selectedCustomer.lastPurchaseDate ? new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString() : 'Never'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      {(selectedCustomer.address?.street || selectedCustomer.address?.city) && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">Address</h4>
                          <div className="text-sm text-gray-600">
                            {selectedCustomer.address.street && <div>{selectedCustomer.address.street}</div>}
                            {selectedCustomer.address.city && <div>{selectedCustomer.address.city}</div>}
                            {selectedCustomer.address.district && <div>{selectedCustomer.address.district}</div>}
                            {selectedCustomer.address.postalCode && <div>{selectedCustomer.address.postalCode}</div>}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {selectedCustomer.notes && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">Notes</h4>
                          <p className="text-sm text-gray-600">{selectedCustomer.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {modalTab === 'purchases' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-800">Purchase History ({customerPurchases.length} purchases)</h4>
                        {customerPurchases.length > 0 && (
                          <button
                            onClick={() => downloadCustomerData(selectedCustomer, customerPurchases)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <FiFileText className="mr-2" size={16} />
                            Export Purchases
                          </button>
                        )}
                      </div>

                      {purchasesLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : customerPurchases.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border border-gray-200">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-medium text-gray-700 w-8"></th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700">Bill #</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700">Date & Time</th>
                                <th className="text-center py-3 px-4 font-medium text-gray-700">Items</th>
                                <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700">Payment</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customerPurchases.map((purchase) => (
                                <React.Fragment key={purchase._id}>
                                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                      <button
                                        onClick={() => togglePurchaseExpansion(purchase._id)}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                      >
                                        {expandedPurchases.has(purchase._id) ? (
                                          <FiChevronDown size={16} />
                                        ) : (
                                          <FiChevronRight size={16} />
                                        )}
                                      </button>
                                    </td>
                                    <td className="py-3 px-4 font-medium text-blue-600">{purchase.billNumber}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                      <div>{new Date(purchase.createdAt).toLocaleDateString()}</div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(purchase.createdAt).toLocaleTimeString()}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {purchase.items.length} items
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(purchase.total)}</td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {purchase.paymentMethod.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        purchase.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {purchase.paymentStatus.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                  {expandedPurchases.has(purchase._id) && (
                                    <tr className="bg-gray-50">
                                      <td colSpan="7" className="py-4 px-4">
                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                          <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                            <FiPackage className="mr-2" size={16} />
                                            Purchased Items
                                          </h5>
                                          <div className="overflow-x-auto">
                                            <table className="w-full">
                                              <thead>
                                                <tr className="border-b border-gray-200">
                                                  <th className="text-left py-2 px-3 font-medium text-gray-600 text-sm">Item Code</th>
                                                  <th className="text-left py-2 px-3 font-medium text-gray-600 text-sm">Item Name</th>
                                                  <th className="text-center py-2 px-3 font-medium text-gray-600 text-sm">Qty</th>
                                                  <th className="text-right py-2 px-3 font-medium text-gray-600 text-sm">Unit Price</th>
                                                  <th className="text-center py-2 px-3 font-medium text-gray-600 text-sm">Discount</th>
                                                  <th className="text-right py-2 px-3 font-medium text-gray-600 text-sm">Total</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {purchase.items.map((item, index) => (
                                                  <tr key={index} className="border-b border-gray-100 last:border-b-0">
                                                    <td className="py-2 px-3 text-sm font-mono text-gray-700">{item.itemCode}</td>
                                                    <td className="py-2 px-3 text-sm text-gray-800">{item.name}</td>
                                                    <td className="py-2 px-3 text-center text-sm text-gray-700">{item.quantity}</td>
                                                    <td className="py-2 px-3 text-right text-sm text-gray-700">{formatCurrency(item.price)}</td>
                                                    <td className="py-2 px-3 text-center text-sm text-gray-700">
                                                      {item.discount > 0 ? `${item.discount}%` : '-'}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-sm font-medium text-gray-800">{formatCurrency(item.total)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                          <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                              <span className="font-medium text-gray-600">Subtotal:</span>
                                              <div className="font-semibold text-gray-800">{formatCurrency(purchase.subtotal)}</div>
                                            </div>
                                            {purchase.tax > 0 && (
                                              <div>
                                                <span className="font-medium text-gray-600">Tax:</span>
                                                <div className="font-semibold text-gray-800">{formatCurrency(purchase.tax)}</div>
                                              </div>
                                            )}
                                            <div>
                                              <span className="font-medium text-gray-600">Amount Paid:</span>
                                              <div className="font-semibold text-green-600">{formatCurrency(purchase.amountPaid)}</div>
                                            </div>
                                            {purchase.balance !== 0 && (
                                              <div>
                                                <span className="font-medium text-gray-600">Balance:</span>
                                                <div className={`font-semibold ${purchase.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                  {formatCurrency(Math.abs(purchase.balance))} {purchase.balance > 0 ? '(Due)' : '(Change)'}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FiPackage size={48} className="mx-auto mb-4 text-gray-300" />
                          <p>No purchases found for this customer</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientManagement; 
 
 
 
 