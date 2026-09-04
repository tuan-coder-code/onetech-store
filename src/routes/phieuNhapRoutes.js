const express = require('express');
const router = express.Router();
const phieuNhapController = require('../controllers/phieuNhapController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Toàn bộ phân hệ nhập kho cần đăng nhập
router.use(requireAuth);

// API endpoints
router.post('/import-hang-loat', requireRole('Quản lý', 'Thủ kho'), phieuNhapController.postImportHangLoat);
router.post('/tra-hang-ncc', requireRole('Quản lý', 'Thủ kho'), phieuNhapController.postTraHangNCC);
router.post('/', requireRole('Quản lý', 'Thủ kho'), phieuNhapController.taoPhieuNhap);
router.get('/', requireRole('Quản lý', 'Thủ kho'), phieuNhapController.getDanhSach);
router.get('/:id', requireRole('Quản lý', 'Thủ kho'), phieuNhapController.getChiTiet);

module.exports = router;
