import React from 'react';
import { FiUser, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const PageHeader = ({ title, subtitle, icon: Icon }) => {
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white border-b border-blue-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side - Page title */}
          <div className="flex items-center gap-3">
            {Icon && <Icon className="text-blue-600 text-xl mr-3" />}
            <div>
              <h1 className="text-2xl font-bold text-blue-800 flex items-center">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side - User info and date */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FiUser className="text-blue-600" />
              {user?.name || 'Unknown User'}
            </span>
            <span className="flex items-center gap-1">
              <FiCalendar className="text-blue-600" />
              {currentDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader; 