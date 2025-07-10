import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiPlus, 
  FiEdit, 
  FiEye, 
  FiUsers, 
  FiTrendingUp, 
  FiDollarSign,
  FiShoppingBag,
  FiCalendar,
  FiPhone,
  FiMail,
  FiMapPin,
  FiAward,
  FiFilter,
  FiDownload
} from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../services/api';
import Loading from '../components/Loading';

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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchAnalytics()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, searchTerm, filterType, filterStatus, sortBy]);

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
      }
    } catch (error) {
      toast.error('Failed to fetch customer details');
    }
  };

  // Get status badge color
  const getStatusBadge = (customer) => {
    const status = customer.customerStatus;
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
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
      vip: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || colors.regular;
  };

  if (loading) {
    return <Loading message="Loading customer data..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
          <p className="text-gray-600">Manage customers and analyze their purchase behavior</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: FiUsers },
                { id: 'customers', name: 'Customers', icon: FiUsers },
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
                    <FiUsers className="text-blue-600" size={24} />
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
                    <FiAward className="text-yellow-600" size={24} />
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
                <div className="md:col-span-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search by name, NIC, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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
                              {customer.customerStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-medium">Rs. {customer.totalSpent.toFixed(2)}</td>
                          <td className="py-4 px-6 text-center">{customer.purchaseCount}</td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => viewCustomer(customer._id)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="View Details"
                            >
                              <FiEye size={16} />
                            </button>
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

        {/* Customer Detail Modal */}
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
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Customer Details</h3>
                  <button
                    onClick={() => setShowCustomerModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Name:</span> {selectedCustomer.name}</div>
                        <div><span className="font-medium">NIC:</span> {selectedCustomer.nic}</div>
                        <div><span className="font-medium">Type:</span> 
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(selectedCustomer.customerType)}`}>
                            {selectedCustomer.customerType.toUpperCase()}
                          </span>
                        </div>
                        <div><span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCustomer)}`}>
                            {selectedCustomer.customerStatus.toUpperCase()}
                          </span>
                        </div>
                        {selectedCustomer.email && <div><span className="font-medium">Email:</span> {selectedCustomer.email}</div>}
                        {selectedCustomer.phone && <div><span className="font-medium">Phone:</span> {selectedCustomer.phone}</div>}
                        {selectedCustomer.age && <div><span className="font-medium">Age:</span> {selectedCustomer.age} years</div>}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Purchase Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Total Spent:</span> Rs. {selectedCustomer.totalSpent.toFixed(2)}</div>
                        <div><span className="font-medium">Total Purchases:</span> {selectedCustomer.purchaseCount}</div>
                        <div><span className="font-medium">Average Order:</span> Rs. {selectedCustomer.averagePurchaseAmount.toFixed(2)}</div>
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientManagement; 
 
 
 
 