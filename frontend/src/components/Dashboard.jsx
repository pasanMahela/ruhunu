import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiAlertTriangle, FiTag, FiDollarSign, FiUsers, FiTrendingUp, FiShoppingCart, FiClock, FiArrowRight, FiBarChart2, FiActivity } from 'react-icons/fi';
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
  Filler,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Loading from './Loading';
import api from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef(null);
  
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    categories: 0,
    todaySales: 0,
    totalSales: 0,
    totalCustomers: 0,
    inventoryValue: 0,
    todayTransactions: 0,
    todayItems: 0,
  });

  const [previousStats, setPreviousStats] = useState({
    todaySales: 0,
    totalSales: 0,
    todayTransactions: 0,
    todayItems: 0,
  });

  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [hourlyData, setHourlyData] = useState(null);
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
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Format currency like in AnalyticsDashboard
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate percentage change
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      const data = response.data;
      
      // Store previous stats for comparison
      setPreviousStats({
        todaySales: stats.todaySales,
        totalSales: stats.totalSales,
        todayTransactions: stats.todayTransactions,
        todayItems: stats.todayItems,
      });
      
      setStats(data.stats);
      setLowStockItems(data.lowStockItems);
      setRecentActivity(data.recentActivity);
      setSalesData(data.salesData);
      setTopSellingItems(data.topSellingItems);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    }
  };

  // Fetch hourly sales data
  const fetchHourlyData = async () => {
    try {
      const response = await api.get('/analytics/real-time-sales?period=today');
      setHourlyData(response.data.data);
    } catch (error) {
      console.error('Error fetching hourly data:', error);
      // Don't set error for this as it's not critical
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchHourlyData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Set up real-time updates every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchDashboardData();
      fetchHourlyData();
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Hourly Sales Chart Component
  const HourlySalesChart = () => {
    if (!hourlyData?.hourlySales) return null;

    const hours = Array.from({length: 24}, (_, i) => i);
    const salesByHour = hours.map(hour => {
      const hourData = hourlyData.hourlySales.find(h => h._id === hour);
      return hourData ? hourData.sales : 0;
    });

    const data = {
      labels: hours.map(h => `${h}:00`),
      datasets: [
        {
          label: 'Sales (LKR)',
          data: salesByHour,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
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
          beginAtZero: true,
          ticks: { 
            color: '#6b7280',
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
        },
        x: {
          ticks: { color: '#6b7280' },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
        },
      },
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Today's Hourly Sales</h3>
          <FiActivity className="w-5 h-5 text-blue-600" />
        </div>
        <div className="h-64">
          <Line data={data} options={options} />
        </div>
      </motion.div>
    );
  };

  // Enhanced Recent Transactions Component
  const EnhancedRecentTransactions = () => {
    if (!recentActivity || recentActivity.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          <div className="text-gray-600 text-center py-4">No recent transactions</div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
      >
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {recentActivity.slice(0, 5).map((transaction, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{transaction.customerName}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {formatCurrency(transaction.total)}
                </div>
                <div className="text-sm text-gray-500 uppercase">
                  {transaction.paymentMethod || 'CASH'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  // Performance Insights Component
  const PerformanceInsights = () => {
    const avgOrderValue = stats.todayTransactions > 0 ? stats.todaySales / stats.todayTransactions : 0;
    const stockTurnover = stats.totalItems > 0 ? (stats.todayItems / stats.totalItems) * 100 : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
      >
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Avg. Order Value</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(avgOrderValue)}</p>
              </div>
              <FiDollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Stock Turnover</p>
                <p className="text-lg font-bold text-green-800">{stockTurnover.toFixed(1)}%</p>
              </div>
              <FiTrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">📊 Quick Recommendations</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {lowStockItems.length > 0 && (
              <li>• {lowStockItems.length} items need restocking</li>
            )}
            {avgOrderValue < 1000 && (
              <li>• Consider upselling to increase average order value</li>
            )}
            {stats.todayTransactions < 10 && (
              <li>• Focus on customer acquisition today</li>
            )}
            <li>• <button 
                onClick={() => navigate('/analytics')} 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View detailed analytics
              </button> for deeper insights</li>
          </ul>
        </div>
      </motion.div>
    );
  };

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
        ticks: { 
          color: '#6b7280',
          callback: function(value) {
            return formatCurrency(value);
          }
        },
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
      case 'analytics':
        navigate('/analytics');
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
          <button 
            onClick={loadAllData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-transparent"
          >
            Dashboard
          </motion.h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/analytics')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiBarChart2 className="w-4 h-4 mr-2" />
              Analytics
            </motion.button>
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Today's Sales</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.todaySales)}</h3>
                <div className="flex items-center mt-2">
                  <span className="text-sm font-medium text-green-600">
                    {calculateChange(stats.todaySales, previousStats.todaySales)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs yesterday</span>
                </div>
              </div>
              <div className="text-3xl">💰</div>
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
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Transactions</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.todayTransactions || 0}</h3>
                <div className="flex items-center mt-2">
                  <span className="text-sm font-medium text-green-600">
                    {calculateChange(stats.todayTransactions || 0, previousStats.todayTransactions)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs yesterday</span>
                </div>
              </div>
              <div className="text-3xl">🛒</div>
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
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Items Sold</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.todayItems || 0}</h3>
                <div className="flex items-center mt-2">
                  <span className="text-sm font-medium text-green-600">
                    {calculateChange(stats.todayItems || 0, previousStats.todayItems)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs yesterday</span>
                </div>
              </div>
              <div className="text-3xl">📦</div>
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
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Inventory Value</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.inventoryValue)}</h3>
                <div className="flex items-center mt-2">
                  <span className="text-sm font-medium text-blue-600">
                    {stats.totalItems} items
                  </span>
                  <span className="text-sm text-gray-500 ml-2">in stock</span>
                </div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <HourlySalesChart />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Selling Items</h3>
            <div className="h-64">
              <Pie data={topSellingItems} options={topSellingChartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Enhanced Lower Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

          <EnhancedRecentTransactions />
        </div>

        {/* Performance Insights */}
        <PerformanceInsights />

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

        {/* Enhanced Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('analytics')}
              className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <FiBarChart2 className="w-5 h-5" />
              <span>Analytics</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard; 