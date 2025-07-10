import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'success', onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg border-2 ${
          type === 'success' 
            ? 'bg-white border-green-300 text-green-800' 
            : 'bg-white border-red-300 text-red-800'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-4 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            ×
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast; 