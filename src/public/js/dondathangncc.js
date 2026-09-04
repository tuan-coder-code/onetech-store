let dsDon = [];
let sanPhamList = [];
let currentDonId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadDanhSachDon();
  
  const searchInput = document.getElementById('searchDon');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadDanhSachDon(1, e.target.value);
      }, 300);
    });
  }
});

async function loadDanhSachDon(page = 1, search = '') {
  const trangThai = document.getElementById('filterTrangThai')?.value || '';
  const searchVal = search || document.getElementById('searchDon')?.value || '';
  
  const res = await api.get('/don-dat-hang-ncc', { page, limit: 10, search: searchVal, trangThai });
  const tbody = document.querySelector('#tableDonNCC tbody');
  
  if (!res.success) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
    return;
  }
  
  const { donDatHangNCCs, items, pagination } = res.data;
  const listDon = donDatHangNCCs || items || [];
  dsDon = listDon;
  
  // Custom thống kê (có thể làm API riêng hoặc tính tạm trên client nếu list đủ)
  // Demo stat mock
  document.getElementById('statChoDuyet').textContent = listDon.filter(i => i.trangThai === 'Cho duyet').length || 0;
  document.getElementById('statDangGiao').textContent = listDon.filter(i => i.trangThai === 'Dang giao').length || 0;
  document.getElementById('statHoanThanh').textContent = listDon.filter(i => i.trangThai === 'Da nhan hang').length || 0;
  document.getElementById('statHuy').textContent = listDon.filter(i => i.trangThai === 'Da huy').length || 0;
  
  if (listDon.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-1"></i> Chưa có đơn đặt hàng nào</td></tr>`;
    document.getElementById('paginationContainer').innerHTML = '';
    return;
  }
  
  let html = '';
  listDon.forEach(don => {
    let badgeClass = 'bg-secondary';
    let textTrangThai = don.trangThai;
    switch (don.trangThai) {
      case 'Cho duyet': badgeClass = 'bg-warning text-dark'; textTrangThai = 'Chờ duyệt'; break;
      case 'Da duyet': badgeClass = 'bg-primary'; textTrangThai = 'Đã duyệt'; break;
      case 'Dang giao': badgeClass = 'bg-info'; textTrangThai = 'Đang giao'; break;
      case 'Da nhan hang': badgeClass = 'bg-success'; textTrangThai = 'Đã nhận hàng'; break;
      case 'Da huy': badgeClass = 'bg-danger'; textTrangThai = 'Đã hủy'; break;
    }
    
    html += `
      <tr>
        <td><span class="fw-bold text-primary">${don._id.substring(don._id.length - 6).toUpperCase()}</span></td>
        <td>
          <div class="fw-semibold">${don.nhaCungCap?.tenNCC || 'N/A'}</div>
        </td>
        <td>${don.nguoiLap?.hoTen || 'N/A'}</td>
        <td>${new Date(don.ngayHenGiao).toLocaleDateString('vi-VN')}</td>
        <td class="text-danger fw-bold">${don.tongTien.toLocaleString('vi-VN')} đ</td>
        <td><span class="badge ${badgeClass}">${textTrangThai}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-light" onclick="xemChiTiet('${don._id}')"><i class="bi bi-eye"></i> Chi tiết</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  renderPagination(pagination, loadDanhSachDon);
}

// -----------------------------------
// TẠO ĐƠN MỚI
// -----------------------------------
async function openTaoDonModal() {
  document.getElementById('ngayHenGiao').value = '';
  document.getElementById('ghiChu').value = '';
  document.querySelector('#tableChiTietLap tbody').innerHTML = '';
  updateTongTienLapDon();
  
  const [resNCC, resSP] = await Promise.all([
    api.get('/nha-cung-cap', { limit: 100 }),
    api.get('/san-pham', { limit: 1000 })
  ]);
  
  if (resNCC.success) {
    const nccSelect = document.getElementById('nccSelect');
    nccSelect.innerHTML = '<option value="">-- Chọn NCC --</option>';
    const nccList = resNCC.data.nhaCungCaps || resNCC.data.items || [];
    nccList.forEach(ncc => {
      nccSelect.innerHTML += `<option value="${ncc._id}">${ncc.tenNCC}</option>`;
    });
    if (window.enhanceSelect) window.enhanceSelect(nccSelect);
  }
  
  if (resSP.success) {
    sanPhamList = resSP.data.sanPhams || resSP.data.items || [];
  }
  
  addDongChiTiet();
  const modal = new bootstrap.Modal(document.getElementById('modalTaoDon'));
  modal.show();
}

function addDongChiTiet() {
  const tbody = document.querySelector('#tableChiTietLap tbody');
  const tr = document.createElement('tr');
  
  let spOptions = '<option value="">-- Chọn Model --</option>';
  sanPhamList.forEach(sp => {
    spOptions += `<option value="${sp._id}" data-gia="${sp.giaBan * 0.8}">${sp.tenMay}</option>`;
  });
  
  tr.innerHTML = `
    <td>
      <select class="form-select form-select-sm sp-select" onchange="calcDong(this)">
        ${spOptions}
      </select>
    </td>
    <td><input type="number" class="form-control form-control-sm sl-input" min="1" value="1" oninput="calcDong(this)"></td>
    <td><input type="number" class="form-control form-control-sm gia-input" min="0" value="0" oninput="calcDong(this)"></td>
    <td class="text-end fw-bold text-danger dong-thanhtien">0 đ</td>
    <td><button class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove(); updateTongTienLapDon()"><i class="bi bi-trash"></i></button></td>
  `;
  
  tbody.appendChild(tr);
  if (window.enhanceSelect) {
    const newSelect = tr.querySelector('.sp-select');
    window.enhanceSelect(newSelect);
  }
}

function calcDong(el) {
  const tr = el.closest('tr');
  const sl = parseInt(tr.querySelector('.sl-input').value) || 0;
  
  if (el.classList.contains('sp-select')) {
    const opt = el.options[el.selectedIndex];
    if (opt && opt.value) {
      const giaDuKien = parseFloat(opt.getAttribute('data-gia')) || 0;
      tr.querySelector('.gia-input').value = giaDuKien;
    }
  }
  
  const gia = parseFloat(tr.querySelector('.gia-input').value) || 0;
  tr.querySelector('.dong-thanhtien').textContent = (sl * gia).toLocaleString('vi-VN') + ' đ';
  
  updateTongTienLapDon();
}

function updateTongTienLapDon() {
  let tong = 0;
  document.querySelectorAll('#tableChiTietLap tbody tr').forEach(tr => {
    const sl = parseInt(tr.querySelector('.sl-input').value) || 0;
    const gia = parseFloat(tr.querySelector('.gia-input').value) || 0;
    tong += sl * gia;
  });
  document.getElementById('tongTienDon').textContent = tong.toLocaleString('vi-VN') + ' đ';
}

async function submitTaoDon() {
  const nccId = document.getElementById('nccSelect').value;
  const ngayHenGiao = document.getElementById('ngayHenGiao').value;
  const ghiChu = document.getElementById('ghiChu').value;
  
  if (!nccId || !ngayHenGiao) {
    api.showToast('Vui lòng chọn NCC và Ngày hẹn giao', 'warning');
    return;
  }
  
  const chiTiet = [];
  document.querySelectorAll('#tableChiTietLap tbody tr').forEach(tr => {
    const spId = tr.querySelector('.sp-select').value;
    const sl = parseInt(tr.querySelector('.sl-input').value) || 0;
    const gia = parseFloat(tr.querySelector('.gia-input').value) || 0;
    
    if (spId && sl > 0) {
      chiTiet.push({ sanPham: spId, soLuong: sl, donGiaNhap: gia });
    }
  });
  
  if (chiTiet.length === 0) {
    api.showToast('Vui lòng thêm ít nhất 1 sản phẩm', 'warning');
    return;
  }
  
  const payload = { nhaCungCapId: nccId, ngayHenGiao, ghiChu, chiTiet };
  
  const res = await api.post('/don-dat-hang-ncc', payload);
  if (res.success) {
    bootstrap.Modal.getInstance(document.getElementById('modalTaoDon')).hide();
    loadDanhSachDon();
  }
}

// -----------------------------------
// XEM CHI TIẾT ĐƠN HÀNG
// -----------------------------------
async function xemChiTiet(id) {
  currentDonId = id;
  const modal = new bootstrap.Modal(document.getElementById('modalChiTiet'));
  modal.show();
  
  const body = document.getElementById('chiTietBody');
  const footer = document.getElementById('chiTietFooter');
  body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
  footer.innerHTML = '';
  
  const res = await api.get(`/don-dat-hang-ncc/${id}`);
  if (!res.success) {
    body.innerHTML = '<div class="alert alert-danger">Không tải được dữ liệu đơn hàng!</div>';
    return;
  }
  
  const don = res.data;
  const isQuanLy = ['Quản lý', 'Admin'].includes(currentUser?.vaiTro);
  
  let html = `
    <div class="row mb-4">
      <div class="col-md-6">
        <h6 class="fw-bold text-primary mb-3"><i class="bi bi-info-circle me-1"></i> Thông Tin Đơn</h6>
        <table class="table table-sm table-borderless small">
          <tr><td class="text-muted" width="120">Mã Đơn:</td><td class="fw-bold">#${don._id}</td></tr>
          <tr><td class="text-muted">Nhà Cung Cấp:</td><td class="fw-semibold">${don.nhaCungCap?.tenNCC}</td></tr>
          <tr><td class="text-muted">Người Lập:</td><td>${don.nguoiLap?.hoTen}</td></tr>
          <tr><td class="text-muted">Ngày Lập:</td><td>${new Date(don.createdAt).toLocaleString('vi-VN')}</td></tr>
          <tr><td class="text-muted">Ngày Hẹn Giao:</td><td>${new Date(don.ngayHenGiao).toLocaleDateString('vi-VN')}</td></tr>
          <tr><td class="text-muted">Ghi Chú:</td><td>${escapeHtml(don.ghiChu || '')}</td></tr>
        </table>
      </div>
      <div class="col-md-6">
        <div class="bg-light p-3 rounded h-100 border">
          <div class="text-muted small fw-semibold">Trạng Thái Hiện Tại</div>
          <h5 class="fw-bold mt-1 text-primary">${don.trangThai}</h5>
          
          <div class="mt-3 text-muted small fw-semibold">Tổng Tiền Đơn Hàng</div>
          <h4 class="fw-bold text-danger mt-1 mb-0">${(don.tongTien || 0).toLocaleString('vi-VN')} đ</h4>
        </div>
      </div>
    </div>
    
    <h6 class="fw-bold text-primary mb-3"><i class="bi bi-box-seam me-1"></i> Chi Tiết Hàng Hóa</h6>
    <div class="table-responsive">
      <table class="table table-bordered table-hover text-center align-middle small">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th class="text-start">Tên Sản Phẩm</th>
            <th>Số Lượng</th>
            <th>Đơn Giá Nhập</th>
            <th>Thành Tiền</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  don.chiTiet.forEach((ct, index) => {
    const spTen = ct.sanPham?.tenMay || 'N/A';
    html += `
      <tr>
        <td>${index + 1}</td>
        <td class="text-start fw-semibold">${spTen}</td>
        <td>${ct.soLuong}</td>
        <td>${ct.donGiaNhap.toLocaleString('vi-VN')} đ</td>
        <td class="text-danger fw-bold">${(ct.soLuong * ct.donGiaNhap).toLocaleString('vi-VN')} đ</td>
      </tr>
    `;
  });
  html += `</tbody></table></div>`;
  body.innerHTML = html;
  
  // Nút hành động
  let footerHtml = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>';
  
  if (don.trangThai === 'Cho duyet' && isQuanLy) {
    footerHtml += `
      <button type="button" class="btn btn-danger" onclick="updateTrangThai('${don._id}', 'Da huy')"><i class="bi bi-x-circle"></i> Từ Chối</button>
      <button type="button" class="btn btn-success" onclick="duyetDon('${don._id}')"><i class="bi bi-check-circle"></i> Duyệt Đơn</button>
    `;
  } else if (don.trangThai === 'Da duyet' && isQuanLy) {
    footerHtml += `
      <button type="button" class="btn btn-info text-white" onclick="updateTrangThai('${don._id}', 'Dang giao')"><i class="bi bi-truck"></i> Chuyển Đang Giao</button>
    `;
  }
  // Việc nhập kho hoàn thành đơn sẽ do thủ kho nhập kho bằng phiếu nhập và chọn đơn NCC.
  
  footer.innerHTML = footerHtml;
}

async function duyetDon(id) {
  if (!confirm('Xác nhận duyệt đơn đặt hàng này?')) return;
  const res = await api.put(`/don-dat-hang-ncc/${id}/duyet`);
  if (res.success) {
    xemChiTiet(id);
    loadDanhSachDon();
  }
}

async function updateTrangThai(id, trangThaiMoi) {
  if (!confirm(`Xác nhận chuyển đơn sang trạng thái: ${trangThaiMoi}?`)) return;
  const res = await api.put(`/don-dat-hang-ncc/${id}/trang-thai`, { trangThai: trangThaiMoi });
  if (res.success) {
    xemChiTiet(id);
    loadDanhSachDon();
  }
}

function renderPagination(pagination, loadFunc) {
  const container = document.getElementById('paginationContainer');
  if (!container || !pagination || pagination.totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  const { page, totalPages } = pagination;
  let html = '<nav><ul class="pagination pagination-sm justify-content-end mb-0">';
  
  html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); ${loadFunc.name}(${page - 1})">‹</a></li>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); ${loadFunc.name}(${i})">${i}</a></li>`;
  }
  html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); ${loadFunc.name}(${page + 1})">›</a></li>`;
  
  html += '</ul></nav>';
  container.innerHTML = html;
}
