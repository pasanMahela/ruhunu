import { motion } from 'framer-motion';

const Loading = ({ message = 'Loading...', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-16 h-16 border-4', 
    lg: 'w-24 h-24 border-6'
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center ${className}`}>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
        className={`${sizeClasses[size]} border-blue-300 border-t-blue-600 rounded-full`}
      />
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-gray-600 text-sm font-medium"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

export default Loading; 
 
 
 
 