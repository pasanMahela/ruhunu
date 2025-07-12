import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiClock, FiPlus, FiTrash2, FiSend, FiX, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const EmailSubscriptionModal = ({ 
  isOpen, 
  onClose, 
  emailSubscriptions, 
  onAddEmail, 
  onRemoveEmail, 
  onUpdateSchedule, 
  onSendNow,
  loading,
  sendingNow 
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if email already exists
    if (emailSubscriptions.some(sub => sub.email === newEmail.trim())) {
      toast.error('This email is already subscribed');
      return;
    }

    onAddEmail(newEmail.trim(), scheduleTime);
    setNewEmail('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddEmail();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <FiMail className="mr-2 text-blue-600" />
              Email Report Subscriptions
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Add New Email Section */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <FiPlus className="mr-2 text-blue-600" />
                Add New Email Subscription
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter email address..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Send Time
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleAddEmail}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <FiPlus size={16} />
                )}
                Add Subscription
              </button>
            </div>

            {/* Current Subscriptions */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <FiMail className="mr-2 text-green-600" />
                Current Subscriptions ({emailSubscriptions.length})
              </h3>
              
              {emailSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMail className="mx-auto text-4xl mb-2 text-gray-300" />
                  <p>No email subscriptions yet</p>
                  <p className="text-sm">Add an email above to start receiving daily reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emailSubscriptions.map((subscription) => (
                    <motion.div
                      key={subscription._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${subscription.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-medium text-gray-800">{subscription.email}</p>
                          <p className="text-sm text-gray-500">
                            Daily at {subscription.scheduleTime} • 
                            {subscription.isActive ? ' Active' : ' Inactive'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={subscription.scheduleTime}
                          onChange={(e) => onUpdateSchedule(subscription._id, e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => onRemoveEmail(subscription._id)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove subscription"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Now Section */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                <FiSend className="mr-2 text-green-600" />
                Send Report Now
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Send the current report immediately to all subscribed emails
              </p>
              
              <button
                onClick={onSendNow}
                disabled={sendingNow || emailSubscriptions.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingNow ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <FiSend size={16} />
                )}
                {sendingNow ? 'Sending...' : `Send to ${emailSubscriptions.length} email(s)`}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
            >
              <FiCheck size={16} />
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmailSubscriptionModal; 