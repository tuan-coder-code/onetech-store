# ONETECH STORE — HƯỚNG DẪN ĐÓNG GÓP & QUY CHUẨN LÀM VIỆC NHÓM

Tài liệu này dành cho **tất cả thành viên trong nhóm phát triển** (Tuấn, Tuân, An, Vượng, Vũ, Việt, Việt Anh) và các cộng tác viên nhằm **loại bỏ 100% tình trạng xung đột mã nguồn (Merge Conflicts), đè nút bấm của nhau hoặc vỡ luồng kiểm thử.**

> ⚠️ **LƯU Ý BẮT BUỘC:** Bộ quy tắc kiến trúc cao nhất của dự án nằm tại file [`AGENTS.md`](./AGENTS.md). Bất kỳ ai viết code đều phải tuân thủ nghiêm ngặt các quy tắc trong đó.

---

## 🚀 1. QUY TRÌNH TẠO PULL REQUEST (CHECKLIST TRƯỚC KHI MERGE)

Mỗi khi bạn chuẩn bị tạo Pull Request để merge code vào nhánh `main`, **bắt buộc thực hiện đủ 4 bước sau trên máy local**:

### Bước 1: Kéo code mới nhất từ nhánh `main`
Tuyệt đối không code trên một nhánh đã lỗi thời so với `main`.
```bash
git fetch origin
git pull origin main
```
*Nếu có xung đột (conflict) với đồng nghiệp khác, hãy giải quyết xung đột ngay trên máy bạn trước khi đẩy lên GitHub.*

### Bước 2: Chạy bộ kiểm thử tự động (Bắt buộc PASS 100%)
Toàn bộ 20 bộ Test Suites phải chạy thành công, không được có bất kỳ lỗi đỏ nào:
```bash
npm test
```
*(Nếu có test fail, hãy đọc log lỗi và sửa code cho đến khi bảng tổng hợp hiển thị: `20/20 PASS 100%`).*

### Bước 3: Kiểm tra các nút giao diện và mã nguồn liên module
- **Không tự ý xóa** các nút bấm, modal hoặc thẻ HTML của module khác (ví dụ: các nút "Lập Phiếu Thu", "Lập Phiếu Chi" ở trang Sổ Quỹ; các nút in phiếu; nút thêm dòng máy...).
- Nếu cần tái cấu trúc giao diện, hãy trao đổi trước với người phụ trách module đó.

### Bước 4: Commit theo chuẩn Conventional Commits & Tạo PR
- `feat(module): Mô tả tính năng mới`
- `fix(module): Sửa lỗi cụ thể`
- `docs(module): Cập nhật tài liệu`

---

## 🏛️ 2. QUY CHUẨN KIẾN TRÚC BACKEND & DATABASE

### 2.1. Phân Tách Tầng Trách Nhiệm (Layered MVC + OOP)
* **Route (`src/routes/`):** Chỉ khai báo endpoint và gắn middleware phân quyền (`requireAuth`, `requireRole('Quản lý', ...)`).
* **Controller (`src/controllers/`):** Nhận request, gọi Service và trả về response qua `this.sendSuccess` / `this.handleError`. **Tuyệt đối không viết Mongoose query trong Controller.**
* **Service (`src/services/`):** Chứa toàn bộ nghiệp vụ, tính toán tiền, logic CSDL và ném lỗi qua `this.createError(message, statusCode)`.
* **Model (`src/models/`):** Định nghĩa Schema Mongoose, validation ràng buộc và compound indexes.

### 2.2. Mã Lỗi HTTP (Status Codes) Chuẩn
| Mã lỗi | Trường hợp sử dụng | Ví dụ |
|---|---|---|
| `200 OK` | Lấy dữ liệu hoặc cập nhật thành công | Lấy danh sách sản phẩm |
| `201 Created` | Tạo mới thành công bản ghi | Tạo hóa đơn, tạo phiếu nhập |
| `400 Bad Request` | Dữ liệu đầu vào thiếu hoặc sai định dạng | Thiếu tên, SĐT không đủ 10 số, CCCD không đủ 12 số |
| `401 Unauthorized` | Chưa đăng nhập vào hệ thống | Chưa có session đăng nhập |
| `403 Forbidden` | Đã đăng nhập nhưng không đủ quyền hạn vai trò | Bán hàng truy cập quản lý nhân viên |
| `404 Not Found` | Không tìm thấy bản ghi trong CSDL | Không tìm thấy ID máy, không tìm thấy khách hàng |
| `409 Conflict` | **Xung đột dữ liệu hoặc vi phạm trạng thái** | **Trùng SĐT, trùng Email, trùng CCCD, bán máy đã bán** |

### 2.3. Tối Ưu Database
* Mọi truy vấn **chỉ đọc** (hiển thị danh sách, kiểm tra tồn tại `findOne`, báo cáo) **bắt buộc phải gắn `.lean()`**:
  ```javascript
  // ĐÚNG
  const existPhone = await KhachHang.findOne({ sdt: sdt.trim() }).lean();

  // SAI
  const existPhone = await KhachHang.findOne({ sdt: sdt.trim() });
  ```

---

## 🎨 3. QUY CHUẨN GIAO DIỆN FRONTEND & AN TOÀN XSS

### 3.1. Chống lỗi bảo mật XSS
Khi render bất kỳ chuỗi dữ liệu nào từ server (tên khách hàng, tên nhân viên, tên máy, ghi chú) vào chuỗi HTML (`innerHTML`), **bắt buộc dùng hàm `escapeHtml()`**:
```javascript
// ĐÚNG
row.innerHTML = `<td>${escapeHtml(kh.hoTen)}</td>`;

// SAI (Dễ bị tấn công XSS)
row.innerHTML = `<td>${kh.hoTen}</td>`;
```

### 3.2. Script nạp file tĩnh
- Tránh gắn các query parameter tùy tiện như `?v=2`, `?v=6` vào thẻ `<script>` trong file HTML nếu chưa cần thiết. Hãy giữ đường dẫn sạch:
  ```html
  <script src="/js/api.js"></script>
  <script src="/js/layout.js"></script>
  <script src="/js/nhapkho.js"></script>
  ```

---

## 👥 4. PHÂN CÔNG PHỤ TRÁCH MODULE CHÍNH

| Thành viên | Vai trò phụ trách | Các file chính |
|---|---|---|
| **Nguyễn Quang Tuấn** | Team Leader & Backend Lead | `HoaDonService`, `BaoHanhService`, POS Bán Hàng, Bảo hành, Báo cáo KPI |
| **Nguyễn Văn Tuân** | Module Nhập Kho & NCC | `PhieuNhapService`, `NhaCungCapService`, Nhập kho, Bulk IMEI |
| **Lê Hoàng An** | Tồn Kho, Công Nợ & Trả Góp | `TonKhoService`, `CongNoService`, `TraGopService` |
| **Đinh Đức Vượng** | Sổ Quỹ & Kiểm Kê | `ThanhToanService`, `KiemKeService`, `BaoCaoService` |
| **Nguyễn Tuấn Vũ** | Frontend Lead & UI/UX | `layout.js`, `style.css`, Form Templates, Responsive |
| **Trần Quốc Việt** | Đặt Trước & Đổi Trả | `DatTruocService`, `DoiTraService` |
| **Lê Việt Anh** | QA & Automated Testing | `tests/run_all_tests.js`, Test Suites, DOM Contracts |

---

*Mọi thắc mắc hoặc đề xuất cải tiến kiến trúc, vui lòng liên hệ Team Leader hoặc tạo Issue trên repository.*
