import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiX, FiHome, FiUsers, FiPackage,
  FiLogOut, FiPlus, FiShoppingCart, FiTrendingUp, FiBarChart
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    // Main Operations
    { path: '/pos', label: 'POS', icon: FiShoppingCart, roles: ['admin', 'user'] },
    
    // Inventory Management
    { path: '/inventory', label: 'Inventory', icon: FiPackage, roles: ['admin', 'user'] },
    { path: '/add-new-item', label: 'Add Item', icon: FiPlus, roles: ['admin'] },
    { path: '/add-stocks', label: 'Add Stocks', icon: FiPlus, roles: ['admin'] },
    
    // Reports & Analytics
    { path: '/dashboard', label: 'Dashboard', icon: FiHome, roles: ['admin'] },
    { path: '/item-balance', label: 'Item Balance', icon: FiTrendingUp, roles: ['admin'] },
    { path: '/sales-history', label: 'Sales History', icon: FiBarChart, roles: ['admin'] },
    
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
        className={`
          group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium
          relative
          ${isItemActive
            ? "bg-gradient-to-r from-blue-700/90 to-blue-600/80 text-white shadow-lg"
            : "text-blue-100 hover:bg-blue-600/10 hover:text-white"
          }
        `}
      >
        <Icon className="text-lg" />
        <span className="">{item.label}</span>
        {isItemActive && (
          <motion.div
            layoutId="underline"
            className="absolute left-2 bottom-1 right-2 h-0.5 bg-red-500 rounded-full"
          />
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-blue-950/80 backdrop-blur-lg border-b border-blue-900 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Desktop Navigation */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2 mr-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-8 h-8 bg-gradient-to-br from-red-500 via-orange-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0"
              >
                <span className="text-white font-bold text-sm">R</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <div className="text-white font-bold text-base leading-tight whitespace-nowrap">
                  Ruhunu Tyre House
                </div>
                <div className="text-blue-200 text-xs font-medium whitespace-nowrap">
                  POS System
                </div>
              </motion.div>
            </Link>
            <div className="hidden lg:flex gap-1">
              {navItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          </div>
          {/* User panel and Mobile menu button */}
          <div className="flex items-center">
            <div className="hidden md:flex items-center space-x-4">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                flex items-center gap-3 px-3 py-2
                bg-gradient-to-br from-blue-800/60 via-blue-950/60 to-blue-900/70
                border border-blue-800/60
                rounded-xl shadow-md
                backdrop-blur-[2px]
                hover:shadow-lg
                transition-all duration-200
                min-w-[160px]
              "
            >
              <div className="flex-shrink-0">
                <div className="
                  w-8 h-8 md:w-10 md:h-10
                  rounded-full
                  bg-gradient-to-tr from-blue-500 via-blue-700 to-blue-800
                  flex items-center justify-center
                  text-white text-base md:text-lg font-bold
                  shadow-inner
                  ring-2 ring-blue-500/40
                  ">
                  {user?.name?.charAt(0) || "?"}
                </div>
              </div>
              <div className="flex flex-col justify-center leading-tight min-w-0">
                <span className="truncate font-semibold text-white text-[1rem] md:text-base">{user?.name}</span>
                <span className="truncate text-blue-200 text-xs tracking-wide">{user?.role}</span>
              </div>
            </motion.div>

              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-150 shadow-md hover:shadow-xl"
                title="Logout"
              >
                <FiLogOut />
              </motion.button>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <motion.button
                whileHover={{ scale: 1.10 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="text-blue-200 hover:text-white p-2 rounded-lg border border-blue-700 bg-blue-950/40 shadow"
                aria-label="Open Menu"
              >
                {isMobileMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -30, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -30, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden absolute left-0 right-0 bg-blue-950/95 border-t border-blue-900 shadow-2xl backdrop-blur-2xl z-50"
          >
            <div className="px-2 pt-3 pb-3 flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
              <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-900/60 border border-blue-700/50 shadow-inner backdrop-blur-sm">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg shadow">
                    {user?.name?.charAt(0) || '?'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-bold text-white">{user?.name}</div>
                  <div className="text-xs font-medium text-blue-200">{user?.role}</div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 mt-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-150 shadow-lg hover:shadow-xl"
              >
                <FiLogOut />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
