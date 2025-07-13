import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiX, FiHome, FiUsers, FiPackage,
  FiLogOut, FiPlus, FiShoppingCart, FiTrendingUp, FiBarChart,
  FiChevronRight, FiChevronLeft, FiFileText, FiSearch, FiActivity, FiEdit2
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { COMPANY, UI } from '../constants/appConfig';

const SideNav = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    // Main Operations
    { path: '/pos', label: 'POS', icon: FiShoppingCart, roles: ['admin', 'user'] },
    
    // Inventory Management
    { path: '/inventory', label: 'Inventory', icon: FiPackage, roles: ['admin', 'user'] },
    { path: '/add-new-item', label: 'Add Item', icon: FiPlus, roles: ['admin'] },
    { path: '/edit-item', label: 'Edit Item', icon: FiEdit2, roles: ['admin'] },
    { path: '/add-stocks', label: 'Add Stocks', icon: FiPlus, roles: ['admin'] },
    
    // Reports & Analytics
    { path: '/dashboard', label: 'Dashboard', icon: FiHome, roles: ['admin'] },
    { path: '/analytics', label: 'Analytics Dashboard', icon: FiTrendingUp, roles: ['admin'] },
    { path: '/item-balance', label: 'Item Balance', icon: FiBarChart, roles: ['admin'] },
    { path: '/sales-history', label: 'Sales History', icon: FiBarChart, roles: ['admin'] },
    { path: '/sales-reports', label: 'Sales Reports', icon: FiFileText, roles: ['admin'] },
    { path: '/item-sales-report', label: 'Item Sales Report', icon: FiPackage, roles: ['admin'] },
    { path: '/search', label: 'Search Bills', icon: FiSearch, roles: ['admin'] },
    
    // Customer Management
    { path: '/clients', label: 'Clients', icon: FiUsers, roles: ['admin'] },
    
    // System Monitoring
    { path: '/logs', label: 'Activity Logs', icon: FiActivity, roles: ['admin'] },
    
    // User Management
    { path: '/users', label: 'Users', icon: FiUsers, roles: ['admin'] }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const isItemActive = isActive(item.path);
    const isAuthorized = item.roles.includes(user?.role);

    if (!isAuthorized) return null;

    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`
          group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 font-medium
          relative overflow-hidden
          ${isItemActive
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          }
        `}
        title={!isExpanded ? item.label : ''}
      >
        <Icon className={`text-lg flex-shrink-0 ${isExpanded ? '' : 'mx-auto'}`} />
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {isItemActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute right-0 top-0 bottom-0 w-1 bg-blue-400 rounded-l-full"
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-blue-600 bg-white border-2 border-blue-200 p-3 rounded-lg shadow-lg hover:bg-blue-50"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </motion.button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ width: isExpanded ? 280 : 80 }}
        animate={{ 
          width: isExpanded ? 280 : 80,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`
          bg-white border-r-2 border-blue-200 
          h-screen z-50 shadow-lg flex flex-col
          hidden md:flex
        `}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-blue-100">
          <div className="flex items-center justify-between">
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-bold text-lg">R</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-gray-800 font-bold text-lg leading-tight whitespace-nowrap">
                    {COMPANY.NAME}
                    </div>
                    <div className="text-blue-600 text-sm font-medium whitespace-nowrap">
                    {UI.SIDEBAR_TITLE}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
              aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isExpanded ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
            </motion.button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t-2 border-blue-100">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="
                  flex items-center gap-3 p-3 mb-3
                  bg-blue-50 border-2 border-blue-200
                  rounded-lg shadow-sm
                "
              >
                <div className="flex-shrink-0">
                  <div className="
                    w-10 h-10
                    rounded-full
                    bg-gradient-to-br from-blue-600 to-blue-700
                    flex items-center justify-center
                    text-white text-lg font-bold
                    shadow-sm
                    border-2 border-blue-300
                    ">
                    {user?.name?.charAt(0) || "?"}
                  </div>
                </div>
                <div className="flex flex-col justify-center leading-tight min-w-0">
                  <span className="truncate font-semibold text-gray-800 text-base">{user?.name}</span>
                  <span className="truncate text-blue-600 text-sm tracking-wide">{user?.role}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={`
              flex items-center gap-3 w-full px-3 py-3 
              bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
              font-semibold hover:from-blue-700 hover:to-blue-800 
              transition-all duration-150 shadow-md hover:shadow-lg
              ${!isExpanded ? 'justify-center' : ''}
            `}
            title={!isExpanded ? "Logout" : ''}
          >
            <FiLogOut className="flex-shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

            {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden fixed left-0 top-0 bottom-0 w-80 bg-white border-r-2 border-blue-200 z-50 shadow-xl flex flex-col"
          >
            {/* Mobile Header */}
            <div className="p-4 border-b-2 border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-bold text-lg">R</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-gray-800 font-bold text-lg leading-tight whitespace-nowrap">
                    {COMPANY.NAME}
                  </div>
                  <div className="text-blue-600 text-sm font-medium whitespace-nowrap">
                    {UI.SIDEBAR_TITLE}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Items */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink key={`mobile-${item.path}`} item={item} />
              ))}
            </div>

            {/* Mobile User Profile & Logout */}
            <div className="p-4 border-t-2 border-blue-100">
              <div className="
                flex items-center gap-3 p-3 mb-3
                bg-blue-50 border-2 border-blue-200
                rounded-lg shadow-sm
              ">
                <div className="flex-shrink-0">
                  <div className="
                    w-10 h-10
                    rounded-full
                    bg-gradient-to-br from-blue-600 to-blue-700
                    flex items-center justify-center
                    text-white text-lg font-bold
                    shadow-sm
                    border-2 border-blue-300
                    ">
                    {user?.name?.charAt(0) || "?"}
                  </div>
                </div>
                <div className="flex flex-col justify-center leading-tight min-w-0">
                  <span className="truncate font-semibold text-gray-800 text-base">{user?.name}</span>
                  <span className="truncate text-blue-600 text-sm tracking-wide">{user?.role}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="
                  flex items-center gap-3 w-full px-3 py-3 
                  bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                  font-semibold hover:from-blue-700 hover:to-blue-800 
                  transition-all duration-150 shadow-md hover:shadow-lg
                "
              >
                <FiLogOut className="flex-shrink-0" />
                <span className="whitespace-nowrap">Logout</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SideNav; 
 
 



