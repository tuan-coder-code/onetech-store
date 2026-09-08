---
name: onetech-frontend-ui
description: Hướng dẫn đầy đủ xây dựng giao diện người dùng (HTML5, Bootstrap 5, FontAwesome, JavaScript API helper, layout injection, phân quyền ẩn/hiện nút theo RBAC, Debounce search, Pagination, Modal Form, Loading/Empty state, XSS prevention) cho OneTech Store.
---

# ONETECH STORE — FRONTEND UI/UX DESIGN & CODE GUIDE

Tài liệu này định nghĩa **tiêu chuẩn toàn diện** để xây dựng giao diện chuyên nghiệp, bảo mật và nhất quán trên toàn hệ thống OneTech Store.

---

## 1. Cấu Trúc File Giao Diện

```text
src/public/
├── pages/
│   └── [ten-module]/
│       └── index.html        # Markup HTML tĩnh
├── js/
│   └── [ten-module].js       # Logic trang: fetch, render, events
├── css/
│   └── style.css             # CSS tùy chỉnh toàn cục
└── partials/
    ├── navbar.html           # Inject qua injectCommonLayout()
    └── sidebar.html          # Inject qua injectCommonLayout()
```

---

## 2. Mẫu Khung HTML Chuẩn (`index.html`)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quản Lý Sản Phẩm — OneTech Store</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="bg-light">

  <div class="d-flex" id="wrapper">
    <div id="appSidebar"></div>
    <div id="page-content-wrapper" class="w-100">
      <div id="appNavbar"></div>

      <div class="container-fluid p-4">

        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="mb-0 fw-bold text-primary">
            <i class="fa-solid fa-boxes-stacked me-2"></i>Quản Lý Sản Phẩm
          </h4>
          <button id="btnThemSP" class="btn btn-primary d-none"
                  data-bs-toggle="modal" data-bs-target="#modalForm">
            <i class="fa-solid fa-plus me-1"></i> Thêm Sản Phẩm
          </button>
        </div>

        <!-- Filter & Search -->
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-body py-3">
            <div class="row g-2">
              <div class="col-md-4">
                <input type="text" id="searchInput" class="form-control"
                       placeholder="Tìm theo tên máy, mã SP...">
              </div>
              <div class="col-md-3">
                <select id="filterHang" class="form-select">
                  <option value="">Tất cả hãng</option>
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                </select>
              </div>
              <div class="col-auto">
                <button class="btn btn-outline-secondary" onclick="loadData()">
                  <i class="fa-solid fa-rotate-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <div class="card shadow-sm border-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Mã SP</th><th>Tên Sản Phẩm</th><th>Hãng</th>
                  <th>Giá Bán</th><th>Trạng Thái</th><th class="text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody id="tableBody">
                <!-- Render qua JS -->
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div class="card-footer bg-transparent d-flex justify-content-between align-items-center">
            <small id="paginationInfo" class="text-muted"></small>
            <div id="paginationContainer"></div>
          </div>
        </div>

      </div><!-- /container-fluid -->
    </div><!-- /page-content-wrapper -->
  </div><!-- /wrapper -->

  <!-- Modal Form (dùng chung Thêm & Sửa) -->
  <div class="modal fade" id="modalForm" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTitle">Thêm Sản Phẩm</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="formData" novalidate>
            <input type="hidden" id="editId">
            <div class="mb-3">
              <label class="form-label fw-semibold">Tên Máy <span class="text-danger">*</span></label>
              <input type="text" id="inputTenMay" class="form-control" required>
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">Hãng <span class="text-danger">*</span></label>
              <input type="text" id="inputHang" class="form-control" required>
            </div>
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label fw-semibold">Giá Nhập</label>
                <input type="number" id="inputGiaNhap" class="form-control" min="0">
              </div>
              <div class="col-6">
                <label class="form-label fw-semibold">Giá Bán</label>
                <input type="number" id="inputGiaBan" class="form-control" min="0">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
          <button type="button" id="btnSubmitForm" class="btn btn-primary" onclick="submitForm()">
            <i class="fa-solid fa-floppy-disk me-1"></i> Lưu
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/js/layout.js"></script>
  <script src="/js/sanpham.js"></script>
</body>
</html>
```

---

## 3. Mẫu JavaScript Chuẩn (`[ten-module].js`) — Đầy Đủ

```javascript
/* =====================================================
   sanpham.js — Quản lý sản phẩm OneTech Store
   Mẫu chuẩn: RBAC, Debounce, Pagination, XSS-safe
   ===================================================== */

let currentPage = 1;
let currentUser  = {};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inject layout + kiểm tra đăng nhập
  await injectCommonLayout();

  // 2. Lấy thông tin user từ session
  currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

  // 3. Phân quyền UI dựa trên vai trò
  applyRolePermissions(currentUser);

  // 4. Tải dữ liệu trang đầu
  loadData(1);

  // 5. Debounce search — 300ms
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadData(1), 300);
    });
  }

  // 6. Filter thay đổi → reload ngay
  document.getElementById('filterHang')?.addEventListener('change', () => loadData(1));
});

// ---- RBAC: Phân quyền hiển thị ----
function applyRolePermissions(user) {
  const canWrite = ['Quản lý', 'Thủ kho'].includes(user.vaiTro);
  document.getElementById('btnThemSP')?.classList.toggle('d-none', !canWrite);
}

// ---- LOAD DATA ----
async function loadData(page = currentPage) {
  currentPage = page;
  const search = document.getElementById('searchInput')?.value?.trim() || '';
  const hang   = document.getElementById('filterHang')?.value || '';

  setTableState('loading');

  try {
    const res = await api.get('/san-pham', { search, hang, page, limit: 20 });
    if (res.success && res.data?.items?.length > 0) {
      renderTable(res.data.items);
      renderPagination(res.data.pagination);
    } else {
      setTableState('empty', 6);
    }
  } catch (error) {
    setTableState('error', 6, error.message);
  }
}

// ---- RENDER TABLE (XSS-safe) ----
function renderTable(items) {
  const tbody = document.getElementById('tableBody');
  const canWrite = ['Quản lý', 'Thủ kho'].includes(currentUser.vaiTro);
  const isManager = currentUser.vaiTro === 'Quản lý';

  tbody.innerHTML = items.map(sp => `
    <tr>
      <td class="fw-bold font-monospace">${escapeHtml(sp.maSP)}</td>
      <td>${escapeHtml(sp.tenMay)}</td>
      <td><span class="badge bg-secondary">${escapeHtml(sp.hang)}</span></td>
      <td class="text-primary fw-bold">${formatCurrency(sp.giaBan)}</td>
      <td>
        <span class="badge ${sp.trangThai === 'Kinh doanh' ? 'bg-success' : 'bg-secondary'}">
          ${escapeHtml(sp.trangThai)}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info me-1" onclick="viewDetail('${sp._id}')" title="Xem chi tiết">
          <i class="fa-solid fa-eye"></i>
        </button>
        ${canWrite ? `<button class="btn btn-sm btn-outline-warning me-1" onclick="openEditModal('${sp._id}')" title="Chỉnh sửa">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>` : ''}
        ${isManager ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${sp._id}', '${escapeHtml(sp.tenMay)}')" title="Xóa">
          <i class="fa-solid fa-trash"></i>
        </button>` : ''}
      </td>
    </tr>
  `).join('');
}

// ---- MODAL: Thêm mới ----
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Thêm Sản Phẩm Mới';
  document.getElementById('editId').value = '';
  document.getElementById('formData').reset();
  new bootstrap.Modal(document.getElementById('modalForm')).show();
}

// ---- MODAL: Chỉnh sửa ----
async function openEditModal(id) {
  try {
    const res = await api.get(`/san-pham/${id}`);
    if (!res.success) return;
    const sp = res.data;

    document.getElementById('modalTitle').textContent = 'Chỉnh Sửa Sản Phẩm';
    document.getElementById('editId').value    = sp._id;
    document.getElementById('inputTenMay').value = sp.tenMay;
    document.getElementById('inputHang').value   = sp.hang;
    document.getElementById('inputGiaNhap').value = sp.giaNhap;
    document.getElementById('inputGiaBan').value  = sp.giaBan;

    new bootstrap.Modal(document.getElementById('modalForm')).show();
  } catch (e) {
    console.error('openEditModal error:', e);
  }
}

// ---- SUBMIT FORM (Thêm hoặc Sửa) ----
async function submitForm() {
  const id      = document.getElementById('editId').value;
  const payload = {
    tenMay:  document.getElementById('inputTenMay').value.trim(),
    hang:    document.getElementById('inputHang').value.trim(),
    giaNhap: Number(document.getElementById('inputGiaNhap').value),
    giaBan:  Number(document.getElementById('inputGiaBan').value)
  };

  if (!payload.tenMay || !payload.hang) {
    showToast('Vui lòng nhập đầy đủ tên máy và hãng', 'warning');
    return;
  }

  const btn = document.getElementById('btnSubmitForm');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Đang lưu...';

  try {
    const res = id
      ? await api.put(`/san-pham/${id}`, payload)
      : await api.post('/san-pham', payload);

    if (res.success) {
      bootstrap.Modal.getInstance(document.getElementById('modalForm'))?.hide();
      loadData(currentPage);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Lưu';
  }
}

// ---- DELETE ----
async function deleteItem(id, tenMay) {
  if (!confirm(`Xác nhận ngừng kinh doanh sản phẩm: "${tenMay}"?`)) return;
  const res = await api.delete(`/san-pham/${id}`);
  if (res.success) loadData(currentPage);
}

// ---- HELPERS ----

/** Ngăn chặn XSS khi render data từ server vào innerHTML */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** Định dạng tiền tệ Việt Nam */
function formatCurrency(amount) {
  return (Number(amount) || 0).toLocaleString('vi-VN') + ' đ';
}

/** Hiển thị trạng thái bảng: loading / empty / error */
function setTableState(state, colspan = 6, errorMsg = '') {
  const tbody = document.getElementById('tableBody');
  document.getElementById('paginationContainer').innerHTML = '';
  document.getElementById('paginationInfo').textContent = '';

  const states = {
    loading: `<tr><td colspan="${colspan}" class="text-center py-5 text-muted">
                <i class="fa-solid fa-spinner fa-spin fa-lg me-2"></i>Đang tải dữ liệu...
              </td></tr>`,
    empty:   `<tr><td colspan="${colspan}" class="text-center py-5 text-muted">
                <i class="fa-solid fa-inbox fa-2x d-block mb-2"></i>Không tìm thấy dữ liệu phù hợp.
              </td></tr>`,
    error:   `<tr><td colspan="${colspan}" class="text-center py-5 text-danger">
                <i class="fa-solid fa-triangle-exclamation fa-lg me-2"></i>
                ${escapeHtml(errorMsg) || 'Lỗi khi tải dữ liệu. Vui lòng thử lại.'}
              </td></tr>`
  };
  tbody.innerHTML = states[state] || states.error;
}

/** Render pagination Bootstrap chuẩn */
function renderPagination(pagination) {
  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  document.getElementById('paginationInfo').textContent =
    `Hiển thị ${start}–${end} trong tổng ${total} bản ghi`;

  const container = document.getElementById('paginationContainer');
  if (!container || totalPages <= 1) { container && (container.innerHTML = ''); return; }

  let html = '<nav aria-label="Phân trang"><ul class="pagination pagination-sm mb-0">';
  html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="loadData(${page - 1}); return false;">‹</a></li>`;

  // Hiển thị tối đa 5 trang (window)
  const delta = 2;
  const range = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i);
  }
  if (range[0] > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" onclick="loadData(1); return false;">1</a></li>`;
    if (range[0] > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
  }
  range.forEach(i => {
    html += `<li class="page-item ${i === page ? 'active' : ''}">
      <a class="page-link" href="#" onclick="loadData(${i}); return false;">${i}</a></li>`;
  });
  if (range[range.length - 1] < totalPages) {
    if (range[range.length - 1] < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    html += `<li class="page-item"><a class="page-link" href="#" onclick="loadData(${totalPages}); return false;">${totalPages}</a></li>`;
  }

  html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" onclick="loadData(${page + 1}); return false;">›</a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;
}
```

---

## 4. Quy Tắc Bắt Buộc — Checklist UI

- [ ] **escapeHtml()** cho mọi trường text/string từ server trước khi `innerHTML`.
- [ ] **formatCurrency()** cho mọi số tiền, giá cả.
- [ ] **Debounce 300ms** cho ô tìm kiếm.
- [ ] **d-none** (Bootstrap class) thay vì `style.display='none'` để ẩn nút theo RBAC.
- [ ] **setTableState('loading')** trước khi fetch; 'empty' hoặc 'error' sau khi fetch.
- [ ] **renderPagination()** sau mỗi lần loadData thành công.
- [ ] **Modal dùng chung** cho Thêm và Sửa (phân biệt qua `editId`).
- [ ] **Disable button submit** trong suốt thời gian đang gửi request.
- [ ] **currentUser** lấy từ `sessionStorage.getItem('currentUser')` — không lưu trong global mutable state khác.
