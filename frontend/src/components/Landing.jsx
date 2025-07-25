import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { COMPANY } from '../constants/appConfig';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-transparent mb-6"
          >
            {COMPANY.FULL_NAME}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-600 text-lg sm:text-xl max-w-3xl mx-auto mb-8"
          >
            Streamline your inventory management with our powerful and intuitive system.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl border border-blue-500"
            >
              Get Started
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Real-time Tracking</h3>
            <p className="text-gray-600">
              Monitor your inventory levels in real-time with our advanced tracking system.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Smart Analytics</h3>
            <p className="text-gray-600">
              Get valuable insights with detailed reports and analytics to optimize your inventory.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-200 shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">User Management</h3>
            <p className="text-gray-600">
              Manage user access and permissions with our comprehensive user management system.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing; 