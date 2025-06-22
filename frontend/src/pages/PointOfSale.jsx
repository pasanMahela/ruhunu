import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../services/api';
import Bill from '../components/Bill';

const PointOfSale = () => {
  const BACKEND_API_URL = API_URL;
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const [cartItems, setCartItems] = useState(() => {
    // Initialize cart from localStorage if available
    const savedCart = localStorage.getItem('posCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState(0);
  const [updatingDiscount, setUpdatingDiscount] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [updatingQuantities, setUpdatingQuantities] = useState({});
  const [saleData, setSaleData] = useState(null);
  const [showPrintBill, setShowPrintBill] = useState(false);
  const [cartDiscounts, setCartDiscounts] = useState({});
  const [editingCartDiscount, setEditingCartDiscount] = useState(null);
  const [deletingItems, setDeletingItems] = useState({});
  const [searchResultDiscounts, setSearchResultDiscounts] = useState({});

  // Add refs for first result
  const quantityRef = useRef(null);
  const discountRef = useRef(null);
  const searchInputRef = useRef(null);

  // Calculate cart totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.retailPrice), 0);
  const totalDiscount = cartItems.reduce((sum, item) => 
    sum + (item.quantity * item.retailPrice * ((cartDiscounts[item._id] || item.discount) / 100)), 0);
  const grandTotal = subtotal - totalDiscount;
  const balance = amountPaid ? amountPaid - grandTotal : 0;

  // Update localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('posCart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Load cart from backend on component mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(BACKEND_API_URL+'/cart', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.data.success) {
          // Transform cart items to match the expected format
          const transformedItems = response.data.data.items.map(cartItem => ({
            _id: cartItem.item._id,
            name: cartItem.item.name,
            itemCode: cartItem.item.itemCode,
            retailPrice: cartItem.item.retailPrice,
            discount: cartItem.item.discount,
            quantityInStock: cartItem.item.quantityInStock,
            location: cartItem.item.location,
            quantity: cartItem.quantity
          }));
          setCartItems(transformedItems);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        toast.error('Failed to load cart');
      }
    };

    loadCart();
  }, []);

  // Search items
  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchPerformed(false);
      setNoResultsFound(false);
      return;
    }

    setSearchLoading(true);
    setSearchPerformed(true);
    setNoResultsFound(false);
    try {
      const response = await fetch(BACKEND_API_URL+`/items/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search items');
      }

      const data = await response.json();
      
      if (data.data.length === 0) {
        setSearchResults([]);
        setNoResultsFound(true);
        toast.error(`No items found with code or name: ${searchTerm}`);
      } else {
        // Update search results with cart quantities
        const updatedResults = data.data.map(item => {
          const cartItem = cartItems.find(cartItem => cartItem._id === item._id);
          return {
            ...item,
            cartQuantity: cartItem ? cartItem.quantity : 0
          };
        });
        setSearchResults(updatedResults);
        setNoResultsFound(false);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
      setNoResultsFound(true);
    } finally {
      setSearchLoading(false);
    }
  };

  // Get suggestions
  const getSuggestions = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const response = await fetch(BACKEND_API_URL+`/items/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      setSuggestions(data.data.slice(0, 5)); // Limit to 5 suggestions
    } catch (err) {
      console.error('Error getting suggestions:', err);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        getSuggestions(searchTerm);
        setSearchPerformed(false);
        setNoResultsFound(false);
      } else {
        setSuggestions([]);
        setSearchPerformed(false);
        setNoResultsFound(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.itemCode);
    setSuggestions([]);
    setSearchPerformed(true);
    setNoResultsFound(false);
    handleSearch(suggestion.itemCode);
  };

  // Add function to update selected quantity
  const updateSelectedQuantity = (itemId, quantity) => {
    if (quantity < 1) return;
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const addToCart = async (item) => {
    try {
      setAddingToCart(true);
      const quantity = selectedQuantities[item._id] || 1;
      const discount = searchResultDiscounts[item._id] !== undefined ? parseFloat(searchResultDiscounts[item._id]) : item.discount;
      const availableStock = item.quantityInStock - (item.cartQuantity || 0);
      
      // Check if available stock is not greater than 0
      if (availableStock <= 0) {
        toast.error(`${item.name} stock not available`);
        setAddingToCart(false);
        return;
      }
      // Check if item has no stock (legacy check)
      if (item.quantityInStock === 0) {
        toast.error('Item is out of stock');
        setAddingToCart(false);
        return;
      }
      
      if (quantity > item.quantityInStock) {
        setError('Quantity exceeds available stock');
        setAddingToCart(false);
        return;
      }

      const response = await fetch(BACKEND_API_URL+'/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          itemId: item._id,
          quantity: quantity,
          discount: discount // Pass the edited discount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add item to cart');
      }

      const data = await response.json();
      
      // Transform cart items to match the expected format
      const transformedItems = data.data.items.map(cartItem => ({
        _id: cartItem.item._id,
        name: cartItem.item.name,
        itemCode: cartItem.item.itemCode,
        retailPrice: cartItem.item.retailPrice,
        discount: searchResultDiscounts[cartItem.item._id] !== undefined ? parseFloat(searchResultDiscounts[cartItem.item._id]) : cartItem.item.discount,
        quantityInStock: cartItem.item.quantityInStock,
        location: cartItem.item.location,
        quantity: cartItem.quantity
      }));

      setCartItems(transformedItems);
      setSelectedQuantities({}); // Clear selected quantities
      setSearchResults([]); // Clear search results
      setSearchTerm(''); // Clear search term
      setError(null);
      toast.success('Item added to cart');

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const updateCartItemQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    setUpdatingQuantities(prev => ({ ...prev, [itemId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        BACKEND_API_URL+`/cart/items/${itemId}`,
        {
          quantity: newQuantity
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Transform cart items to match the expected format
        const transformedItems = response.data.data.items.map(cartItem => ({
          _id: cartItem.item._id,
          name: cartItem.item.name,
          itemCode: cartItem.item.itemCode,
          retailPrice: cartItem.item.retailPrice,
          discount: cartItem.item.discount,
          quantityInStock: cartItem.item.quantityInStock,
          location: cartItem.item.location,
          quantity: cartItem.quantity
        }));
        setCartItems(transformedItems);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      toast.error(error.response?.data?.message || 'Failed to update item quantity');
    } finally {
      setUpdatingQuantities(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      setDeletingItems(prev => ({ ...prev, [itemId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        BACKEND_API_URL+`/cart/items/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Transform cart items to match the expected format
        const transformedItems = response.data.data.items.map(cartItem => ({
          _id: cartItem.item._id,
          name: cartItem.item.name,
          itemCode: cartItem.item.itemCode,
          retailPrice: cartItem.item.retailPrice,
          discount: cartItem.item.discount,
          quantityInStock: cartItem.item.quantityInStock,
          location: cartItem.item.location,
          quantity: cartItem.quantity
        }));
        setCartItems(transformedItems);
        toast.success('Item removed from cart');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error(error.response?.data?.message || 'Failed to remove item from cart');
    } finally {
      setDeletingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!amountPaid || parseFloat(amountPaid) < grandTotal) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const requestData = {
        items: cartItems.map(item => ({
          item: item._id,
          name: item.name,
          itemCode: item.itemCode,
          quantity: item.quantity,
          price: item.retailPrice,
          discount: cartDiscounts[item._id] || item.discount,
          total: item.quantity * item.retailPrice * (1 - (cartDiscounts[item._id] || item.discount) / 100)
        })),
        subtotal: subtotal,
        tax: 0,
        total: grandTotal,
        paymentMethod: paymentMethod,
        paymentStatus: 'completed',
        customerName: customerName.trim() || 'Walk-in Customer',
        amountPaid: parseFloat(amountPaid),
        balance: balance
      };

      console.log('Request Data:', JSON.stringify(requestData, null, 2));
      console.log('Cart Items:', cartItems);

      const response = await axios.post(
        BACKEND_API_URL+'/sales',
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Store sale data for printing
        setSaleData(requestData);
        setShowPrintBill(true);
        
        // Clear cart after successful sale
        await axios.delete(BACKEND_API_URL+'/cart', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setCartItems([]);
        setCustomerName('');
        setAmountPaid('');
        setSuccess('Sale completed successfully');
        toast.success('Sale completed successfully');
      }
    } catch (err) {
      console.error('Error creating sale:', err.response?.data);
      console.error('Request Data:', err.config?.data);
      setError(err.response?.data?.message || 'Failed to process sale');
      toast.error(err.response?.data?.message || 'Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const printBill = () => {
    const printWindow = window.open('', '_blank');
    const saleDate = new Date().toLocaleString();
    
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
            <p><strong>Customer:</strong> ${saleData.customerName}</p>
            <p><strong>Payment Method:</strong> ${saleData.paymentMethod.toUpperCase()}</p>
            <p><strong>Amount Paid:</strong> Rs. ${saleData.amountPaid.toFixed(2)}</p>
            <p><strong>Change:</strong> Rs. ${saleData.balance.toFixed(2)}</p>
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
              ${saleData.items.map(item => `
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
            <p><strong>Subtotal:</strong> Rs. ${saleData.subtotal.toFixed(2)}</p>
            <p><strong>Total Discount:</strong> Rs. ${(saleData.subtotal - saleData.total).toFixed(2)}</p>
            <p><strong>Grand Total:</strong> Rs. ${saleData.total.toFixed(2)}</p>
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

  // Update item discount
  const handleUpdateDiscount = async () => {
    if (!selectedItem) return;
    
    setUpdatingDiscount(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        BACKEND_API_URL+`/items/code/${selectedItem.itemCode}/stock`,
        { discount: parseFloat(newDiscount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update the item in search results
        setSearchResults(prev => 
          prev.map(item => 
            item.itemCode === selectedItem.itemCode 
              ? { ...item, discount: parseFloat(newDiscount) }
              : item
          )
        );
        
        // Update the item in cart if it exists
        setCartItems(prev => 
          prev.map(item => 
            item.itemCode === selectedItem.itemCode 
              ? { ...item, discount: parseFloat(newDiscount) }
              : item
          )
        );

        toast.success('Discount updated successfully');
        setDiscountModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating discount:', error);
      toast.error(error.response?.data?.message || 'Failed to update discount');
    } finally {
      setUpdatingDiscount(false);
    }
  };

  const updateCartDiscount = (itemId, newDiscount) => {
    setCartDiscounts(prev => ({
      ...prev,
      [itemId]: newDiscount
    }));
  };

  // Update discount handler
  const handleSearchResultDiscountChange = (itemId, value) => {
    setSearchResultDiscounts(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // Focus quantity input when search results appear
  useEffect(() => {
    if (searchResults.length > 0 && quantityRef.current) {
      quantityRef.current.focus();
    }
  }, [searchResults]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 bg-clip-text text-transparent mb-8"
        >
          Point of Sale
        </motion.h1>

        <div className="grid grid-cols-1 gap-6">
          {/* Search Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Search Items</h2>
            
            {/* Search Input and Button */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                  placeholder="Search by item name or code..."
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500 pr-10"
                />
                <button
                  onClick={() => handleSearch(searchTerm)}
                  disabled={searchLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                >
                  {searchLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
                    />
                  ) : (
                    <FiSearch size={16} />
                  )}
                </button>
              </div>
              <button
                onClick={() => handleSearch(searchTerm)}
                disabled={searchLoading || !searchTerm.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find
              </button>
            </div>

            {/* Search Suggestions */}
            {searchTerm.trim() && suggestions.length > 0 && !suggestionsLoading && !searchPerformed && (
              <div className="bg-slate-700/30 rounded-lg border border-slate-600/50 overflow-hidden">
                <div className="p-3 border-b border-slate-600/50">
                  <p className="text-slate-300 text-sm font-medium">Suggestions</p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {suggestions.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-600/50 transition-colors border-b border-slate-600/30 last:border-b-0"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          <p className="text-slate-400 text-sm">Code: {item.itemCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-300 text-sm">Rs. {item.retailPrice.toFixed(2)}</p>
                          <p className="text-slate-400 text-xs">{item.quantityInStock} in stock</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Suggestions */}
            {searchTerm.trim() && suggestions.length === 0 && !suggestionsLoading && !searchPerformed && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <p className="text-slate-400 text-sm">No items found. Try a different search term or click "Find" to search.</p>
              </div>
            )}

            {/* Loading State */}
            {suggestionsLoading && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                  />
                  <span className="text-slate-300">Loading suggestions...</span>
                </div>
              </div>
            )}

            {/* Search Loading State */}
            {searchLoading && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                  />
                  <span className="text-slate-300">Searching...</span>
                </div>
              </div>
            )}

            {/* No Results Found */}
            {searchPerformed && noResultsFound && !searchLoading && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Item Not Found</h3>
                  <p className="text-slate-400 mb-4">No items found matching "{searchTerm}"</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <span>Try searching with:</span>
                    <ul className="flex gap-2">
                      <li className="bg-slate-700/50 px-2 py-1 rounded text-slate-300">Item name</li>
                      <li className="bg-slate-700/50 px-2 py-1 rounded text-slate-300">Item code</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchPerformed && searchResults.length > 0 && !searchLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl"
              >
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Search Results</h2>
                      <p className="text-slate-400 mt-1">Found {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-400">Ready to add items</span>
                    </div>
                  </div>
                </div>

                {/* Results List */}
                <div className="p-6 space-y-4">
                  {searchResults.map((item, index) => {
                    const quantity = selectedQuantities[item._id] || 1;
                    const discount = searchResultDiscounts[item._id] !== undefined ? parseFloat(searchResultDiscounts[item._id]) : item.discount;
                    const itemTotal = quantity * item.retailPrice * (1 - discount / 100);
                    
                    // Keyboard handlers
                    const handleQuantityKeyDown = (e) => {
                      if (e.key === 'Enter' && index === 0 && discountRef.current) {
                        discountRef.current.focus();
                        e.preventDefault();
                      }
                    };
                    const handleDiscountKeyDown = (e) => {
                      if (e.key === 'Enter' && index === 0) {
                        addToCart(item);
                        e.preventDefault();
                      }
                    };

                    return (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            {/* Left Section - Item Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-4">
                                {/* Item Icon/Image Placeholder */}
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-white/10">
                                  <span className="text-lg font-bold text-white">{item.name.charAt(0).toUpperCase()}</span>
                                </div>
                                
                                {/* Item Details */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                                    {item.name}
                                  </h3>
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    <span className="text-slate-400">
                                      <span className="font-medium text-slate-300">#{item.itemCode}</span>
                                    </span>
                                    <span className="text-slate-400">
                                      <span className="font-medium text-slate-300">{item.location}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Center Section - Price & Stock */}
                            <div className="flex items-center gap-8 mx-8">
                              {/* Price */}
                              <div className="text-center">
                                <p className="text-2xl font-bold text-white">Rs. {item.retailPrice.toFixed(2)}</p>
                                {item.discount > 0 && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                      {item.discount}% OFF
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Stock */}
                              <div className="text-center">
                                <p className="text-sm text-slate-400 mb-1">Available</p>
                                <p className="text-xl font-bold text-white">
                                  {item.quantityInStock - (item.cartQuantity || 0)}
                                </p>
                                {item.cartQuantity > 0 && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                      {item.cartQuantity} in cart
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Section - Quantity, Discount & Actions */}
                            <div className="flex items-center gap-6">
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateSelectedQuantity(item._id, quantity - 1)}
                                  className="w-10 h-10 flex items-center justify-center bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                                  disabled={quantity <= 1}
                                >
                                  <FiMinus size={18} />
                                </button>
                                
                                <div className="relative">
                                  <input
                                    ref={index === 0 ? quantityRef : undefined}
                                    type="number"
                                    min="1"
                                    max={item.quantityInStock}
                                    value={quantity}
                                    onChange={(e) => updateSelectedQuantity(item._id, parseInt(e.target.value) || 1)}
                                    onKeyDown={handleQuantityKeyDown}
                                    className="w-20 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                  />
                                </div>
                                
                                <button
                                  onClick={() => updateSelectedQuantity(item._id, quantity + 1)}
                                  className="w-10 h-10 flex items-center justify-center bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                                  disabled={quantity >= item.quantityInStock}
                                >
                                  <FiPlus size={18} />
                                </button>
                              </div>

                              {/* Discount Field */}
                              <div className="flex flex-col items-center gap-1 min-w-[90px]">
                                <label className="text-xs text-slate-400 mb-1">Discount (%)</label>
                                <input
                                  ref={index === 0 ? discountRef : undefined}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={discount}
                                  onChange={e => handleSearchResultDiscountChange(item._id, e.target.value)}
                                  onKeyDown={handleDiscountKeyDown}
                                  className="w-20 px-2 py-1 bg-slate-700/50 border border-white/10 rounded-lg text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                              </div>

                              {/* Total & Add Button */}
                              <div className="text-right">
                                <p className="text-sm text-slate-400 mb-2">Total</p>
                                <p className="text-xl font-bold text-white mb-3">Rs. {itemTotal.toFixed(2)}</p>
                                
                                <button
                                  onClick={() => addToCart(item)}
                                  disabled={addingToCart || item.quantityInStock === 0}
                                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                >
                                  {addingToCart ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                                    />
                                  ) : item.quantityInStock === 0 ? (
                                    <span className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                      Out of Stock
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                      Add to Cart
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cart Table */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Cart</h2>
            {cartItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="pb-3 font-medium">Item Code</th>
                      <th className="pb-3 font-medium">Item Name</th>
                      <th className="pb-3 font-medium text-right">Quantity</th>
                      <th className="pb-3 font-medium text-right">Price</th>
                      <th className="pb-3 font-medium text-right">Discount</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {cartItems.map((item) => (
                        <motion.tr
                          key={item._id}
                          initial={{ opacity: 1, x: 0 }}
                          exit={{ 
                            opacity: 0,
                            x: 100,
                            transition: { duration: 0.3, ease: "easeOut" }
                          }}
                          className="border-b border-slate-700/50"
                        >
                          <td className="py-3 text-slate-300">{item.itemCode}</td>
                          <td className="py-3 text-slate-300">{item.name}</td>
                          <td className="py-3 text-slate-300 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => updateCartItemQuantity(item._id, item.quantity - 1)}
                                disabled={updatingQuantities[item._id]}
                                className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors disabled:opacity-50"
                              >
                                {updatingQuantities[item._id] ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
                                  />
                                ) : (
                                  <FiMinus size={14} />
                                )}
                              </button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateCartItemQuantity(item._id, item.quantity + 1)}
                                disabled={updatingQuantities[item._id]}
                                className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors disabled:opacity-50"
                              >
                                {updatingQuantities[item._id] ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
                                  />
                                ) : (
                                  <FiPlus size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 text-slate-300 text-right">Rs. {item.retailPrice.toFixed(2)}</td>
                          <td className="py-3 text-slate-300 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingCartDiscount === item._id ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={cartDiscounts[item._id] || item.discount}
                                  onChange={(e) => updateCartDiscount(item._id, parseFloat(e.target.value) || 0)}
                                  onBlur={() => setEditingCartDiscount(null)}
                                  className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingCartDiscount(item._id)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {(cartDiscounts[item._id] || item.discount)}%
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-slate-300 text-right">
                            Rs. {(item.quantity * item.retailPrice * (1 - (cartDiscounts[item._id] || item.discount) / 100)).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeFromCart(item._id)}
                              disabled={deletingItems[item._id]}
                              className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-full hover:bg-red-400/10 disabled:opacity-50"
                            >
                              {deletingItems[item._id] ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full"
                                />
                              ) : (
                                <FiTrash2 size={18} />
                              )}
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">Cart is empty</p>
            )}
          </div>

          {/* Summary and Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Summary */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-slate-300 mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Discount</span>
                  <span>Rs. {totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-slate-300">
                  <span>Grand Total</span>
                  <span>Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-slate-300 mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile">Mobile Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    min={grandTotal}
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                {amountPaid && (
                  <div className="flex justify-between text-slate-400">
                    <span>Balance</span>
                    <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                      Rs. {Math.abs(balance).toFixed(2)} {balance >= 0 ? 'to return' : 'to pay'}
                    </span>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  disabled={isProcessing || cartItems.length === 0}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                    />
                  ) : (
                    'Complete Sale'
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      {discountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold text-white mb-4">Update Discount</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Discount Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDiscount}
                disabled={updatingDiscount}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingDiscount ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Bill Button */}
      {showPrintBill && saleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold text-white mb-4">Sale Completed</h2>
            <Bill saleData={saleData} />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPrintBill(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  printBill();
                  setShowPrintBill(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointOfSale; 