const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Toàn bộ route Admin yêu cầu đăng nhập với vai trò Admin
router.use(requireAuth);
router.use(requireRole('Admin'));

// GET /api/admin/overview - Tổng quan hệ thống
router.get('/overview', adminController.getOverview);

// GET /api/admin/accounts - Danh sách tài khoản
router.get('/accounts', adminController.getAccounts);

// PUT /api/admin/accounts/:id/toggle-status - Khóa/Mở khóa tài khoản
router.put('/accounts/:id/toggle-status', adminController.toggleStatus);

// PUT /api/admin/accounts/:id/reset-password - Reset mật khẩu
router.put('/accounts/:id/reset-password', adminController.resetPassword);

// POST /api/admin/backup - Backup dữ liệu hệ thống
router.post('/backup', adminController.backup);

module.exports = router;
