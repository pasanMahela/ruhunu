const Item = require('../models/Item');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');

// Enhanced chatbot controller with smart features and error handling
class ChatbotController {
  // Main chat handler
  handleChat = async (req, res) => {
    try {
      const { message, userId } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      const userMessage = message.toLowerCase().trim();
      const response = await this.processMessage(userMessage, userId);
      
      res.json({
        success: true,
        data: {
          userMessage: message,
          botResponse: response.text,
          data: response.data || null,
          suggestions: response.suggestions || []
        }
      });
    } catch (error) {
      console.error('Chatbot error:', error);
      res.status(500).json({
        success: false,
        error: 'Sorry, I encountered an error. Please try again.'
      });
    }
  }

  // Process message with pattern matching
  processMessage = async (message, userId) => {
    try {
      // Check for different query types - order matters for priority
      if (this.isGreeting(message)) {
        return this.handleGreeting();
      } else if (this.isHelpQuery(message)) {
        return this.handleHelpQuery();
      } else if (this.isCustomerQuery(message)) {
        return await this.handleCustomerQuery(message);
      } else if (this.isSalesQuery(message)) {
        return await this.handleSalesQuery(message);
      } else if (this.isStockQuery(message)) {
        return await this.handleStockQuery(message);
      } else {
        return this.handleUnknownQuery(message);
      }
    } catch (error) {
      console.error('Message processing error:', error);
      return {
        text: '❌ Sorry, I had trouble processing your message. Please try again.',
        suggestions: ['Try again', 'Show help', 'Say hello']
      };
    }
  }

  // Pattern matching functions
  isGreeting = (message) => {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.includes(greeting));
  }

  isHelpQuery = (message) => {
    const helpKeywords = ['help', 'what can', 'how to', 'commands', 'options', 'guide'];
    return helpKeywords.some(keyword => message.includes(keyword));
  }

  isStockQuery = (message) => {
    // More specific stock query patterns
    const stockPatterns = [
      'check stock',
      'stock level',
      'stock overview',
      'inventory level',
      'inventory overview',
      'available stock',
      'how many items',
      'total items',
      'low stock',
      'out of stock',
      'stock report',
      'inventory report',
      'find item',
      'search item',
      'item details',
      'product details',
      'tyre stock',
      'tire stock'
    ];
    
    return stockPatterns.some(pattern => message.includes(pattern)) ||
           (message.includes('stock') && !message.includes('customer')) ||
           (message.includes('inventory') && !message.includes('customer')) ||
           (message.includes('item') && !message.includes('customer'));
  }

  isSalesQuery = (message) => {
    const salesKeywords = ['sales', 'sold', 'revenue', 'profit', 'today', 'yesterday', 'week', 'month', 'report', 'total', 'earning'];
    return salesKeywords.some(keyword => message.includes(keyword));
  }

  isCustomerQuery = (message) => {
    // More specific customer query patterns
    const customerPatterns = [
      'find customer',
      'search customer',
      'customer details',
      'customer info',
      'customer data',
      'show customer',
      'get customer',
      'customer nic',
      'customer phone',
      'customer contact',
      'customer name',
      'client details',
      'client info',
      'find client',
      'search client'
    ];
    
    return customerPatterns.some(pattern => message.includes(pattern)) ||
           (message.includes('customer') && !message.includes('stock') && !message.includes('inventory'));
  }

  // Query handlers
  handleGreeting = () => {
    const greetings = [
      "Hello! 👋 I'm your inventory assistant. How can I help you today?",
      "Hi there! 😊 Ready to help with your inventory and sales queries!",
      "Hey! 🎉 What would you like to know about your store today?"
    ];
    
    return {
      text: greetings[Math.floor(Math.random() * greetings.length)],
      suggestions: ['Check stock', 'Today\'s sales', 'Find customer', 'Show help']
    };
  }

  handleHelpQuery = () => {
    return {
      text: `🤖 **I can help you with:**\n\n📦 **Inventory:**\n• "Check stock for [item name]"\n• "Show low stock items"\n• "Find [item code]"\n\n💰 **Sales:**\n• "Today's sales"\n• "Show recent sales"\n• "Sales report"\n\n👥 **Customers:**\n• "Find customer [name/NIC]"\n• "Customer details"\n• "Total customers"\n\n**Quick Commands:**\n• Type "stock" for inventory overview\n• Type "sales" for sales summary\n• Type "help" for this guide`,
      suggestions: ['Check stock', 'Today\'s sales', 'Find customer', 'Show commands']
    };
  }

  handleStockQuery = async (message) => {
    try {
      // Check for specific stock queries
      if (message.includes('low stock') || message.includes('low inventory')) {
        const lowStockItems = await Item.find({ 
          $expr: { $lte: ['$quantityInStock', '$lowerLimit'] } 
        }).limit(10);
        
        if (lowStockItems.length > 0) {
          const itemsList = lowStockItems.map(item => 
            `• **${item.name}** (${item.itemCode}) - ${item.quantityInStock} units`
          ).join('\n');
          
          return {
            text: `⚠️ **Low Stock Items (${lowStockItems.length})**\n\n${itemsList}\n\nThese items need restocking soon!`,
            data: { lowStockItems },
            suggestions: ['Check specific item', 'View all inventory', 'Today\'s sales']
          };
        } else {
          return {
            text: '✅ Great news! No items are currently low on stock.',
            suggestions: ['Check inventory', 'Today\'s sales', 'Find customer']
          };
        }
      }

      // General stock overview
      const totalItems = await Item.countDocuments();
      const lowStockCount = await Item.countDocuments({ 
        $expr: { $lte: ['$quantityInStock', '$lowerLimit'] } 
      });
      const outOfStockCount = await Item.countDocuments({ quantityInStock: 0 });

      return {
        text: `📊 **Stock Overview**\n• **Total Items:** ${totalItems}\n• **Low Stock:** ${lowStockCount} items\n• **Out of Stock:** ${outOfStockCount} items\n\nWhat would you like to check specifically?`,
        suggestions: ['Show low stock items', 'Find specific item', 'Today\'s sales']
      };
    } catch (error) {
      console.error('Stock query error:', error);
      return {
        text: '❌ Sorry, I had trouble checking the stock. The inventory system might be updating.',
        suggestions: ['Try again', 'Show help', 'Today\'s sales']
      };
    }
  }

  handleSalesQuery = async (message) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      if (message.includes('today')) {
        const todaySales = await Sale.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfDay, $lt: endOfDay }
            }
          },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$total' },
              totalTransactions: { $sum: 1 }
            }
          }
        ]);

        const salesData = todaySales[0] || { totalSales: 0, totalTransactions: 0 };
        
        return {
          text: `📈 **Today's Sales**\n• **Total Sales:** Rs. ${salesData.totalSales.toFixed(2)}\n• **Transactions:** ${salesData.totalTransactions}\n\nGreat work! 🎉`,
          data: salesData,
          suggestions: ['Check stock', 'Find customer', 'Show help']
        };
      } else {
        // General sales info
        const recentSales = await Sale.find()
          .sort({ createdAt: -1 })
          .limit(5);

        const salesCount = recentSales.length;
        const totalValue = recentSales.reduce((sum, sale) => sum + (sale.total || 0), 0);

        return {
          text: `💰 **Recent Sales Activity**\n• **Last ${salesCount} transactions:** Rs. ${totalValue.toFixed(2)}\n• **Latest sale:** ${recentSales[0] ? recentSales[0].createdAt.toLocaleDateString() : 'No sales yet'}\n\nWhat specific sales info do you need?`,
          data: { recentSales: salesCount },
          suggestions: ['Today\'s sales', 'Check stock', 'Find customer']
        };
      }
    } catch (error) {
      console.error('Sales query error:', error);
      return {
        text: '❌ Sorry, I had trouble getting sales data. The sales system might be updating.',
        suggestions: ['Try again', 'Check stock', 'Show help']
      };
    }
  }

  handleCustomerQuery = async (message) => {
    try {
      // Check if user is looking for a specific customer
      const words = message.split(' ');
      const customerKeywordIndex = words.findIndex(word => 
        ['customer', 'client'].includes(word.toLowerCase())
      );
      
      // If there's a name or NIC after "customer" or "client"
      if (customerKeywordIndex !== -1 && words[customerKeywordIndex + 1]) {
        const searchTerm = words.slice(customerKeywordIndex + 1).join(' ');
        
        // Search for customer by name or NIC
        const customers = await Customer.find({
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { nic: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } }
          ]
        }).limit(5);
        
        if (customers.length > 0) {
          const customersList = customers.map(customer => 
            `• **${customer.name}**\n  NIC: ${customer.nic || 'N/A'}\n  Phone: ${customer.phone || 'N/A'}\n  Address: ${customer.address || 'N/A'}`
          ).join('\n\n');
          
          return {
            text: `👥 **Found ${customers.length} customer(s) matching "${searchTerm}":**\n\n${customersList}`,
            data: { customers },
            suggestions: ['Find another customer', 'Check stock', 'Today\'s sales']
          };
        } else {
          return {
            text: `❌ No customers found matching "${searchTerm}". Please check the spelling or try a different search term.`,
            suggestions: ['Try different name', 'Show all customers', 'Check stock']
          };
        }
      }
      
      // General customer query - ask for specific details
      const totalCustomers = await Customer.countDocuments();
      
      return {
        text: `👥 **Customer Search**\n• **Total Customers:** ${totalCustomers}\n\n🔍 **To find a specific customer, please provide:**\n• Customer name (e.g., "Find customer John")\n• NIC number (e.g., "Find customer 123456789V")\n• Phone number (e.g., "Find customer 0771234567")\n\nWhat customer would you like to find?`,
        data: { totalCustomers },
        suggestions: ['Find customer John', 'Find customer 123456789V', 'Check stock', 'Today\'s sales']
      };
    } catch (error) {
      console.error('Customer query error:', error);
      return {
        text: '❌ Sorry, I had trouble finding customer information. The customer system might be updating.',
        suggestions: ['Try again', 'Check stock', 'Show help']
      };
    }
  }

  handleUnknownQuery = (message) => {
    return {
      text: `🤔 I'm not sure what you're looking for. Try asking about:\n• Stock levels ("check stock")\n• Sales data ("today's sales")\n• Customer info ("find customer")\n• Or type "help" for more options`,
      suggestions: ['Show help', 'Check stock', 'Today\'s sales', 'Find customer']
    };
  }

  // Get quick suggestions
  getQuickSuggestions = async (req, res) => {
    try {
      const suggestions = [
        'Check stock levels',
        'Today\'s sales',
        'Low stock items',
        'Find customer',
        'Show help'
      ];

      res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Could not load suggestions'
      });
    }
  }
}

module.exports = new ChatbotController(); 