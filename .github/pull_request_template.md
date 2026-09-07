## 📋 Mô Tả Thay Đổi
<!-- Tóm tắt ngắn gọn tính năng mới, lỗi đã sửa hoặc cải tiến trong PR này -->

## 🎯 Phân Hệ / Module Liên Quan
- [ ] Bán Hàng POS & Bảo Hành (Tuấn)
- [ ] Nhập Kho Máy IMEI & Nhà Cung Cấp (Tuân)
- [ ] Tồn Kho, Công Nợ & Trả Góp (An)
- [ ] Sổ Quỹ Thu - Chi & Kiểm Kê (Vượng)
- [ ] Giao Diện Frontend & Layout UI/UX (Vũ)
- [ ] Đặt Hàng Trước & Đổi Trả Máy (Việt)
- [ ] Khác: ...

---

## ✅ BẢNG KIỂM TRA BẮT BUỘC TRƯỚC KHI TẠO PR (CHECKLIST)
*Vui lòng tích chọn đầy đủ các mục sau trước khi gửi PR:*

- [ ] **1. Kéo code mới nhất:** Tôi đã chạy `git fetch origin` và `git pull origin main` trên nhánh của mình và không còn xung đột (conflict).
- [ ] **2. Kiểm thử tự động 100% PASS:** Tôi đã chạy `npm test` và toàn bộ **20/20 Test Suites (796 assertions)** đều xanh `PASS`.
- [ ] **3. Kiến trúc Backend:** Không viết Mongoose query trong Controller; toàn bộ nghiệp vụ nằm trong Service OOP kế thừa `BaseService`.
- [ ] **4. Tối ưu hóa Database:** Các query chỉ đọc (`find`, `findOne`) đều đã có `.lean()`.
- [ ] **5. Mã lỗi HTTP chuẩn:** Đã dùng `409 Conflict` khi trùng dữ liệu (SĐT, Email, CCCD, IMEI) và `400 Bad Request` khi thiếu tham số.
- [ ] **6. Bảo vệ Giao diện:** Không xóa nhầm nút bấm/modal của module khác; chuỗi dữ liệu render ra HTML đã được bọc `escapeHtml()`.
