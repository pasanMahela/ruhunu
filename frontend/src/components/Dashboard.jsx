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

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-300 rounded-full animate-spin border-t-transparent"></div>
    </div>
    <p className="text-slate-300 text-lg">Loading dashboard data...</p>
  </div>
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
          color: '#94a3b8',
        },
      },
    },
    scales: {
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' },
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' },
      },
    },
  };

  const topSellingChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <FiAlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 bg-clip-text text-transparent mb-8"
        >
          Dashboard
        </motion.h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Today's Sales</p>
                <h3 className="text-2xl font-bold text-slate-200 mt-1">Rs. {stats.todaySales.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-slate-300" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Sales</p>
                <h3 className="text-2xl font-bold text-slate-200 mt-1">Rs. {stats.totalSales.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <FiTrendingUp className="w-6 h-6 text-slate-300" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Customers</p>
                <h3 className="text-2xl font-bold text-slate-200 mt-1">{stats.totalCustomers}</h3>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <FiUsers className="w-6 h-6 text-slate-300" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Inventory Value</p>
                <h3 className="text-2xl font-bold text-slate-200 mt-1">Rs. {stats.inventoryValue.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <FiPackage className="w-6 h-6 text-slate-300" />
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
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-xl font-semibold text-slate-300 mb-4">Sales Trend</h3>
            <div className="h-80">
              <Line data={salesData} options={salesChartOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-xl font-semibold text-slate-300 mb-4">Top Selling Items</h3>
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
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-300">Low Stock Alerts</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-slate-400 hover:text-slate-300 flex items-center"
              >
                View All <FiArrowRight className="ml-1" />
              </motion.button>
            </div>
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                >
                  <div>
                    <p className="text-slate-200 font-medium">{item.name}</p>
                    <p className="text-slate-400 text-sm">{item.itemCode}</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.quantityInStock <= item.minStockLevel ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.quantityInStock} in stock
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-xl font-semibold text-slate-300 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded-lg"
                >
                  <div className="p-2 bg-slate-600/50 rounded-lg">
                    <FiClock className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-slate-200">{activity.customerName} - Rs. {activity.total.toFixed(2)}</p>
                    <p className="text-slate-400 text-sm">{new Date(activity.createdAt).toLocaleString()}</p>
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
          className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
        >
          <h3 className="text-xl font-semibold text-slate-300 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('new-sale')}
              className="p-4 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiShoppingCart className="w-5 h-5" />
              <span>New Sale</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('add-item')}
              className="p-4 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiPackage className="w-5 h-5" />
              <span>Add Item</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('reports')}
              className="p-4 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiTrendingUp className="w-5 h-5" />
              <span>Reports</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('users')}
              className="p-4 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center space-x-2"
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