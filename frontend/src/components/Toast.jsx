import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'success', onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg border ${
          type === 'success' 
            ? 'bg-slate-800/90 border-slate-700 text-slate-200' 
            : 'bg-slate-800/90 border-slate-700 text-slate-200'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-4 text-slate-400 hover:text-slate-200 focus:outline-none"
          >
            ×
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast; 