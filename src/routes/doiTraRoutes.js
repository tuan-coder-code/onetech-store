const express = require('express');
const router = express.Router();
const doiTraController = require('../controllers/doiTraController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Toàn bộ route Đổi trả yêu cầu đăng nhập
router.use(requireAuth);

// GET /api/doi-tra - Danh sách phiếu đổi trả
router.get('/', requireRole('Quản lý', 'Admin', 'NV bán hàng', 'Thu ngân', 'Kế toán'), doiTraController.index);

// GET /api/doi-tra/:id - Chi tiết phiếu đổi trả
router.get('/:id', requireRole('Quản lý', 'Admin', 'NV bán hàng', 'Thu ngân', 'Kế toán'), doiTraController.getDetail);

// POST /api/doi-tra - Tạo phiếu đổi trả
router.post('/', requireRole('Quản lý', 'Admin', 'NV bán hàng', 'Thu ngân'), doiTraController.create);

// PUT /api/doi-tra/:id/tra-tien - Hoàn tiền cho khách (Sinh PhieuHoanTien)
router.put('/:id/tra-tien', requireRole('Quản lý', 'Admin', 'NV bán hàng', 'Thu ngân'), doiTraController.traTien);

// PUT /api/doi-tra/:id/doi-may - Đổi máy mới cho khách
router.put('/:id/doi-may', requireRole('Quản lý', 'Admin', 'NV bán hàng', 'Thu ngân'), doiTraController.doiMay);

// PUT /api/doi-tra/:id/tu-choi - Từ chối đổi trả
router.put('/:id/tu-choi', requireRole('Quản lý', 'Admin'), doiTraController.tuChoi);

module.exports = router;
