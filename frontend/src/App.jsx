import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Inventory from './pages/Inventory';
import UserManagement from './components/UserManagement';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AddStocks from './pages/AddStocks';
import LoginPage from './pages/LoginPage';
import AddNewItem from './pages/AddNewItem';
import PointOfSale from './pages/PointOfSale';
import SalesHistory from './pages/SalesHistory';
import { FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Enhanced Protected Route component with role-based access
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is empty, allow all authenticated users
  if (allowedRoles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  // Check if user's role is in allowedRoles
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-300">Access Denied</h2>
            <p className="text-slate-400 mt-2">You don't have permission to access this page.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/pos')}
              className="mt-6 px-6 py-2 bg-slate-700 text-white rounded-lg flex items-center space-x-2 mx-auto hover:bg-slate-600 transition-colors"
            >
              <FiArrowLeft className="text-lg" />
              <span>Back to POS</span>
            </motion.button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes - Admin Only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-new-item"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AddNewItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-stocks"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AddStocks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-history"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SalesHistory />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Admin and User */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={['admin', 'user']}>
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'user']}>
                <PointOfSale />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
