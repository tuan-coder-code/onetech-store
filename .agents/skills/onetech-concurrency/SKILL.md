---
name: onetech-concurrency
description: Hướng dẫn đầy đủ xử lý tranh chấp đồng thời (Concurrency Control), chống bán trùng máy IMEI, Atomic Locks, Mongoose Transactions, Idempotency và các pattern concurrency cho từng luồng nghiệp vụ trong OneTech Store.
---

# ONETECH STORE — CONCURRENCY & DATA INTEGRITY GUIDE

Trong cửa hàng bán lẻ điện thoại với nhiều nhân viên thao tác đồng thời, kiểm soát tranh chấp dữ liệu (Race Condition) là yếu tố sống còn. Tài liệu này cung cấp các giải pháp đã được kiểm chứng.

---

## 1. Ba Vấn Đề Concurrency Thường Gặp

| # | Vấn đề | Hậu quả |
|---|--------|---------|
| 1 | **Bán trùng IMEI** | 2 nhân viên thanh toán cùng 1 máy → 2 hóa đơn hợp lệ cho 1 máy |
| 2 | **Âm kho phụ kiện** | 2 đơn cùng trừ tồn kho khi chỉ còn 1 → tồn kho âm |
| 3 | **Lệch sổ quỹ** | Nhiều giao dịch ghi đồng thời làm sai tổng tiền mặt |

---

## 2. Giải Pháp A — Atomic Update Với Điều Kiện Trạng Thái (Bán Máy IMEI)

> ❌ **KHÔNG LÀM:** Đọc `findOne()` → kiểm tra → `save()` (2 bước riêng biệt, dễ race condition)

```javascript
// ✅ CHUẨN: Atomic Lock — 1 thao tác nguyên tử duy nhất
async lockMayImei(maMay, session = null) {
  const opts = session ? { session } : {};
  const locked = await MayImei.findOneAndUpdate(
    { _id: maMay, trangThai: 'Con hang' },  // Điều kiện trạng thái là guard
    { $set: { trangThai: 'Da ban', ngayBan: new Date() } },
    { new: true, ...opts }
  );

  if (!locked) {
    // ✅ ĐÚNG: `locked` là null khi không tìm thấy; lấy IMEI từ param, không từ locked
    const mayInfo = await MayImei.findById(maMay).select('imei').lean();
    const imeiStr = mayInfo?.imei || String(maMay);
    throw this.createError(
      `Máy IMEI [${imeiStr}] đã bị bán hoặc không còn sẵn sàng trong kho`,
      409
    );
  }

  return locked;
}
```

> **Lưu ý bug đã được sửa:** `lockMay` có thể là `null` (khi máy đã bán), không thể truy cập `lockMay.imei`. Phải query riêng để lấy thông tin IMEI cho error message.

---

## 3. Giải Pháp B — Atomic Decrement Với Điều Kiện Không Âm (Phụ Kiện)

```javascript
// ✅ CHUẨN: Trừ tồn kho nguyên tử, guard bằng $gte
async xuatKhoPhuKien(maPK, soLuongMua, session = null) {
  const opts = session ? { session } : {};
  const updated = await PhuKien.findOneAndUpdate(
    { _id: maPK, soLuongTon: { $gte: soLuongMua } }, // Guard: đủ hàng mới trừ
    { $inc: { soLuongTon: -soLuongMua } },
    { new: true, ...opts }
  );

  if (!updated) {
    const pk = await PhuKien.findById(maPK).select('tenPK soLuongTon').lean();
    throw this.createError(
      `Phụ kiện "${pk?.tenPK || maPK}" chỉ còn ${pk?.soLuongTon ?? 0} cái, không đủ ${soLuongMua} cái để xuất`,
      400
    );
  }

  return updated;
}
```

---

## 4. Giải Pháp C — Mongoose Transaction Rollback (Multi-Collection)

Dùng khi một nghiệp vụ chạm vào **nhiều collection** và phải đảm bảo **tất cả thành công hoặc tất cả rollback**:

```javascript
const mongoose = require('mongoose');

async function thucHienGiaoDich(payload) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // --- Bước 1: Cập nhật HoaDon ---
    const hoaDon = await HoaDon.findOneAndUpdate(
      { _id: payload.hoaDonId, trangThai: 'Cho thanh toan' },
      { $set: { trangThai: 'Da thanh toan' } },
      { new: true, session }
    );
    if (!hoaDon) throw this.createError('Hóa đơn không hợp lệ hoặc đã thanh toán', 409);

    // --- Bước 2: Lock IMEI (có thể nhiều máy) ---
    for (const imeiId of payload.dsMayImei) {
      await this.lockMayImei(imeiId, session);
    }

    // --- Bước 3: Trừ tồn kho phụ kiện ---
    for (const pk of payload.dsPhuKien) {
      await this.xuatKhoPhuKien(pk.id, pk.soLuong, session);
    }

    // --- Bước 4: Tạo PhieuThu ---
    await PhieuThu.create([{ ...payload.phieuThu }], { session });

    // --- Commit: tất cả bước thành công ---
    await session.commitTransaction();
    return hoaDon;

  } catch (error) {
    // --- Rollback: hủy toàn bộ nếu có bất kỳ lỗi ---
    await session.abortTransaction();
    throw error; // Re-throw để Controller handleError

  } finally {
    // --- Bắt buộc: giải phóng session dù thành công hay thất bại ---
    session.endSession();
  }
}
```

---

## 5. Giải Pháp D — Pattern Cấn Trừ Tiền Cọc (DonDatTruoc → HoaDon)

```javascript
// Khi bán hàng có đơn đặt trước, cấn trừ tiền cọc nguyên tử
async canTruCoc(donDatTruocId, hoaDonId, session) {
  const don = await DonDatHangTruoc.findOneAndUpdate(
    { _id: donDatTruocId, trangThai: 'Da dat coc' },
    { $set: { trangThai: 'Da ban', maHoaDon: hoaDonId } },
    { new: true, session }
  );

  if (!don) {
    throw this.createError(
      'Đơn đặt trước không tồn tại hoặc chưa đặt cọc, không thể cấn trừ',
      409
    );
  }

  return don.soTienCoc; // Trả về số tiền cọc đã cấn trừ để tính số tiền còn lại
}
```

---

## 6. Giải Pháp E — Pattern Trả Góp (HopDongTraGop)

```javascript
// Cập nhật kỳ đã trả trong hợp đồng trả góp — nguyên tử
async ghiNhanKyTraGop(hopDongId, kyThu, soTienTra, session) {
  // Kiểm tra kỳ chưa thanh toán
  const hopDong = await HopDongTraGop.findOneAndUpdate(
    {
      _id: hopDongId,
      trangThai: 'Dang tra gop',
      'chiTietKy.kyThu': kyThu,
      'chiTietKy.$.trangThai': 'Chua tra' // Chỉ cập nhật kỳ chưa trả
    },
    {
      $set: {
        'chiTietKy.$.trangThai': 'Da tra',
        'chiTietKy.$.ngayTra': new Date(),
        'chiTietKy.$.soTienDaTra': soTienTra
      },
      $inc: { kyDaTra: 1, tongDaTra: soTienTra }
    },
    { new: true, session }
  );

  if (!hopDong) {
    throw this.createError(`Kỳ ${kyThu} đã thanh toán hoặc hợp đồng không hợp lệ`, 409);
  }

  // Tự động đóng hợp đồng nếu đã trả đủ tất cả các kỳ
  if (hopDong.kyDaTra >= hopDong.tongSoKy) {
    await HopDongTraGop.findByIdAndUpdate(
      hopDongId,
      { $set: { trangThai: 'Hoan thanh' } },
      { session }
    );
  }

  return hopDong;
}
```

---

## 7. Giải Pháp F — Idempotency Key (Chống Gửi Request Trùng)

Khi client re-submit form (double-click nút thanh toán), backend phải xử lý chỉ một lần:

```javascript
// Thêm trường idempotencyKey vào Schema của PhieuThu, HoaDon
idempotencyKey: {
  type: String,
  sparse: true,   // Cho phép null nhưng unique khi có giá trị
  unique: true
}

// Trong Service, dùng $setOnInsert để đảm bảo chỉ tạo một lần
async taoHoaDonIdempotent(payload) {
  const key = payload.idempotencyKey;
  if (!key) throw this.createError('Thiếu idempotency key', 400);

  const existing = await HoaDon.findOne({ idempotencyKey: key }).lean();
  if (existing) return existing; // Trả về kết quả cũ, không tạo mới

  return await this.taoHoaDon(payload); // Tạo mới bình thường
}
```

---

## 8. Checklist Kiểm Tra Concurrency Khi Review PR

- [ ] Bán máy IMEI dùng `findOneAndUpdate` với guard `trangThai: 'Con hang'`?
- [ ] Error message cho locked = null không truy cập `.imei` trên null?
- [ ] Trừ phụ kiện dùng `$inc` với guard `$gte: soLuong`?
- [ ] Nghiệp vụ multi-collection dùng Mongoose Transaction (session)?
- [ ] `session.endSession()` nằm trong khối `finally`?
- [ ] Cấn trừ cọc dùng atomic update với guard trạng thái `'Da dat coc'`?
- [ ] Cập nhật kỳ trả góp dùng positional operator `$.trangThai: 'Chua tra'`?
