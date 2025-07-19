import React, { useState, useEffect, useRef } from 'react';
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
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { FiBarChart2 } from 'react-icons/fi';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

// Register Chart.js components
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

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  // Data states
  const [realTimeData, setRealTimeData] = useState(null);
  const [profitLossData, setProfitLossData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [peakHoursData, setPeakHoursData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [yesterdayData, setYesterdayData] = useState(null);

  // Fetch yesterday's data for comparison
  const fetchYesterdayData = async () => {
    try {
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const response = await api.get(`/analytics/dashboard-summary?date=${yesterdayStr}`);
      setYesterdayData(response.data.data);
    } catch (error) {
      console.error('Error fetching yesterday data:', error);
      // Don't set error state as this is optional data
    }
  };

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, type: 'neutral' };
    
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
      sign: change > 0 ? '+' : change < 0 ? '-' : ''
    };
  };

  // Format percentage change
  const formatPercentageChange = (current, previous) => {
    const change = calculatePercentageChange(current, previous);
    if (change.type === 'neutral') return { text: '0%', type: 'neutral' };
    
    return {
      text: `${change.sign}${change.value.toFixed(1)}%`,
      type: change.type
    };
  };

  // Fetch real-time sales data
  const fetchRealTimeData = async (period = timePeriod) => {
    try {
      const response = await api.get(`/analytics/real-time-sales?period=${period}`);
      setRealTimeData(response.data.data);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      setError('Failed to load real-time sales data');
    }
  };

  // Fetch profit/loss analysis
  const fetchProfitLossData = async (period = timePeriod) => {
    try {
      // Choose appropriate groupBy based on period
      let groupBy = 'day';
      switch (period) {
        case 'today':
          groupBy = 'hour';
          break;
        case 'week':
          groupBy = 'day';
          break;
        case 'month':
          groupBy = 'day';
          break;
        case 'quarter':
          groupBy = 'week';
          break;
        default:
          groupBy = 'day';
      }
      
      const response = await api.get(`/analytics/profit-loss?period=${period}&groupBy=${groupBy}`);
      setProfitLossData(response.data.data);
    } catch (error) {
      console.error('Error fetching profit/loss data:', error);
      setError('Failed to load profit/loss data');
    }
  };

  // Fetch customer behavior data
  const fetchCustomerData = async (period = timePeriod) => {
    try {
      const response = await api.get(`/analytics/customer-behavior?period=${period}`);
      setCustomerData(response.data.data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setError('Failed to load customer behavior data');
    }
  };

  // Fetch peak hours data
  const fetchPeakHoursData = async (period = timePeriod) => {
    try {
      const response = await api.get(`/analytics/peak-hours?period=${period}`);
      setPeakHoursData(response.data.data);
    } catch (error) {
      console.error('Error fetching peak hours data:', error);
      setError('Failed to load peak hours data');
    }
  };

  // Fetch dashboard summary
  const fetchDashboardSummary = async () => {
    try {
      const response = await api.get('/analytics/dashboard-summary');
      setDashboardSummary(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      setError('Failed to load dashboard summary');
    }
  };

  // Load all data
  const loadAllData = async (period = timePeriod) => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([
        fetchRealTimeData(period),
        fetchProfitLossData(period),
        fetchCustomerData(period),
        fetchPeakHoursData(period),
        fetchDashboardSummary(),
        fetchYesterdayData()
      ]);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Handle period change
  const handlePeriodChange = (newPeriod) => {
    setTimePeriod(newPeriod);
    loadAllData(newPeriod);
  };

  // Real-time updates
  useEffect(() => {
    loadAllData();

    // Set up real-time updates every 30 seconds for real-time data
    intervalRef.current = setInterval(() => {
      if (activeTab === 'overview' || activeTab === 'realtime') {
        fetchRealTimeData();
        fetchDashboardSummary();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Summary Cards Component
  const SummaryCards = () => {
    if (!dashboardSummary) return null;

    const cards = [
      {
        title: `${timePeriod === 'today' ? "Today's" : timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Sales`,
        value: formatCurrency(dashboardSummary.today.sales),
        change: formatPercentageChange(dashboardSummary.today.sales, yesterdayData?.today.sales).text,
        changeType: formatPercentageChange(dashboardSummary.today.sales, yesterdayData?.today.sales).type,
        icon: "💰",
        color: "bg-blue-500"
      },
      {
        title: "Transactions",
        value: dashboardSummary.today.transactions.toString(),
        change: formatPercentageChange(dashboardSummary.today.transactions, yesterdayData?.today.transactions).text,
        changeType: formatPercentageChange(dashboardSummary.today.transactions, yesterdayData?.today.transactions).type,
        icon: "🛒",
        color: "bg-green-500"
      },
      {
        title: "Items Sold",
        value: dashboardSummary.today.items.toString(),
        change: formatPercentageChange(dashboardSummary.today.items, yesterdayData?.today.items).text,
        changeType: formatPercentageChange(dashboardSummary.today.items, yesterdayData?.today.items).type,
        icon: "📦",
        color: "bg-purple-500"
      },
      {
        title: "Avg. Order Value",
        value: formatCurrency(dashboardSummary.today.sales / (dashboardSummary.today.transactions || 1)),
        change: formatPercentageChange(dashboardSummary.today.sales / (dashboardSummary.today.transactions || 1), yesterdayData?.today.sales / (yesterdayData?.today.transactions || 1)).text,
        changeType: formatPercentageChange(dashboardSummary.today.sales / (dashboardSummary.today.transactions || 1), yesterdayData?.today.sales / (yesterdayData?.today.transactions || 1)).type,
        icon: "📊",
        color: "bg-orange-500"
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {card.value}
                </p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    card.changeType === 'increase' ? 'text-green-600' : 
                    card.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {card.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs yesterday</span>
                </div>
              </div>
              <div className="text-3xl">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Real-time Sales Chart
  const RealTimeSalesChart = () => {
    if (!realTimeData?.hourlySales) return null;

    const hours = Array.from({length: 24}, (_, i) => i);
    const salesByHour = hours.map(hour => {
      const hourData = realTimeData.hourlySales.find(h => h._id === hour);
      return hourData ? hourData.sales : 0;
    });

    const data = {
      labels: hours.map(h => `${h}:00`),
      datasets: [
        {
          label: 'Sales',
          data: salesByHour,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Sales Today</h3>
        <div className="h-80">
          <Line data={data} options={chartOptions} />
        </div>
      </div>
    );
  };

  // Profit/Loss Chart
  const ProfitLossChart = () => {
    if (!profitLossData?.profitLossData) return null;

    // Dynamic title based on current period
    const getChartTitle = () => {
      switch (timePeriod) {
        case 'today':
          return 'Hourly Profit & Loss (Today)';
        case 'week':
          return 'Daily Profit & Loss (Last 7 Days)';
        case 'month':
          return 'Daily Profit & Loss (This Month)';
        case 'quarter':
          return 'Weekly Profit & Loss (This Quarter)';
        default:
          return 'Profit & Loss Analysis';
      }
    };

    // Check if we have data
    if (profitLossData.profitLossData.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{getChartTitle()}</h3>
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <p>No profit & loss data available for {timePeriod === 'today' ? 'today' : `this ${timePeriod}`}</p>
            </div>
          </div>
        </div>
      );
    }

    const data = {
      labels: profitLossData.profitLossData.map(item => {
        // Handle different groupBy formats
        if (item._id.hour !== undefined) {
          // Hourly format (for today)
          return `${item._id.hour}:00`;
        } else if (item._id.week !== undefined) {
          // Weekly format (for quarter)
          return `Week ${item._id.week}`;
        } else if (item._id.day !== undefined) {
          // Daily format (for week/month)
          return `${item._id.day}/${item._id.month}`;
        } else if (item._id.month !== undefined) {
          // Monthly format (for year)
          return `${item._id.month}/${item._id.year}`;
        }
        // Fallback
        return 'Unknown';
      }),
      datasets: [
        {
          label: 'Revenue',
          data: profitLossData.profitLossData.map(item => item.revenue),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: 'Cost',
          data: profitLossData.profitLossData.map(item => item.cost),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
        {
          label: 'Profit',
          data: profitLossData.profitLossData.map(item => item.profit),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
      ],
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{getChartTitle()}</h3>
        <div className="h-80">
          <Bar data={data} options={chartOptions} />
        </div>
      </div>
    );
  };

  // Customer Behavior Chart
  const CustomerBehaviorChart = () => {
    if (!customerData?.paymentMethodStats) return null;

    const data = {
      labels: customerData.paymentMethodStats.map(method => method._id.toUpperCase()),
      datasets: [
        {
          data: customerData.paymentMethodStats.map(method => method.count),
          backgroundColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#F97316',
          ],
        },
      ],
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <div className="h-80">
          <Doughnut data={data} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
              },
            },
          }} />
        </div>
      </div>
    );
  };

  // Peak Hours Analysis
  const PeakHoursChart = () => {
    if (!peakHoursData?.hourlyAnalysis) return null;

    const data = {
      labels: peakHoursData.hourlyAnalysis.map(hour => `${hour.hour}:00`),
      datasets: [
        {
          label: 'Transactions',
          data: peakHoursData.hourlyAnalysis.map(hour => hour.transactions),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
      ],
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours Analysis</h3>
        <div className="h-80">
          <Bar data={data} options={chartOptions} />
        </div>
        
        {peakHoursData.recommendations && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {peakHoursData.recommendations.staffOptimization}</li>
              <li>• {peakHoursData.recommendations.busyDays}</li>
              <li>• Quiet periods: {peakHoursData.recommendations.quietPeriods?.join(', ')}</li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Top Customers Table
  const TopCustomersTable = () => {
    if (!customerData?.customerFrequency) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Order
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customerData.customerFrequency.slice(0, 10).map((customer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.customerName || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {customer.customerNic || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.totalPurchases}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(customer.averageOrderValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Recent Transactions
  const RecentTransactions = () => {
    if (!realTimeData?.recentTransactions) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {realTimeData.recentTransactions.map((transaction, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{transaction.billNumber}</div>
                <div className="text-sm text-gray-500">
                  {transaction.customerName} • {transaction.cashier?.name || 'System'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {formatCurrency(transaction.total)}
                </div>
                <div className="text-sm text-gray-500">
                  {transaction.paymentMethod.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader 
        title="Business Intelligence Dashboard" 
        subtitle="Real-time analytics and insights for your business"
        icon={FiBarChart2}
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* Time Period Selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['today', 'week', 'month', 'quarter'].map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                timePeriod === period
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              } ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {loading && timePeriod === period && (
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              )}
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
          {loading && (
            <div className="flex items-center text-sm text-gray-500 ml-4">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading {timePeriod} data...
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-4">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'realtime', name: 'Real-Time Sales', icon: '⚡' },
              { id: 'profit', name: 'Profit & Loss', icon: '💰' },
              { id: 'customers', name: 'Customer Behavior', icon: '👥' },
              { id: 'peaks', name: 'Peak Hours', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <SummaryCards />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealTimeSalesChart />
              <CustomerBehaviorChart />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentTransactions />
              <TopCustomersTable />
            </div>
          </div>
        )}

        {activeTab === 'realtime' && (
          <div className="space-y-8">
            <SummaryCards />
            <div className="grid grid-cols-1 gap-6">
              <RealTimeSalesChart />
              <RecentTransactions />
            </div>
          </div>
        )}

        {activeTab === 'profit' && (
          <div className="space-y-8">
            <ProfitLossChart />
            {profitLossData?.profitByCategory && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profitLossData.profitByCategory.map((category, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">{category._id}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Profit: {formatCurrency(category.profit)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Margin: {category.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CustomerBehaviorChart />
              <TopCustomersTable />
            </div>
            {customerData?.repeatCustomerStats && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {customerData.repeatCustomerStats.totalCustomers}
                    </div>
                    <div className="text-sm text-blue-800">Total Customers</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {customerData.repeatCustomerStats.repeatCustomers}
                    </div>
                    <div className="text-sm text-green-800">Repeat Customers</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {customerData.repeatCustomerStats.repeatCustomerRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-800">Repeat Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'peaks' && (
          <div className="space-y-8">
            <PeakHoursChart />
            {peakHoursData?.dayOfWeekAnalysis && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {peakHoursData.dayOfWeekAnalysis.map((day, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{day.dayName}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {day.transactions} sales
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(day.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {realTimeData?.lastUpdated ? 
            format(new Date(realTimeData.lastUpdated), 'PPpp') : 
            'Loading...'
          }
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 