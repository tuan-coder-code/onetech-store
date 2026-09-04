const express = require('express');
const router = express.Router();
const TraGopController = require('../controllers/TraGopController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Lập hợp đồng trả góp mới (Kế toán, Thu ngân, NV bán hàng)
router.post('/', requireAuth, requireRole('Kế toán', 'Thu ngân', 'NV bán hàng'), TraGopController.taoHopDong);

// Lấy danh sách hợp đồng trả góp (Kế toán, Thu ngân)
router.get('/', requireAuth, requireRole('Kế toán', 'Thu ngân'), TraGopController.layDanhSach);

// Lấy chi tiết hợp đồng trả góp
router.get('/:id', requireAuth, requireRole('Kế toán', 'Thu ngân'), TraGopController.layChiTiet);

// Xem lịch thu kỳ hạn
router.get('/:id/lich-thu', requireAuth, requireRole('Kế toán', 'Thu ngân'), TraGopController.layLichThu);

// Thu tiền một kỳ hạn
router.post('/:id/thu-ky', requireAuth, requireRole('Kế toán', 'Thu ngân'), TraGopController.thuTienKy);

module.exports = router;
