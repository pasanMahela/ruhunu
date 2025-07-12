const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');

// All chatbot routes require authentication
router.use(protect);

// Main chat endpoint
router.post('/chat', chatbotController.handleChat);

// Get quick suggestions
router.get('/suggestions', chatbotController.getQuickSuggestions);

module.exports = router; 