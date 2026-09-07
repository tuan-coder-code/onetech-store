# ONETECH STORE — WORKSPACE AGENT RULES & ARCHITECTURAL WORKFLOWS

Tài liệu này định nghĩa các **quy tắc hoạt động bắt buộc**, tiêu chuẩn kiến trúc và quy trình làm việc dành cho AI Assistant trên toàn dự án OneTech Store.

> **QUAN TRỌNG:** Đây là bộ luật cao nhất. Không có ngoại lệ nào được phép vi phạm các quy tắc bên dưới.

---

## 📌 QUY TẮC 1: LÀM RÕ YÊU CẦU & LẬP KẾ HOẠCH TRƯỚC KHI THỰC HIỆN

Khi người dùng đưa ra bất kỳ yêu cầu mới, nhiệm vụ mới hoặc yêu cầu chỉnh sửa hệ thống:

### 1.1 Đọc Tài Liệu Bắt Buộc Trước (Context Priming)
Trước khi phân tích hay viết bất kỳ dòng code nào, **phải đọc** (theo thứ tự):
1. [`ke-hoach-lap-trinh-chi-tiet-v2.md`](file:///d:/onetech/ke-hoach-lap-trinh-chi-tiet-v2.md) — phân công thành viên, tiến độ tuần, mục tiêu kỹ thuật.
2. [`PROJECT_WALKTHROUGH.md`](file:///d:/onetech/PROJECT_WALKTHROUGH.md) — kiến trúc Layered MVC, Schema CSDL, State Machine, danh sách API.
3. Các file liên quan trực tiếp (Model, Service, Controller, Route) của module cần thay đổi.

### 1.2 Đặt Câu Hỏi Làm Rõ (Clarifying Questions)
Chủ động đặt câu hỏi để làm rõ triệt để các khía cạnh:
- **Business Logic & Flow:** State machine chuyển trạng thái (Đặt cọc → Bán hàng → Xuất kho → Đổi trả/Bảo hành).
- **Database & Data Integrity:** Tên trường Schema, compound indexes, quan hệ đa hình (Polymorphic refs).
- **Phân quyền RBAC:** Ai được đọc? Ai được ghi? Ai được xóa/hủy? (6 vai trò).
- **Giao diện UI/UX:** Toast, Modal, debounce, ẩn/hiện nút theo vai trò.
- **Concurrency & Edge Cases:** Race condition, âm kho, lệch sổ quỹ, hoàn tiền.

### 1.3 Lập Bản Kế Hoạch Triển Khai (Implementation Plan)
Tạo hoặc cập nhật `implementation_plan.md` trước khi chỉnh sửa code:
- Mục tiêu & bối cảnh.
- Danh sách file cần **tạo mới / sửa đổi / xóa**.
- Mô tả chi tiết từng thay đổi (schema mới, logic nghiệp vụ, endpoint mới).
- Kịch bản kiểm thử (Verification Plan).

---

## 📌 QUY TẮC 2: QUY TRÌNH KIỂM TRA PULL REQUEST ("Check PR mới giúp mình")

Bất cứ khi nào người dùng nhắn **"Check PR mới giúp mình"** (hoặc tương đương), AI Assistant **bắt buộc thực hiện tuần tự** 6 bước sau:

### Bước 1 — Cập Nhật & Thu Thập Thông Tin PR
- **Bắt buộc kéo code mới nhất:** Chạy lệnh `git fetch` và `git pull` để đảm bảo bạn đang kiểm tra trên phiên bản code mới nhất của nhánh.
- Dùng GitHub API hoặc lệnh Git để lấy danh sách PR đang mở (`state=open`) hoặc PR vừa được merge gần nhất trên repo `tuan-coder-code/onetech-store`.
- Thu thập: danh sách files thay đổi, commits, và diff chi tiết của từng PR.

### Bước 2 — Phân Tích & Báo Cáo (TRƯỚC KHI SỬA)
Phân tích toàn diện theo 4 chiều:
- **Tính năng mới:** Tóm tắt chức năng PR đóng góp.
- **Ưu điểm:** Kiến trúc, tái sử dụng code, logic đúng.
- **Danh sách lỗi & bất cập:** Logic sai, tên trường Schema sai, RBAC sai tiếng Việt, nguy cơ lệch công nợ/tồn kho, thiếu validate, thiếu `.lean()`, thiếu Transaction rollback, XSS frontend.
- **Đánh giá mức độ nghiêm trọng:** (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low).

### Bước 3 — Tự Động Sửa Lỗi & Chuẩn Hóa
- Nếu có lỗi: Áp dụng bản vá trực tiếp vào codebase cho **tất cả** lỗi đã liệt kê ở Bước 2.
- Nếu không có lỗi: Vẫn rà soát để format code, chuẩn hóa RBAC (dùng đúng tiếng Việt có dấu), bổ sung validation, `.lean()`, Transaction rollback, XSS escape cho hoàn thiện nhất có thể.

### Bước 4 — Kiểm Thử Tự Động (100% PASS bắt buộc)
- Tạo/cập nhật file test riêng trong `tests/` nếu cần.
- Chạy `npm test` → **Bắt buộc 100% PASS** trước khi tiếp tục.

### Bước 5 — Commit & Push Lên Nhánh Chính
- **Bắt buộc:** Sau khi làm xong (dù là vá lỗi hay chỉ là cập nhật/chuẩn hóa nhỏ), luôn tạo commit để lưu lại các thay đổi.
- Commit theo chuẩn Conventional Commits (xem Quy Tắc 5).
- Push: `git push origin main`.

### Bước 6 — Cập Nhật Tài Liệu & Báo Cáo Người Dùng
- Cập nhật `PROJECT_WALKTHROUGH.md` và `ke-hoach-lap-trinh-chi-tiet-v2.md` nếu có thay đổi kiến trúc/nghiệp vụ.
- Báo cáo tổng kết: đã kéo code mới nhất, lỗi đã tìm, đã sửa/chuẩn hóa, kết quả test, trạng thái git push.

---

## 📌 QUY TẮC 3: TIÊU CHUẨN CODE BACKEND & CLEAN ARCHITECTURE

### 3.1 Phân Tách Tầng Trách Nhiệm (Separation of Concerns)

| Tầng | Vị trí | Trách nhiệm DUY NHẤT |
|------|---------|----------------------|
| **Route** | `src/routes/` | Định nghĩa endpoint, gắn `requireAuth`, `requireRole` |
| **Controller** | `src/controllers/` | Parse request params/body/query → gọi Service → trả JSON qua `sendSuccess` / `handleError` |
| **Service** | `src/services/` | Toàn bộ Business Logic, tính toán tiền, xử lý DB, rollback |
| **Model** | `src/models/` | Mongoose Schema, validation ràng buộc, compound indexes |

> ❌ **Tuyệt đối không viết Mongoose query hoặc Business Logic trong Controller.**

### 3.2 Quy Chuẩn Phân Quyền RBAC (6 Vai Trò)

| # | Vai trò | Phạm vi quyền |
|---|---------|---------------|
| 1 | `'Quản lý'` | Toàn quyền hệ thống (kế thừa mặc định trong `requireRole`) |
| 2 | `'Thủ kho'` | Nhập kho, xuất kho, kiểm kê, NCC, máy IMEI, phụ kiện |
| 3 | `'NV bán hàng'` | Lập hóa đơn POS, đặt trước pre-order, tư vấn trả góp |
| 4 | `'Thu ngân'` | Thu tiền, xác nhận thanh toán, lập phiếu thu |
| 5 | `'Kế toán'` | Công nợ, sổ quỹ thu-chi, đối soát tài chính |
| 6 | `'Kỹ thuật'` | Tiếp nhận bảo hành, thẩm định đổi trả, sửa chữa |

**Cú pháp bắt buộc:** `requireRole('Quản lý', 'Thủ kho')` — **không dùng mảng, không dùng tiếng Việt không dấu.**

### 3.3 State Machine Chính Thức Các Entity

```
MayImei:      'Con hang' → 'Da ban' | 'Doi tra' | 'Bao hanh' | 'Mat' | 'Thanh ly'
DonDatTruoc:  'Cho dat coc' → 'Da dat coc' → 'Da ban' | 'Da huy'
PhieuBaoHanh: 'Tiep nhan' → 'Dang sua' → 'Hoan thanh' | 'Tra hang'
PhieuDoiTra:  'Cho xu ly' → 'Cho thu kho' → 'Hoan thanh' | 'Tu choi'
HoaDon:       'Cho thanh toan' → 'Da thanh toan' | 'Da huy'
PhieuNhap:    'Nhap' → 'Da nhap kho'
```

> ⚠️ Chỉ được chuyển trạng thái theo chiều hợp lệ. Kiểm tra trạng thái hiện tại TRƯỚC khi update.

### 3.4 Hiệu Năng & Tối Ưu Database

- ✅ Mọi query **chỉ đọc** (danh sách, báo cáo) → bắt buộc dùng `.lean()`.
- ✅ Tìm kiếm kết hợp nhiều trường → khai báo **Compound Index** trong Schema.
- ✅ Phân trang chuẩn: dùng `this.getPaginationOptions(query)` từ `BaseService`.
- ✅ Populate chỉ khi cần thiết; tránh populate lồng nhau quá 2 cấp.
- ❌ Không dùng `Model.find({})` không có filter trong production.

### 3.5 Xử Lý Concurrency & Toàn Vẹn Dữ Liệu

- **Bán máy IMEI:** Bắt buộc dùng `findOneAndUpdate` với điều kiện trạng thái nguyên tử.
- **Trừ tồn kho phụ kiện:** Dùng `$inc` với điều kiện `$gte` để tránh âm kho.
- **Giao dịch phức tạp (nhiều collection):** Bắt buộc dùng **Mongoose Transaction** (session) với `try/catch/finally` và `abortTransaction`.
- **Mọi biến động tiền/tồn kho:** Phải sinh kèm bản ghi nhật ký (PhieuThu / PhieuChi / CongNo / TonKho).

### 3.6 Validation & Error Handling Chuẩn

- **Tầng Service:** Dùng `this.createError(message, statusCode)` để ném lỗi có status code.
- **CastError (ObjectId không hợp lệ):** Bắt và trả về 400, không để lộ 500.
- **Mongoose ValidationError:** Tầng Controller bắt và trả về 400 qua `handleError`.
- **Duplicate Key (E11000):** Bắt và trả về 409 Conflict với message thân thiện.

```javascript
// Pattern chuẩn bắt lỗi Duplicate Key trong Service
async taoMoi(payload) {
  try {
    return await Model.create(payload);
  } catch (err) {
    if (err.code === 11000) {
      throw this.createError('Dữ liệu đã tồn tại trong hệ thống', 409);
    }
    throw err;
  }
}
```

### 3.7 Logging Chuẩn

- Dùng `console.error('[TenService] [tenHam]:', error)` trong khối catch của Service.
- Dùng `console.error('[Controller Error]:', error)` trong `handleError` của BaseController.
- **Không log thông tin nhạy cảm** (mật khẩu, session token) ra console.

---

## 📌 QUY TẮC 4: TIÊU CHUẨN GIAO DIỆN FRONTEND & UI/UX

### 4.1 Kiến Trúc Giao Diện

- **Stack:** Vanilla HTML5 + Bootstrap 5.3 + FontAwesome 6 + CSS tùy chỉnh.
- **Layout:** Inject Sidebar + Navbar qua `injectCommonLayout()` trong `layout.js`.
- **API Helper:** Gọi backend qua `api.get()`, `api.post()`, `api.put()`, `api.delete()` — đã tích hợp toast và xử lý lỗi 401/403.
- **Cấu trúc file:**
  - HTML: `src/public/pages/[module]/index.html`
  - JS: `src/public/js/[module].js`
  - CSS toàn cục: `src/public/css/style.css`

### 4.2 Kiểm Soát Hiển Thị Theo Vai Trò (Role-based UI Visibility)

```javascript
const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

// Ẩn/hiện nút theo vai trò
function applyRolePermissions(user) {
  const isManager = user.vaiTro === 'Quản lý';
  const isWarehouse = ['Quản lý', 'Thủ kho'].includes(user.vaiTro);
  
  document.getElementById('btnXoa')?.classList.toggle('d-none', !isManager);
  document.getElementById('btnNhapKho')?.classList.toggle('d-none', !isWarehouse);
}
```

> Dùng `.classList.toggle('d-none', condition)` thay vì `.style.display` để nhất quán với Bootstrap.

### 4.3 Trải Nghiệm Người Dùng (UX Standards)

- **Debounce search:** 300ms cho ô tìm kiếm, tránh spam API.
- **Tiền tệ:** `(so).toLocaleString('vi-VN') + ' đ'` — áp dụng thống nhất toàn hệ thống.
- **Toast:** Dùng `showToast(message, 'success'|'danger'|'warning'|'info')` từ api helper.
- **Loading state:** Hiện spinner khi đang fetch; ẩn khi hoàn thành.
- **Empty state:** Hiển thị thông báo rõ ràng khi không có dữ liệu.

### 4.4 Bảo Mật Frontend (XSS Prevention)

> ❌ **Không bao giờ dùng `innerHTML` với dữ liệu đến từ server mà không escape.**

```javascript
// Luôn dùng helper này trước khi render dữ liệu server vào HTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

**Ngoại lệ:** Các trường số (giá tiền, số lượng) có thể dùng trực tiếp sau khi parse `Number()`.

### 4.5 Pagination UI Chuẩn

```javascript
function renderPagination(pagination) {
  const { page, totalPages } = pagination;
  const container = document.getElementById('paginationContainer');
  if (!container || totalPages <= 1) { container && (container.innerHTML = ''); return; }

  let html = '<nav><ul class="pagination pagination-sm mb-0 justify-content-end">';
  html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="loadData(${page - 1})">‹</a></li>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${i === page ? 'active' : ''}">
      <a class="page-link" href="#" onclick="loadData(${i})">${i}</a></li>`;
  }
  html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="loadData(${page + 1})">›</a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;
}
```

---

## 📌 QUY TẮC 5: TIÊU CHUẨN COMMIT & QUẢN LÝ PHIÊN BẢN (GIT)

Tuân thủ **Conventional Commits** với scope viết thường bằng tên module:

| Loại | Ví dụ |
|------|-------|
| `feat(...)` | `feat(pos): Tích hợp in hóa đơn nhiệt và quét mã vạch` |
| `fix(...)` | `fix(congno): Sửa lỗi tính thiếu dư nợ nhà cung cấp` |
| `perf(...)` | `perf(imei): Thêm atomic lock chống bán trùng` |
| `test(...)` | `test(baohanh): Bổ sung bộ test RBAC 6 vai trò` |
| `docs(...)` | `docs(walkthrough): Cập nhật sơ đồ State Machine` |
| `refactor(...)` | `refactor(service): Tách HoaDonService thành module nhỏ hơn` |
| `chore(...)` | `chore(deps): Cập nhật mongoose lên v8` |

**Quy tắc commit:**
1. Mỗi commit chỉ thay đổi **một mục tiêu duy nhất**.
2. Body commit (nếu có) giải thích **tại sao**, không chỉ nói **cái gì**.
3. Không commit code có `console.log` debug còn sót.

---

## 📌 QUY TẮC 6: ĐỒNG BỘ & CẬP NHẬT TÀI LIỆU DỰ ÁN

### 6.1 Hai Tài Liệu Sống (Living Documents)
Luôn phản ánh **100% chính xác** hiện trạng codebase:
- [`ke-hoach-lap-trinh-chi-tiet-v2.md`](file:///d:/onetech/ke-hoach-lap-trinh-chi-tiet-v2.md): Tiến độ tuần, phân công thành viên, tính năng hoàn thành.
- [`PROJECT_WALKTHROUGH.md`](file:///d:/onetech/PROJECT_WALKTHROUGH.md): Kiến trúc, Schema CSDL, bảng RBAC, danh sách endpoints.

### 6.2 Trigger Cập Nhật Bắt Buộc
Cập nhật ngay sau khi:
- Hoàn tất tính năng mới hoặc merge PR.
- Thay đổi Schema Mongoose (thêm/xóa/đổi tên trường).
- Thêm mới Service, Controller, hoặc Route.
- Thay đổi quy tắc RBAC của một endpoint.
- Cải tiến giao diện có ảnh hưởng đến UX tổng thể.

---

## 📌 QUY TẮC 7: STATE MACHINE & WORKFLOW NGHIỆP VỤ QUAN TRỌNG

### 7.1 Luồng Bán Hàng POS (Happy Path)
```
[NV bán hàng] Tạo HoaDon (trạng thái: 'Cho thanh toan')
    ↓
[Thu ngân] Xác nhận thanh toán → HoaDon chuyển 'Da thanh toan'
    ↓
[Atomic] MayImei: 'Con hang' → 'Da ban' + Tạo PhieuThu + Trừ cọc DonDatTruoc (nếu có)
    ↓
[Kế toán] Ghi nhận PhieuThu vào SoQuy
```

### 7.2 Luồng Nhập Kho (Phiếu Nhập)
```
[Thủ kho] Tạo PhieuNhap (trạng thái: 'Nhap') + CT_PhieuNhap (chi tiết)
    ↓
[Thủ kho] Xác nhận nhập kho → PhieuNhap chuyển 'Da nhap kho'
    ↓
[Atomic] MayImei.create() cho từng IMEI + Tăng TonKho phụ kiện ($inc)
    ↓
[Kế toán] Ghi nhận công nợ NCC (PhieuChi hoặc CongNo tăng)
```

### 7.3 Luồng Đổi Trả / Bảo Hành
```
[Kỹ thuật] Tạo PhieuBaoHanh / PhieuDoiTra
    ↓
[Kỹ thuật] MayImei cũ: 'Da ban' → 'Bao hanh' hoặc 'Doi tra'
    ↓
[Nếu đổi máy] MayImei mới: 'Con hang' → 'Da ban' (Atomic Lock bắt buộc)
    ↓
[Kế toán] Tính công nợ chênh lệch giá (nếu có)
```

---

## 📌 QUY TẮC 8: VALIDATION & API RESPONSE CHUẨN

### 8.1 Cấu Trúc Response Thành Công
```json
{
  "success": true,
  "message": "Lấy danh sách sản phẩm thành công",
  "data": { "items": [...], "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 } }
}
```

### 8.2 Cấu Trúc Response Lỗi
```json
{
  "success": false,
  "message": "Máy IMEI ABC123 đã bị bán, không thể thực hiện giao dịch",
  "statusCode": 409
}
```

### 8.3 Bảng HTTP Status Code Chuẩn

| Code | Khi nào dùng |
|------|--------------|
| `200` | GET/PUT thành công |
| `201` | POST tạo mới thành công |
| `400` | Dữ liệu đầu vào không hợp lệ (thiếu trường, sai định dạng) |
| `401` | Chưa đăng nhập |
| `403` | Không đủ quyền (RBAC) |
| `404` | Không tìm thấy resource |
| `409` | Conflict (duplicate, state machine vi phạm) |
| `500` | Lỗi server không mong muốn |

### 8.4 Validate ObjectId Trước Khi Query
```javascript
// Trong Service, trước khi gọi findById
const mongoose = require('mongoose');
if (!mongoose.Types.ObjectId.isValid(id)) {
  throw this.createError('ID không hợp lệ', 400);
}
```

---

## 📌 QUY TẮC 9: TỰ KIỂM ĐIỂM (REFLECTION) & BẢO ĐẢM CHẤT LƯỢNG CODE

Để đảm bảo chất lượng code ngang tầm với các Senior Developer, AI Assistant **BẮT BUỘC** phải có bước "Tự kiểm điểm" (Reflection) trước khi kết thúc công việc:

### 9.1 Self-Correction Loop (Vòng lặp Tự sửa lỗi)
- **Sau khi viết code:** Không bao giờ báo cáo hoàn thành ngay. Phải tự đọc lại đoạn code vừa viết và đối chiếu chéo với 8 Quy tắc kiến trúc phía trên.
- **Kiểm tra checklist sinh tồn:**
  1. Có lỡ gọi Mongoose trực tiếp trong Controller không? (Quy tắc 3.1)
  2. Phân quyền RBAC đã dùng đúng tiếng Việt có dấu chưa? (Quy tắc 3.2)
  3. Query lấy danh sách đã có `.lean()` chưa? (Quy tắc 3.4)
  4. Trừ tiền / trừ kho đã dùng Transaction hoặc Atomic Lock chưa? (Quy tắc 3.5)
  5. Dữ liệu trả về Client đã được escape XSS chưa? (Quy tắc 4.4)

### 9.2 Khắc Phục Lỗi Automated Tests
- Nếu chạy lệnh `npm test` bị FAIL, AI **không được dừng lại để hỏi con người**. 
- Phải tự động đọc Log lỗi, tự suy luận nguyên nhân, tự đưa ra bản vá (patch), và tự chạy lại test cho đến khi PASS 100% (hoặc thử tối đa 3 lần).

### 9.3 Nguyên Tắc "Không Tự Suy Diễn" (Do Not Assume)
- Nếu gặp một hàm hoặc một biến chưa rõ logic luồng chảy, tuyệt đối không được "đoán mò".
- Bắt buộc phải dùng công cụ `grep_search` để tìm xem hàm/biến đó đang được gọi ở những đâu trong toàn dự án, đọc hiểu context rồi mới được chỉnh sửa.
- Không bao giờ dùng mã giữ chỗ (Placeholder) như `// code ở đây`, `// các phần khác giữ nguyên`. Phải viết trọn vẹn và hoàn chỉnh file hoặc hàm.
