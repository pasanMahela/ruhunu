import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiSearch, FiFilter, FiPlus, FiEdit2, FiShield, FiKey, FiImage, FiDownload, FiUpload, FiMoreVertical, FiEye, FiEyeOff, FiMail, FiCalendar, FiActivity } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import Toast from './Toast';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import ConfirmModal from './ConfirmModal';
import Loading from './Loading';
import { API_URL } from '../services/api';
import PageHeader from './PageHeader';

// User permissions configuration
const USER_PERMISSIONS = {
  inventory: {
    label: 'Inventory Management',
    permissions: ['view', 'add', 'edit', 'delete', 'export']
  },
  sales: {
    label: 'Sales Management',
    permissions: ['view', 'create', 'edit', 'delete', 'reports']
  },
  users: {
    label: 'User Management',
    permissions: ['view', 'add', 'edit', 'delete', 'permissions']
  },
  analytics: {
    label: 'Analytics & Reports',
    permissions: ['view', 'export', 'advanced']
  },
  settings: {
    label: 'System Settings',
    permissions: ['view', 'edit', 'backup', 'restore']
  }
};

// Default role permissions
const DEFAULT_PERMISSIONS = {
  admin: {
    inventory: ['view', 'add', 'edit', 'delete', 'export'],
    sales: ['view', 'create', 'edit', 'delete', 'reports'],
    users: ['view', 'add', 'edit', 'delete', 'permissions'],
    analytics: ['view', 'export', 'advanced'],
    settings: ['view', 'edit', 'backup', 'restore']
  },
  manager: {
    inventory: ['view', 'add', 'edit', 'export'],
    sales: ['view', 'create', 'edit', 'reports'],
    users: ['view'],
    analytics: ['view', 'export'],
    settings: ['view']
  },
  user: {
    inventory: ['view'],
    sales: ['view', 'create'],
    users: [],
    analytics: ['view'],
    settings: []
  }
};

const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  const initials = user.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      {user.profilePicture ? (
        <img
          src={user.profilePicture}
          alt={user.name}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-md`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white shadow-md ${
          user.role === 'admin' 
            ? 'bg-gradient-to-br from-purple-600 to-purple-700' 
            : user.role === 'manager'
            ? 'bg-gradient-to-br from-blue-600 to-blue-700'
            : 'bg-gradient-to-br from-green-600 to-green-700'
        }`}>
          {initials}
        </div>
      )}
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
        user.isActive ? 'bg-green-500' : 'bg-red-500'
      }`} />
    </div>
  );
};

const PermissionsModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setPermissions(user.permissions || DEFAULT_PERMISSIONS[user.role] || {});
    }
  }, [user]);

  const handlePermissionToggle = (module, permission) => {
    setPermissions(prev => ({
      ...prev,
      [module]: prev[module] ? 
        prev[module].includes(permission) 
          ? prev[module].filter(p => p !== permission)
          : [...prev[module], permission]
        : [permission]
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${user._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissions })
      });

      if (!response.ok) throw new Error('Failed to update permissions');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 text-white">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FiShield className="w-5 h-5" />
            Manage Permissions - {user?.name}
          </h3>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="space-y-6">
            {Object.entries(USER_PERMISSIONS).map(([module, config]) => (
              <div key={module} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">{config.label}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {config.permissions.map(permission => (
                    <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions[module]?.includes(permission) || false}
                        onChange={() => handlePermissionToggle(module, permission)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PasswordResetModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/users/${user._id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) throw new Error('Failed to reset password');
      
      onSuccess();
      onClose();
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-md w-full shadow-2xl"
      >
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 text-white">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FiKey className="w-5 h-5" />
            Reset Password - {user?.name}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Confirm new password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={loading || !newPassword || !confirmPassword}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProfilePictureModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('profilePicture', selectedFile);

    try {
      const response = await fetch(`${API_URL}/users/${user._id}/profile-picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload image');
      
      onSuccess();
      onClose();
      setSelectedFile(null);
      setPreview('');
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-md w-full shadow-2xl"
      >
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FiImage className="w-5 h-5" />
            Update Profile Picture - {user?.name}
          </h3>
        </div>

        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
                />
                <button
                  onClick={() => { setSelectedFile(null); setPreview(''); }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <FiImage className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-gray-600">Drop an image here or</p>
                  <label className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { user: currentUser } = useAuth();

  const BACKEND_API_URL = API_URL;

  const fetchUsers = async () => {
    try {
      const response = await fetch(BACKEND_API_URL+'/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handlePermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handlePasswordReset = (user) => {
    setSelectedUser(user);
    setShowPasswordResetModal(true);
  };

  const handleProfilePicture = (user) => {
    setSelectedUser(user);
    setShowProfilePictureModal(true);
  };

  const handleStatusToggle = (user) => {
    setSelectedUser(user);
    setShowConfirmModal(true);
  };

  const handleStatusConfirm = async () => {
    try {
      const response = await fetch(BACKEND_API_URL+`/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...selectedUser,
          isActive: !selectedUser.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      setToast({
        show: true,
        message: `User ${selectedUser.isActive ? 'deactivated' : 'activated'} successfully`,
        type: 'success'
      });
      fetchUsers();
    } catch (err) {
      setToast({
        show: true,
        message: err.message,
        type: 'error'
      });
    } finally {
      setShowConfirmModal(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const userStats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    users: users.filter(u => u.role === 'user').length
  };

  if (!currentUser?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading message="Loading users..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PageHeader 
        title="User Management" 
        subtitle="Manage users, roles, and permissions"
        icon={FiUsers}
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 rounded-lg p-4 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-gray-800">{userStats.total}</p>
              </div>
              <FiUsers className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/90 rounded-lg p-4 border-2 border-green-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active</p>
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </div>
              <FiActivity className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 rounded-lg p-4 border-2 border-purple-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{userStats.admins}</p>
              </div>
              <FiShield className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/90 rounded-lg p-4 border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Managers</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.managers}</p>
              </div>
              <FiUsers className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/90 rounded-lg p-4 border-2 border-green-200 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Users</p>
                <p className="text-2xl font-bold text-green-600">{userStats.users}</p>
              </div>
              <FiUsers className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="bg-white/90 rounded-lg p-6 mb-6 border-2 border-blue-200 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, email, or role..."
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-blue-200 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiFilter className="w-4 h-4" />
              Filters
            </motion.button>

            {/* Add User Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <FiPlus className="w-4 h-4" />
              Add User
            </motion.button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-blue-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Users Table */}
        <div className="bg-white/90 rounded-lg overflow-hidden border-2 border-blue-200 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-blue-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <UserAvatar user={user} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">ID: {user._id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <FiMail className="w-4 h-4 text-gray-400" />
                          <div className="text-sm text-gray-700">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : user.role === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                          <div>
                            <span className={`px-2 py-1 inline-flex text-xs leading-4 font-medium rounded-full ${
                              user.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <FiCalendar className="w-4 h-4 text-gray-400" />
                          <div className="text-sm text-gray-700">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user._id !== currentUser._id && (
                          <div className="flex items-center space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handlePermissions(user)}
                              className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Manage Permissions"
                            >
                              <FiShield className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handlePasswordReset(user)}
                              className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <FiKey className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleProfilePicture(user)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="Update Profile Picture"
                            >
                              <FiImage className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleStatusToggle(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.isActive 
                                  ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                            </motion.button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Modals */}
        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchUsers();
            setShowAddModal(false);
            setToast({
              show: true,
              message: 'User created successfully',
              type: 'success'
            });
          }}
        />

        <EditUserModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={selectedUser}
          onSuccess={() => {
            fetchUsers();
            setShowEditModal(false);
            setToast({
              show: true,
              message: 'User updated successfully',
              type: 'success'
            });
          }}
        />

        <PermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          user={selectedUser}
          onSuccess={() => {
            fetchUsers();
            setToast({
              show: true,
              message: 'Permissions updated successfully',
              type: 'success'
            });
          }}
        />

        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => setShowPasswordResetModal(false)}
          user={selectedUser}
          onSuccess={() => {
            setToast({
              show: true,
              message: 'Password reset successfully',
              type: 'success'
            });
          }}
        />

        <ProfilePictureModal
          isOpen={showProfilePictureModal}
          onClose={() => setShowProfilePictureModal(false)}
          user={selectedUser}
          onSuccess={() => {
            fetchUsers();
            setToast({
              show: true,
              message: 'Profile picture updated successfully',
              type: 'success'
            });
          }}
        />

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleStatusConfirm}
          title={`${selectedUser?.isActive ? 'Deactivate' : 'Activate'} User`}
          message={`Are you sure you want to ${selectedUser?.isActive ? 'deactivate' : 'activate'} ${selectedUser?.name}?`}
          confirmText={selectedUser?.isActive ? 'Deactivate' : 'Activate'}
        />

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}

        {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      </div>
    </div>
  );
};

export default UserManagement; 