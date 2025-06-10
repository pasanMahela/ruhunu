# Backend API

A secure REST API built with Node.js, Express, and MongoDB.

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/your-database-name
   JWT_SECRET=your-secret-key
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. For production:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user (admin only)
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Users
- GET `/api/users` - Get all users (admin only)
- GET `/api/users/:id` - Get user by ID
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user (admin only)

## Project Structure
```
backend/
├── models/         # Database models
├── controllers/    # Route controllers
├── routes/         # API routes
├── middleware/     # Custom middleware
├── index.js        # Server entry point
└── .env           # Environment variables
``` 