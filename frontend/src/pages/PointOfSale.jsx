import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiPlus, FiTrash2, FiPrinter, FiUser, FiCalendar, FiShoppingCart, FiDollarSign } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import BillTemplate from '../components/BillTemplate';

const PointOfSale = () => {
  const { user } = useAuth();
  const BACKEND_API_URL = API_URL;
  
  // Refs for focus management
  const itemCodeRef = useRef(null);
  const itemNameRef = useRef(null);
  const quantityRef = useRef(null);
  const discountPercentRef = useRef(null);
  const customerNicRef = useRef(null);
  const paidAmountRef = useRef(null);

  // Item search states
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Item details states
  const [location, setLocation] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  
  // Cart states
  const [cartItems, setCartItems] = useState([]);
  const [grossValue, setGrossValue] = useState(0);
  const [finalDiscount, setFinalDiscount] = useState('0');
  const [netValue, setNetValue] = useState(0);
  
  // Payment states
  const [paymentType, setPaymentType] = useState('cash');
  const [customerNic, setCustomerNic] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [currentDate, setCurrentDate] = useState('');
  const [nicError, setNicError] = useState('');

  // UI states
  const [isProcessing, setIsProcessing] = useState(false);
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [removingItems, setRemovingItems] = useState(new Set());

  // Initialize current date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);
  }, []);

  // Auto-focus on item code field on page load
  useEffect(() => {
    loadCartFromDatabase();
    if (itemCodeRef.current) {
      itemCodeRef.current.focus();
    }
  }, []);

  // Load cart from database
  const loadCartFromDatabase = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/cart`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success && response.data.data.items && response.data.data.items.length > 0) {
        const cartData = response.data.data.items.map((item, index) => {
          const itemData = item.item;
          const quantity = item.quantity;
          const price = itemData.retailPrice;
          // Use cart item's discount if available, otherwise use item's default discount
          const discount = item.discount !== undefined ? item.discount : (itemData.discount || 0);
          const lineTotal = quantity * price * (1 - discount / 100);
          
          return {
            id: item._id || `temp-${index}-${Date.now()}`, // Use database ID or temporary ID
            itemId: itemData._id,
            code: itemData.itemCode,
            name: itemData.name,
            price: price,
            quantity: quantity,
            discountPercent: discount,
            lineTotal: lineTotal
          };
        });
        setCartItems(cartData);
        console.log('Loaded cart from database:', cartData.length, 'items');
      } else {
        // No items in cart or empty cart
        setCartItems([]);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      // Don't show error toast on page load - user might not have a cart yet
      // Only log for debugging
      if (error.response?.status !== 404) {
        console.warn('Unexpected error loading cart:', error.response?.data?.message);
      }
    }
  };

  // Calculate cart totals
  useEffect(() => {
    const gross = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    setGrossValue(gross);
    
    const net = gross - parseFloat(finalDiscount || 0);
    setNetValue(net);
    
    // Calculate balance
    if (paidAmount) {
      setBalance(parseFloat(paidAmount) - net);
    }
  }, [cartItems, finalDiscount, paidAmount]);

  // Search item by code (on blur)
  const handleItemCodeBlur = async () => {
    if (!itemCode.trim()) return;

    setSearchLoading(true);
    try {
      const searchValue = itemCode.trim();
      console.log('POS searching for:', searchValue);
      let response;
      let item;
      let foundBy = null; // Track how the item was found

      // First try to search by item code
      try {
        response = await axios.get(
          `${BACKEND_API_URL}/items/code/${searchValue}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        if (response.data.success) {
          item = response.data.data;
          foundBy = 'code';
        }
      } catch (codeError) {
        // If item code search fails, try barcode search
        try {
          response = await axios.get(
            `${BACKEND_API_URL}/items/barcode/${searchValue}`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          
          if (response.data.success) {
            item = response.data.data;
            foundBy = 'barcode';
          }
        } catch (barcodeError) {
          // If both exact searches fail, show specific error messages
          toast.error(`No item found with code "${searchValue}" or barcode "${searchValue}"`);
          clearItemFields();
          return;
        }
      }

      if (!item) {
        toast.error(`No item found with code "${searchValue}" or barcode "${searchValue}"`);
        clearItemFields();
        return;
      }

      setSelectedItem(item);
      setItemCode(item.itemCode || ''); // Set the actual item code from found item
      console.log('POS found item:', item.name, 'itemCode:', item.itemCode);
      setItemName(item.name);
      setLocation(item.location);
      setUnitPrice(item.retailPrice.toString());
      setQuantity(''); // Clear previous quantity
      setDiscountPercent((item.discount || 0).toString());
      
      // Focus quantity field
      setTimeout(() => quantityRef.current?.focus(), 100);
      
      // Show specific success message based on how item was found
      if (foundBy === 'code') {
        toast.success(`Item found by code "${searchValue}"`);
      } else if (foundBy === 'barcode') {
        toast.success(`Item found by barcode "${searchValue}"`);
      }
    } catch (error) {
      console.log('POS Search Error:', error.message);
      toast.error(`No item found with code "${itemCode.trim()}" or barcode "${itemCode.trim()}"`);
      clearItemFields();
    } finally {
      setSearchLoading(false);
    }
  };

  // Search items by name (live search)
  const handleItemNameChange = async (value) => {
    setItemName(value);
    
    if (value.length < 2) {
      setItemSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/items/search?q=${encodeURIComponent(value)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setItemSuggestions(response.data.data.slice(0, 5));
        setShowSuggestions(true);
      }
    } catch (error) {
      setItemSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select item from suggestions
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setItemCode(item.itemCode);
    setItemName(item.name);
    setLocation(item.location);
    setUnitPrice(item.retailPrice.toString());
    setQuantity(''); // Clear previous quantity
    setDiscountPercent((item.discount || 0).toString());
    setShowSuggestions(false);
    
    // Focus quantity field
    setTimeout(() => quantityRef.current?.focus(), 100);
  };

  // Add item to cart
  const handleAddToCart = async () => {
    if (!selectedItem || !quantity || parseFloat(quantity) <= 0) {
      toast.error('Please select an item and enter quantity');
        return;
      }
      
    if (parseFloat(quantity) > selectedItem.quantityInStock) {
      toast.error('Insufficient stock available');
        return;
      }

    setAddToCartLoading(true);
    try {
      const qty = parseFloat(quantity);
      const discount = parseFloat(discountPercent) || 0;
      
      // Add to database cart
      const response = await axios.post(
        `${BACKEND_API_URL}/cart/items`,
        {
          itemId: selectedItem._id,
          quantity: qty,
          discount: discount
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        // Reload cart from database to get updated data
        await loadCartFromDatabase();
        clearItemFields();
      toast.success('Item added to cart');

        // Focus back to item code
        setTimeout(() => itemCodeRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.message || 'Failed to add item to cart');
    } finally {
      setAddToCartLoading(false);
    }
  };

  // Remove item from cart
  const handleRemoveFromCart = async (itemId) => {
    // Add item to removing set
    setRemovingItems(prev => new Set([...prev, itemId]));
    
    try {
      // Find the cart item to get the actual database item ID
      const cartItem = cartItems.find(item => item.id === itemId);
      if (!cartItem) return;

      const response = await axios.delete(
        `${BACKEND_API_URL}/cart/items/${cartItem.itemId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        // Reload cart from database to get updated data
        await loadCartFromDatabase();
        toast.success('Item removed from cart');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error(error.response?.data?.message || 'Failed to remove item from cart');
    } finally {
      // Remove item from removing set
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Update cart item quantity
  const handleUpdateCartQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) return;
    
    try {
      // Find the cart item to get the actual database item ID
      const cartItem = cartItems.find(item => item.id === itemId);
      if (!cartItem) return;

      const response = await axios.put(
        `${BACKEND_API_URL}/cart/items/${cartItem.itemId}`,
        { 
          quantity: newQuantity,
          discount: cartItem.discountPercent
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        // Reload cart from database to get updated data
        await loadCartFromDatabase();
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      toast.error(error.response?.data?.message || 'Failed to update quantity');
    }
  };

  // Clear item input fields
  const clearItemFields = () => {
    setItemCode('');
    setItemName('');
    setSelectedItem(null);
    setLocation('');
    setUnitPrice('');
    setQuantity('');
    setDiscountPercent('0');
  };

  // Handle final sale processing
  const handleCloseSale = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!paidAmount || parseFloat(paidAmount) < netValue) {
      toast.error('Insufficient payment amount');
      return;
    }
    
    if (paymentType === 'credit' && !customerName.trim()) {
      toast.error('Customer name required for credit sales');
      return;
    }

    setIsProcessing(true);

    try {
      // Create or find customer if NIC and name provided
      let customerId = null;
      if (customerNic.trim() && customerName.trim()) {
        // Validate NIC format before creating customer
        if (!validateNic(customerNic.trim())) {
          toast.error('Please enter a valid NIC format');
          return;
        }
        
        try {
          console.log('Attempting to create/find customer:', { nic: customerNic.trim(), name: customerName.trim(), phone: customerPhone.trim() });
          
          const customerData = {
            nic: customerNic.trim(),
            name: customerName.trim()
          };
          
          // Add phone number if provided
          if (customerPhone.trim()) {
            customerData.phone = customerPhone.trim();
          }
          
          const customerResponse = await axios.post(
            `${BACKEND_API_URL}/customers/find-or-create`,
            customerData,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          
          if (customerResponse.data.success) {
            customerId = customerResponse.data.data._id;
            console.log('Customer created/found successfully:', customerId);
            toast.success(`Customer ${customerResponse.data.isNew ? 'created' : 'found'}: ${customerName.trim()}`);
          }
        } catch (customerError) {
          console.error('Customer creation/finding failed:', customerError.response?.data || customerError.message);
          
          // Show specific error message to user
          const errorMessage = customerError.response?.data?.message || 
                             customerError.message || 
                             'Failed to create/find customer';
          toast.error(`Customer error: ${errorMessage}`);
          
          // Log detailed error for debugging
          console.warn('Customer creation details:', {
            nic: customerNic.trim(),
            name: customerName.trim(),
            phone: customerPhone.trim(),
            error: customerError.response?.data || customerError.message,
            status: customerError.response?.status
          });
        }
      }
      
      const saleData = {
        items: cartItems.map(item => ({
          item: item.itemId,
          name: item.name,
          itemCode: item.code,
          quantity: item.quantity,
          price: item.price,
          discount: item.discountPercent,
          total: item.lineTotal
        })),
        subtotal: grossValue,
        total: netValue,
        paymentMethod: paymentType,
        paymentStatus: 'completed',
        customer: customerId,
        customerNic: customerNic.trim() || null,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || null,
        amountPaid: parseFloat(paidAmount),
        balance: balance
      };

      const response = await axios.post(
        `${BACKEND_API_URL}/sales`,
        saleData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        toast.success('Sale completed successfully');
        
        // Print receipt with bill number from response
        printReceipt(saleData, response.data.data.billNumber);
        
        // Clear cart from database
        try {
          await axios.delete(
            `${BACKEND_API_URL}/cart`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
        } catch (cartClearError) {
          console.warn('Could not clear cart from database:', cartClearError);
        }
        
        // Clear all fields
        setCartItems([]);
        setCustomerNic('');
        setCustomerName('');
        setCustomerPhone('');
        setSelectedCustomer(null);
        setCustomerSearching(false);
        setShowCustomerSuggestions(false);
        setPaidAmount('');
        setFinalDiscount('0');
        
        // Focus back to item code
        setTimeout(() => itemCodeRef.current?.focus(), 500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print receipt using centralized template
  const printReceipt = (saleData, billNumber) => {
    // Prepare data for the bill template
    const billData = {
      ...saleData,
      billNumber: billNumber,
      createdAt: new Date(),
      cashier: { name: user?.name || 'Unknown' }
    };
    
    // Use the thermal printer optimized template
    BillTemplate.printThermalBill(billData);
  };

  // Handle Enter key navigation
  const handleKeyPress = (e, nextField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField) {
        nextField.current?.focus();
      }
    }
  };

  // Handle Enter key press for Customer NIC field
  const handleCustomerNicKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Validate NIC format first
      if (!validateNic(customerNic.trim())) {
        toast.error('Please enter a valid NIC format');
        return;
      }
      
      // Trigger the find button functionality
      handleCustomerNicBlur();
      // Focus on Amount Paid field
      setTimeout(() => paidAmountRef.current?.focus(), 300); // Small delay to allow API call
    }
  };
        
    // Search customer by NIC
  const handleCustomerNicBlur = async () => {
    if (!customerNic.trim() || customerSearching) return;
    
    // Validate NIC format first
    if (!validateNic(customerNic.trim())) {
      toast.error('Please enter a valid NIC format');
      return;
    }
    
    // Prevent double search if customer is already selected with this NIC
    if (selectedCustomer && selectedCustomer.nic === customerNic.toUpperCase()) {
      return;
    }
    
    setCustomerSearching(true);
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/customers/nic/${customerNic}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.data.success) {
        const customer = response.data.data;
        setSelectedCustomer(customer);
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone || '');
        toast.success('Customer found');
      }
    } catch (error) {
      // Customer not found - allow manual entry
      if (!selectedCustomer) { // Only show message if no customer is currently selected
        setSelectedCustomer(null);
        toast('New customer - please enter name', {
          icon: 'ℹ️',
          duration: 2000
        });
      }
    } finally {
      setCustomerSearching(false);
    }
  };

  // Search customers by name
  const handleCustomerNameChange = async (value) => {
    setCustomerName(value);
    
    if (value.length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
      return;
    }
    
    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/customers/search/${encodeURIComponent(value)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.data.success) {
        setCustomerSuggestions(response.data.data.slice(0, 5));
        setShowCustomerSuggestions(true);
      }
    } catch (error) {
      setCustomerSuggestions([]);
      setShowCustomerSuggestions(false);
    }
  };

  // Select customer from suggestions
  const handleCustomerSelect = (customer) => {
    console.log('Setting customer from dropdown:', customer);
    console.log('Customer status:', customer.status);
    setSelectedCustomer(customer);
    setCustomerNic(customer.nic);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setShowCustomerSuggestions(false);
  };

  // Calculate display values
  const totalPrice = quantity && unitPrice ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2) : '0.00';
  const discountAmount = totalPrice && discountPercent ? (parseFloat(totalPrice) * parseFloat(discountPercent) / 100).toFixed(2) : '0.00';

  // NIC validation function
  const validateNic = (nic) => {
    if (!nic) {
      setNicError('');
      return true;
    }
    
    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
    const isValid = nicRegex.test(nic);
    
    if (!isValid) {
      if (nic.length < 9) {
        setNicError('NIC must be at least 9 digits');
      } else if (nic.length === 9 && !/^[0-9]{9}[vV]$/.test(nic)) {
        setNicError('Old format: 9 digits + V (e.g., 123456789V)');
      } else if (nic.length === 12 && !/^[0-9]{12}$/.test(nic)) {
        setNicError('New format: 12 digits only');
      } else if (nic.length > 12) {
        setNicError('NIC cannot exceed 12 digits');
      } else {
        setNicError('Invalid NIC format. Use 9 digits + V or 12 digits');
      }
    } else {
      setNicError('');
    }
    
    return isValid;
  };

  // Handle NIC input change with validation
  const handleCustomerNicChange = (value) => {
    setCustomerNic(value);
    validateNic(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Clean Header */}
      <PageHeader 
        title="Point of Sale" 
        subtitle="Process sales and manage transactions"
        icon={FiDollarSign}
      />

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content - Item Selection & Cart */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Simplified Item Search */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiSearch className="mr-2 text-blue-600" />
                  Item Selection
                </h2>
                </div>
              
                             <div className="p-6">
                 {/* Item Code and Stock Row */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Item Code / Barcode</label>
                     <div className="flex gap-2">
                       <input
                         ref={itemCodeRef}
                         type="text"
                         value={itemCode}
                         onChange={(e) => setItemCode(e.target.value)}
                         onBlur={handleItemCodeBlur}
                         onKeyPress={(e) => handleKeyPress(e, itemNameRef)}
                         placeholder="Enter item code, barcode, or item name"
                         className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       />
                       <button
                         onClick={handleItemCodeBlur}
                         disabled={searchLoading}
                         className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                       >
                         {searchLoading ? '⏳' : 'Find'}
                       </button>
                </div>
              </div>
                   
                    <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Available Stock</label>
                     <input
                       type="text"
                       value={selectedItem ? selectedItem.quantityInStock : ''}
                       readOnly
                       className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-medium ${
                         selectedItem && selectedItem.quantityInStock < 10 ? 'text-red-600' : 
                         selectedItem && selectedItem.quantityInStock < 50 ? 'text-orange-600' : 'text-green-600'
                       }`}
                     />
                  </div>
                </div>

                 {/* Search by Name Row */}
                 <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Search by Item Name</label>
                   <div className="relative">
                     <input
                       ref={itemNameRef}
                       type="text"
                       value={itemName}
                       onChange={(e) => handleItemNameChange(e.target.value)}
                       onKeyPress={(e) => handleKeyPress(e, quantityRef)}
                       placeholder="Type item name to search..."
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     />
                     
                     {/* Clean Dropdown */}
                     {showSuggestions && itemSuggestions.length > 0 && (
                       <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                         {itemSuggestions.map((item) => (
                           <button
                        key={item._id}
                             onClick={() => handleItemSelect(item)}
                             className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                           >
                             <div className="font-medium text-gray-900">{item.name}</div>
                             <div className="text-sm text-gray-500">{item.itemCode} • Rs. {item.retailPrice} • Stock: {item.quantityInStock}</div>
                           </button>
                         ))}
                                </div>
                     )}
                              </div>
                            </div>

                                  {/* Item Details Row */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                     <input
                       type="text"
                       value={location}
                       readOnly
                       className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                     />
                              </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                     <input
                       type="text"
                       value={unitPrice ? `Rs. ${unitPrice}` : ''}
                       readOnly
                       className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                     />
                            </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                  <input
                       ref={quantityRef}
                                    type="number"
                                    min="1"
                       max={selectedItem ? selectedItem.quantityInStock : ''}
                                    value={quantity}
                       onChange={(e) => setQuantity(e.target.value)}
                       onKeyPress={(e) => handleKeyPress(e, discountPercentRef)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                                <input
                       ref={discountPercentRef}
                                  type="number"
                                  min="0"
                                  max="100"
                       step="0.1"
                       value={discountPercent}
                       onChange={(e) => setDiscountPercent(e.target.value)}
                       onFocus={(e) => e.target.select()}
                       onKeyPress={(e) => {
                         if (e.key === 'Enter') {
                           e.preventDefault();
                           handleAddToCart();
                         }
                       }}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     />
                   </div>
                              </div>

                {/* Calculation & Add Button */}
                <div className="flex justify-between items-center">
                  <div className="text-lg">
                    <span className="text-gray-600">Total: </span>
                    <span className="font-bold text-gray-900">Rs. {totalPrice}</span>
                    {discountPercent > 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        (Save Rs. {discountAmount})
                      </span>
                    )}
                  </div>
                                
                                <button
                    onClick={handleAddToCart}
                    disabled={!selectedItem || addToCartLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                  >
                    {addToCartLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <FiPlus size={16} />
                    )}
                    {addToCartLoading ? 'Adding...' : 'Add to Cart'}
                                </button>
                              </div>
                            </div>
                          </div>

            {/* Clean Cart Table */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FiShoppingCart className="mr-2 text-blue-600" />
                  Shopping Cart ({cartItems.length} items)
                </h2>
                        </div>
              
              <div className="p-6">
            {cartItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 font-medium text-gray-700">Item</th>
                          <th className="text-center py-3 font-medium text-gray-700">Qty</th>
                          <th className="text-right py-3 font-medium text-gray-700">Price</th>
                          <th className="text-right py-3 font-medium text-gray-700">Disc%</th>
                          <th className="text-right py-3 font-medium text-gray-700">Total</th>
                          <th className="text-center py-3 font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {cartItems.map((item) => (
                        <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3">
                                <div>
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  <div className="text-sm text-gray-500">{item.code}</div>
                            </div>
                          </td>
                              <td className="py-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateCartQuantity(item.id, parseInt(e.target.value))}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="py-3 text-right text-gray-700">Rs. {item.price.toFixed(2)}</td>
                              <td className="py-3 text-right text-gray-700">{item.discountPercent.toFixed(1)}%</td>
                              <td className="py-3 text-right font-medium text-gray-900">Rs. {item.lineTotal.toFixed(2)}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  disabled={removingItems.has(item.id)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {removingItems.has(item.id) ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"
                                    />
                                  ) : (
                                    <FiTrash2 size={16} />
                                  )}
                                </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FiShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">Cart is empty</p>
                    <p className="text-sm">Add items to start a sale</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clean Sidebar - Summary & Payment */}
          <div className="space-y-6">
            
            {/* Summary */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800">Order Summary</h3>
                </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Total</span>
                  <span className="font-medium">Rs. {grossValue.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Extra Discount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={finalDiscount}
                    onChange={(e) => setFinalDiscount(e.target.value)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Total</span>
                    <span className="text-blue-800">Rs. {netValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="px-6 py-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800">Payment</h3>
                </div>

                            <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer NIC</label>
                  <div className="flex gap-2">
                  <input
                      ref={customerNicRef}
                      type="text"
                      value={customerNic}
                      onChange={(e) => handleCustomerNicChange(e.target.value)}
                      onBlur={handleCustomerNicBlur}
                      onKeyPress={handleCustomerNicKeyPress}
                      placeholder="Enter NIC number"
                      className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        nicError ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    <button
                      onClick={handleCustomerNicBlur}
                      disabled={customerSearching || !!nicError}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {customerSearching ? '⏳' : 'Find'}
                    </button>
                </div>
                {nicError && (
                  <p className="mt-1 text-sm text-red-600">{nicError}</p>
                )}
                  </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      placeholder={paymentType === 'credit' ? 'Required for credit' : 'Enter customer name'}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                        paymentType === 'credit' ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    
                    {/* Customer Suggestions Dropdown */}
                    {showCustomerSuggestions && customerSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {customerSuggestions.map((customer) => (
                          <button
                            key={customer._id}
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.nic} • {customer.customerType} • 
                              {customer.totalSpent > 0 ? ` Rs. ${customer.totalSpent.toFixed(2)} spent` : ' New customer'}
                              {customer.phone && ` • ${customer.phone}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
              </div>
                  
                  {selectedCustomer && (
                    <div className={`mt-2 p-3 rounded-md text-sm ${
                      (() => {
                        const customerStatus = selectedCustomer.status || selectedCustomer.customerStatus;
                        
                        if (customerStatus === 'banned') return 'bg-red-50 border border-red-200';
                        if (customerStatus === 'suspended') return 'bg-orange-50 border border-orange-200';
                        if (customerStatus === 'inactive') return 'bg-yellow-50 border border-yellow-200';
                        if (customerStatus === 'dormant') return 'bg-gray-50 border border-gray-200';
                        return 'bg-green-50 border border-green-200'; // active or default
                      })()
                    }`}>
                      <div className={`font-medium ${
                        (() => {
                          const customerStatus = selectedCustomer.status || selectedCustomer.customerStatus;
                          
                          if (customerStatus === 'banned') return 'text-red-800';
                          if (customerStatus === 'suspended') return 'text-orange-800';
                          if (customerStatus === 'inactive') return 'text-yellow-800';
                          if (customerStatus === 'dormant') return 'text-gray-800';
                          return 'text-green-800'; // active or default
                        })()
                      }`}>
                        Total Purchases: {selectedCustomer.purchaseCount} • Total Spent: Rs. {selectedCustomer.totalSpent.toFixed(2)}
                      </div>
                    </div>
                  )}
      </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone (Optional)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
              <input
                    ref={paidAmountRef}
                type="number"
                min="0"
                step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-right font-medium"
              />
            </div>

                {paidAmount && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance</span>
                      <span className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Rs. {Math.abs(balance).toFixed(2)} {balance >= 0 ? 'to return' : 'due'}
                    </span>
          </div>
        </div>
      )}

              <button
                  onClick={handleCloseSale}
                  disabled={isProcessing || cartItems.length === 0 || !paidAmount}
                  className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <FiPrinter size={18} />
                      Complete Sale
                    </>
                  )}
              </button>
            </div>
          </div>
        </div>
            </div>
          </div>
    </div>
  );
};

export default PointOfSale; 