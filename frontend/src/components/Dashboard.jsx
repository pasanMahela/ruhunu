import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiAlertTriangle, FiTag, FiDollarSign, FiUsers, FiTrendingUp, FiShoppingCart, FiClock, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Loading from './Loading';
import { API_URL } from '../services/api';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);



const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    categories: 0,
    todaySales: 0,
    totalSales: 0,
    totalCustomers: 0,
    inventoryValue: 0,
  });


  const BACKEND_API_URL = API_URL;  

  
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [salesData, setSalesData] = useState({
    labels: [],
    datasets: [{
      label: 'Daily Sales',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  });
  const [topSellingItems, setTopSellingItems] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(153, 102, 255)'
      ]
    }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllLowStock, setShowAllLowStock] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(BACKEND_API_URL+'/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setStats(data.stats);
        setLowStockItems(data.lowStockItems);
        setRecentActivity(data.recentActivity);
        setSalesData(data.salesData);
        setTopSellingItems(data.topSellingItems);
        setError(null);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const salesChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4b5563',
        },
      },
    },
    scales: {
      y: {
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
      },
      x: {
        ticks: { color: '#6b7280' },
        grid: { color: '#e5e7eb' },
      },
    },
  };

  const topSellingChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4b5563',
        },
      },
    },
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-sale':
        navigate('/pos');
        break;
      case 'add-item':
        navigate('/add-new-item');
        break;
      case 'reports':
        navigate('/sales-history');
        break;
      case 'users':
        navigate('/users');
        break;
      default:
        break;
    }
  };

  // Filtered low stock items
  const filteredLowStockItems = lowStockItems.filter(item => item.quantityInStock <= (item.lowerLimit ?? item.minStockLevel));

  if (loading) {
    return <Loading message="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <FiAlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  console.log('DEBUG: lowStockItems', lowStockItems);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-transparent mb-8"
        >
          Dashboard
        </motion.h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Today's Sales</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">Rs. {stats.todaySales.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Sales</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">Rs. {stats.totalSales.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiTrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Customers</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalCustomers}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Inventory Value</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">Rs. {stats.inventoryValue.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiPackage className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Sales Trend</h3>
            <div className="h-80">
              <Line data={salesData} options={salesChartOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Selling Items</h3>
            <div className="h-80">
              <Pie data={topSellingItems} options={topSellingChartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Low Stock Alerts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Low Stock Alerts</h3>
              {filteredLowStockItems.length > 3 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                  onClick={() => setShowAllLowStock(true)}
                >
                  View All <FiArrowRight className="ml-1" />
                </motion.button>
              )}
            </div>
            <div className="space-y-4">
              {filteredLowStockItems.slice(0, 3).map((item) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <div>
                    <p className="text-gray-800 font-medium">{item.name}</p>
                    <p className="text-gray-600 text-sm">{item.itemCode}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.quantityInStock <= (item.lowerLimit ?? item.minStockLevel) ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {item.quantityInStock} in stock
                    </span>
                  </div>
                </motion.div>
              ))}
              {filteredLowStockItems.length === 0 && (
                <div className="text-gray-600 text-center py-4">No low stock items</div>
              )}
            </div>
          </motion.div>

          {/* Modal for all low stock items */}
          {showAllLowStock && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
              <div className="bg-white rounded-lg p-8 w-full max-w-3xl mx-4 border-2 border-blue-200 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-semibold text-gray-800">All Low Stock Items</h3>
                  <button
                    onClick={() => setShowAllLowStock(false)}
                    className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {filteredLowStockItems.map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div>
                        <p className="text-gray-800 font-medium text-lg">{item.name}</p>
                        <p className="text-gray-600 text-sm">{item.itemCode}</p>
                      </div>
                      <div className="flex items-center">
                        <span className={`px-3 py-2 rounded-full text-sm font-medium ${
                          item.quantityInStock <= (item.lowerLimit ?? item.minStockLevel) ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {item.quantityInStock} in stock
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredLowStockItems.length === 0 && (
                    <div className="text-gray-600 text-center py-4">No low stock items</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiClock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-800">{activity.customerName} - Rs. {activity.total.toFixed(2)}</p>
                    <p className="text-gray-600 text-sm">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('new-sale')}
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiShoppingCart className="w-5 h-5" />
              <span>New Sale</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('add-item')}
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiPackage className="w-5 h-5" />
              <span>Add Item</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('reports')}
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiTrendingUp className="w-5 h-5" />
              <span>Reports</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('users')}
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiUsers className="w-5 h-5" />
              <span>Users</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard; 