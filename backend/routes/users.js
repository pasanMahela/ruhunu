const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserPermissions,
  resetUserPassword,
  uploadProfilePicture,
  deleteUser,
  upload
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// All routes require admin or manager role for viewing, admin only for modifications
router.get('/', authorize('admin', 'manager'), getUsers);
router.post('/', authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin', 'manager'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

// Additional user management routes
router.put('/:id/permissions', authorize('admin'), updateUserPermissions);
router.put('/:id/reset-password', authorize('admin'), resetUserPassword);
router.put('/:id/profile-picture', authorize('admin'), upload.single('profilePicture'), uploadProfilePicture);

module.exports = router; 