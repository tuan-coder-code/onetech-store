---
name: onetech-backend
description: Hướng dẫn đầy đủ và quy chuẩn thiết kế module Backend (Mongoose Models, Services kế thừa BaseService, Controllers kế thừa BaseController, Routes và phân quyền RBAC 6 vai trò, Transaction, Error Handling) cho OneTech Store.
---

# ONETECH STORE — BACKEND ARCHITECTURE & BEST PRACTICES

Kỹ năng này là cẩm nang đầy đủ để tạo mới hoặc tối ưu hóa bất kỳ module Backend nào trong hệ thống OneTech Store theo chuẩn Layered MVC + OOP Service.

---

## 1. Cấu Trúc File Chuẩn Một Module

```text
src/
├── models/
│   ├── [Entity].js          # Schema, indexes, virtuals
│   └── index.js             # Export tập trung toàn bộ models
├── services/
│   ├── BaseService.js       # Lớp cha: pagination, createError
│   ├── [Entity]Service.js   # Business Logic kế thừa BaseService
│   └── index.js             # Export tập trung toàn bộ services
├── controllers/
│   ├── BaseController.js    # sendSuccess, sendError, handleError
│   └── [Entity]Controller.js
└── routes/
    ├── [entity]Routes.js
    └── index.js             # Mount toàn bộ routes vào /api/*
```

---

## 2. Mẫu Model Mongoose Chuẩn

```javascript
const mongoose = require('mongoose');

const sanPhamSchema = new mongoose.Schema({
  maSP: {
    type: String, required: [true, 'Mã sản phẩm là bắt buộc'],
    unique: true, uppercase: true, trim: true
  },
  tenMay:   { type: String, required: [true, 'Tên máy là bắt buộc'], trim: true },
  hang:     { type: String, required: [true, 'Hãng sản xuất là bắt buộc'], trim: true },
  giaBan:   { type: Number, required: true, min: [0, 'Giá bán không được âm'] },
  giaNhap:  { type: Number, required: true, min: [0, 'Giá nhập không được âm'] },
  trangThai: {
    type: String,
    enum: { values: ['Kinh doanh', 'Ngung kinh doanh'], message: 'Trạng thái không hợp lệ' },
    default: 'Kinh doanh'
  },
  ghiChu: { type: String, trim: true, default: '' }
}, { timestamps: true });

// ✅ Compound Indexes — bắt buộc cho tìm kiếm kết hợp
sanPhamSchema.index({ hang: 1, trangThai: 1 });
sanPhamSchema.index({ tenMay: 'text', maSP: 'text' }); // Full-text search

module.exports = mongoose.model('SanPham', sanPhamSchema, 'SANPHAM');
```

> **Quy tắc đặt tên collection:** UPPERCASE (ví dụ: `'SANPHAM'`, `'MAYIMEI'`, `'HOADON'`).

---

## 3. Mẫu Service Chuẩn (Kế Thừa BaseService) — Đầy Đủ

```javascript
const BaseService = require('./BaseService');
const { SanPham } = require('../models');
const mongoose = require('mongoose');

class SanPhamService extends BaseService {
  constructor() {
    super(SanPham);
  }

  // ---- READ OPERATIONS ----

  async getDanhSach(query = {}) {
    const filter = {};
    if (query.hang)     filter.hang = query.hang;
    if (query.trangThai) filter.trangThai = query.trangThai;
    if (query.search) {
      filter.$or = [
        { tenMay: { $regex: query.search.trim(), $options: 'i' } },
        { maSP:   { $regex: query.search.trim(), $options: 'i' } }
      ];
    }

    const { page, limit, skip } = this.getPaginationOptions(query);

    const [items, total] = await Promise.all([
      SanPham.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .lean(),         // ✅ Bắt buộc .lean() cho read-only query
      SanPham.countDocuments(filter)
    ]);

    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    // ✅ Validate ObjectId trước khi query
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw this.createError('ID sản phẩm không hợp lệ', 400);
    }
    const sp = await SanPham.findById(id).lean();
    if (!sp) throw this.createError('Không tìm thấy sản phẩm', 404);
    return sp;
  }

  // ---- WRITE OPERATIONS ----

  async taoMoi(payload) {
    const { tenMay, hang, giaBan, giaNhap } = payload;
    if (!tenMay?.trim()) throw this.createError('Vui lòng nhập tên máy', 400);
    if (!hang?.trim())   throw this.createError('Vui lòng nhập hãng sản xuất', 400);
    if (giaBan < giaNhap) throw this.createError('Giá bán không được thấp hơn giá nhập', 400);

    try {
      return await SanPham.create(payload);
    } catch (err) {
      // ✅ Bắt Duplicate Key (maSP trùng)
      if (err.code === 11000) throw this.createError('Mã sản phẩm đã tồn tại trong hệ thống', 409);
      throw err;
    }
  }

  async capNhat(id, payload) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw this.createError('ID không hợp lệ', 400);
    const updated = await SanPham.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true } // runValidators: áp dụng lại Schema validation
    );
    if (!updated) throw this.createError('Không tìm thấy sản phẩm để cập nhật', 404);
    return updated;
  }

  async softDelete(id) {
    // Soft delete: đổi trạng thái thay vì xóa vật lý
    return await this.capNhat(id, { trangThai: 'Ngung kinh doanh' });
  }
}

module.exports = new SanPhamService();
```

---

## 4. Mẫu Controller Chuẩn (Kế Thừa BaseController)

```javascript
const BaseController = require('./BaseController');
const SanPhamService = require('../services/SanPhamService');

class SanPhamController extends BaseController {
  constructor() {
    super();
    // Bind tất cả methods để đảm bảo `this` đúng khi Express gọi
    this.getDanhSach   = this.getDanhSach.bind(this);
    this.getById       = this.getById.bind(this);
    this.taoMoi        = this.taoMoi.bind(this);
    this.capNhat       = this.capNhat.bind(this);
    this.xoa           = this.xoa.bind(this);
  }

  async getDanhSach(req, res) {
    try {
      const result = await SanPhamService.getDanhSach(req.query);
      return this.sendSuccess(res, result, 'Lấy danh sách sản phẩm thành công');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi tải danh sách sản phẩm');
    }
  }

  async getById(req, res) {
    try {
      const result = await SanPhamService.getById(req.params.id);
      return this.sendSuccess(res, result, 'Lấy thông tin sản phẩm thành công');
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async taoMoi(req, res) {
    try {
      const result = await SanPhamService.taoMoi(req.body);
      return this.sendSuccess(res, result, 'Tạo sản phẩm thành công', 201);
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi tạo sản phẩm');
    }
  }

  async capNhat(req, res) {
    try {
      const result = await SanPhamService.capNhat(req.params.id, req.body);
      return this.sendSuccess(res, result, 'Cập nhật sản phẩm thành công');
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async xoa(req, res) {
    try {
      await SanPhamService.softDelete(req.params.id);
      return this.sendSuccess(res, null, 'Đã ngừng kinh doanh sản phẩm');
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}

module.exports = new SanPhamController();
```

---

## 5. Mẫu Route & Phân Quyền RBAC Chuẩn

```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/sanPhamController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Áp dụng xác thực cho toàn bộ route của module này
router.use(requireAuth);

// GET /api/san-pham          — Tất cả vai trò đã đăng nhập
router.get('/',    ctrl.getDanhSach);

// GET /api/san-pham/:id      — Tất cả vai trò đã đăng nhập
router.get('/:id', ctrl.getById);

// POST /api/san-pham         — Chỉ Quản lý & Thủ kho
router.post('/',   requireRole('Thủ kho'), ctrl.taoMoi);

// PUT /api/san-pham/:id      — Chỉ Quản lý & Thủ kho
router.put('/:id', requireRole('Thủ kho'), ctrl.capNhat);

// DELETE /api/san-pham/:id   — Chỉ Quản lý
router.delete('/:id', requireRole(), ctrl.xoa); // requireRole() không arg → chỉ Quản lý

module.exports = router;
```

> `requireRole()` không truyền argument → middleware chặn tất cả vai trò trừ `'Quản lý'` (logic mặc định trong auth.js).

---

## 6. Mẫu Transaction Multi-Model (Giao Dịch Phức Tạp)

```javascript
const mongoose = require('mongoose');

async function thanhToanHoaDon(hoaDonId, payload) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Cập nhật trạng thái hóa đơn
    const hoaDon = await HoaDon.findOneAndUpdate(
      { _id: hoaDonId, trangThai: 'Cho thanh toan' },
      { $set: { trangThai: 'Da thanh toan', ngayThanhToan: new Date() } },
      { new: true, session }
    );
    if (!hoaDon) throw this.createError('Hóa đơn không tồn tại hoặc đã thanh toán', 409);

    // 2. Atomic lock IMEI (chống bán trùng)
    for (const imeiId of hoaDon.dsMayImei) {
      const locked = await MayImei.findOneAndUpdate(
        { _id: imeiId, trangThai: 'Con hang' },
        { $set: { trangThai: 'Da ban', ngayBan: new Date(), maHoaDon: hoaDon._id } },
        { session }
      );
      if (!locked) throw this.createError(`Máy IMEI đã bị bán hoặc không còn trong kho`, 409);
    }

    // 3. Tạo phiếu thu
    await PhieuThu.create([{
      maHoaDon: hoaDon._id,
      soTien: hoaDon.tongThanhToan,
      hinhThucThanhToan: payload.hinhThucThanhToan,
      nguoiThu: payload.nguoiThucHien,
      ngayThu: new Date()
    }], { session });

    await session.commitTransaction();
    return hoaDon;

  } catch (error) {
    await session.abortTransaction();
    throw error; // Re-throw để Controller bắt và handleError

  } finally {
    session.endSession(); // Bắt buộc giải phóng session
  }
}
```

---

## 7. Mẫu index.js Chuẩn (Export Tập Trung)

```javascript
// src/models/index.js
module.exports = {
  SanPham:    require('./SanPham'),
  MayImei:    require('./MayImei'),
  HoaDon:     require('./HoaDon'),
  PhieuThu:   require('./PhieuThu'),
  PhieuChi:   require('./PhieuChi'),
  NhanVien:   require('./NhanVien'),
  KhachHang:  require('./KhachHang'),
  // ... thêm model mới vào đây
};
```

```javascript
// src/services/index.js
module.exports = {
  SanPhamService:   require('./SanPhamService'),
  MayImeiService:   require('./MayImeiService'),
  HoaDonService:    require('./HoaDonService'),
  // ... thêm service mới vào đây
};
```

---

## 8. Quy Tắc Bắt Buộc — Checklist Khi Viết Backend

- [ ] **Không viết Mongoose query trong Controller** — chỉ gọi Service.
- [ ] **Mọi biến động tiền/tồn kho** → sinh kèm PhieuThu / PhieuChi / CongNo / TonKho.
- [ ] **Mọi read-only query** → có `.lean()`.
- [ ] **Validate ObjectId** trước khi `findById`.
- [ ] **Bắt Duplicate Key (11000)** → trả 409 Conflict.
- [ ] **Transaction cho nghiệp vụ multi-collection** → try/catch/finally + abortTransaction.
- [ ] **RBAC đúng tiếng Việt có dấu** → `'Quản lý'`, `'Thủ kho'`, `'NV bán hàng'`, `'Thu ngân'`, `'Kế toán'`, `'Kỹ thuật'`.
- [ ] **State Machine** → kiểm tra trạng thái hiện tại TRƯỚC khi chuyển trạng thái.
