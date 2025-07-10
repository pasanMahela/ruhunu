import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { FiSearch, FiEye, FiPrinter, FiCalendar } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Loading from '../components/Loading';
import { API_URL } from '../services/api';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const BACKEND_API_URL = API_URL;

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(BACKEND_API_URL+'/sales', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSales(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to fetch sales history');
      toast.error('Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredAndSortedSales = sales
    .filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const matchesDateRange = (!dateRange.startDate || !dateRange.endDate) || 
        isWithinInterval(saleDate, {
          start: parseISO(dateRange.startDate),
          end: parseISO(dateRange.endDate)
        });
      const matchesPaymentMethod = !filterPaymentMethod || 
        sale.paymentMethod.toLowerCase() === filterPaymentMethod.toLowerCase();
      const matchesSearch = !searchQuery || 
        sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sale.cashier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDateRange && matchesPaymentMethod && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'items':
          comparison = a.items.length - b.items.length;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const printSale = (sale) => {
    const printWindow = window.open('', '_blank');
    const saleDate = new Date(sale.createdAt).toLocaleString();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Bill</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .bill-details {
              margin-bottom: 20px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th, .items-table td {
              border-bottom: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .total-section {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Sales Bill</h2>
            <p>Date: ${saleDate}</p>
          </div>
          
          <div class="bill-details">
            <p><strong>Customer:</strong> ${sale.customerName}</p>
            <p><strong>Payment Method:</strong> ${sale.paymentMethod.toUpperCase()}</p>
            <p><strong>Amount Paid:</strong> Rs. ${sale.amountPaid.toFixed(2)}</p>
            <p><strong>Change:</strong> Rs. ${sale.balance.toFixed(2)}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Disc</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>Rs. ${item.price.toFixed(2)}</td>
                  <td>${item.discount}%</td>
                  <td>Rs. ${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <p><strong>Subtotal:</strong> Rs. ${sale.subtotal.toFixed(2)}</p>
            <p><strong>Total Discount:</strong> Rs. ${(sale.subtotal - sale.total).toFixed(2)}</p>
            <p><strong>Grand Total:</strong> Rs. ${sale.total.toFixed(2)}</p>
          </div>

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please come again</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print Bill
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  if (loading) {
    return <Loading message="Loading sales history..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-red-600 bg-white p-6 rounded-lg border-2 border-red-200 shadow-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-200">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-gray-600" />
                  <input
                    type="date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateRangeChange}
                    className="bg-white border-2 border-blue-200 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-600">to</span>
                  <input
                    type="date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateRangeChange}
                    className="bg-white border-2 border-blue-200 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="bg-white border-2 border-blue-200 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-600" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name or cashier..."
                className="pl-10 w-full bg-white border-2 border-blue-200 rounded-lg px-4 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/90 rounded-lg shadow-lg overflow-hidden border-2 border-blue-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-blue-100">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200"
                    onClick={() => handleSort('total')}
                  >
                    Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cashier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {filteredAndSortedSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Rs. {sale.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.cashier?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleViewSale(sale)}
                        className="inline-flex items-center px-3 py-1 border-2 border-blue-500 text-blue-600 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiEye className="mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => printSale(sale)}
                        className="inline-flex items-center px-3 py-1 border-2 border-green-500 text-green-600 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <FiPrinter className="mr-1" />
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sale Details Modal */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-blue-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Sale Details</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-800">{format(new Date(selectedSale.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-800">{selectedSale.customerName}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-gray-600">Cashier</p>
                    <p className="font-medium text-gray-800">{selectedSale.cashier?.name || 'N/A'}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-800">{selectedSale.paymentMethod.toUpperCase()}</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="font-semibold text-gray-800 mb-4">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b-2 border-blue-300">
                          <th className="text-left py-2 text-sm font-medium text-gray-700">Item</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Qty</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Price</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Disc</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item, index) => (
                          <tr key={index} className="border-b border-blue-200">
                            <td className="py-2 text-sm text-gray-700">{item.name}</td>
                            <td className="text-right py-2 text-sm text-gray-700">{item.quantity}</td>
                            <td className="text-right py-2 text-sm text-gray-700">Rs. {item.price.toFixed(2)}</td>
                            <td className="text-right py-2 text-sm text-gray-700">{item.discount}%</td>
                            <td className="text-right py-2 text-sm text-gray-700">Rs. {item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-800">Rs. {selectedSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="text-gray-800">Rs. {(selectedSale.subtotal - selectedSale.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t-2 border-blue-300">
                    <span className="text-gray-800">Grand Total:</span>
                    <span className="text-gray-900">Rs. {selectedSale.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => printSale(selectedSale)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  >
                    <FiPrinter className="mr-2" />
                    Print Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory; 