/**
 * Module xử lý Khách hàng phía Client
 */

document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  if (path.includes('khach-hang/index.html') || path.endsWith('/khach-hang/')) {
    initKhachHangIndex();
  } else if (path.includes('khach-hang/form.html')) {
    initKhachHangForm();
  }
});

async function initKhachHangIndex() {
  const filterForm = document.getElementById('filterForm');
  const btnReset = document.getElementById('btnResetFilter');
  const searchInput = document.getElementById('filterSearch');
  const filterHangThanhVien = document.getElementById('filterHangThanhVien');
  const filterTongChiTieu = document.getElementById('filterTongChiTieu');

  await loadKhachHangList();

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadKhachHangList();
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadKhachHangList();
      }, 300);
    });
  }
  
  if (filterHangThanhVien) {
    filterHangThanhVien.addEventListener('change', loadKhachHangList);
  }
  
  if (filterTongChiTieu) {
    filterTongChiTieu.addEventListener('change', loadKhachHangList);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterHangThanhVien) filterHangThanhVien.value = '';
      if (filterTongChiTieu) filterTongChiTieu.value = '';
      loadKhachHangList();
    });
  }
}

// Debounce implementation for search
let searchTimeout;

async function loadKhachHangList() {
  const search = document.getElementById('filterSearch')?.value.trim() || '';
  const hangThanhVien = document.getElementById('filterHangThanhVien')?.value || '';
  const tongChiTieuRange = document.getElementById('filterTongChiTieu')?.value || '';
  
  let query = { search, hangThanhVien };
  if (tongChiTieuRange) {
    const parts = tongChiTieuRange.split('-');
    if (parts[0]) query.tongChiTieuMin = parts[0];
    if (parts[1]) query.tongChiTieuMax = parts[1];
  }

  const res = await api.get('/khach-hang', query);
  if (!res.success) {
    showToast(res.message || 'Không thể tải danh sách khách hàng', 'danger');
    return;
  }

  const khachHangs = res.data;
  const tbody = document.getElementById('tableKhachHangBody');
  if (!tbody) return;

  if (khachHangs && khachHangs.length > 0) {
    const isSellerOrCashierOrManager = currentUser && ['Quản lý', 'NV bán hàng', 'Thu ngân'].includes(currentUser.vaiTro);
    const isManager = currentUser && currentUser.vaiTro === 'Quản lý';

    tbody.innerHTML = khachHangs.map(kh => {
      const getBadgeColor = (hang) => {
        if (hang === 'Kim Cương') return 'bg-dark';
        if (hang === 'Vàng') return 'bg-warning text-dark';
        if (hang === 'Bạc') return 'bg-secondary';
        return 'bg-info text-dark';
      };
      
      return `
      <tr>
        <td>
          <div class="fw-semibold">${escapeHtml(kh.hoTen)}</div>
          <div class="small text-muted">${escapeHtml(kh.email || '')}</div>
        </td>
        <td>
          <div class="font-monospace text-primary">${escapeHtml(kh.sdt || 'Chưa cập nhật')}</div>
          <div class="small text-muted" style="font-size: 0.75rem;"><i class="bi bi-geo-alt"></i> ${escapeHtml(kh.diaChi || 'Chưa cập nhật')}</div>
        </td>
        <td><span class="badge ${getBadgeColor(kh.hangThanhVien)}">${escapeHtml(kh.hangThanhVien || 'Đồng')}</span></td>
        <td class="fw-semibold">${formatCurrency(kh.tongChiTieu || 0)}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            ${isSellerOrCashierOrManager ? `
              <a href="/khach-hang/form.html?id=${kh._id}" class="btn btn-outline-primary" title="Sửa">
                <i class="bi bi-pencil"></i>
              </a>
            ` : ''}
            ${isManager ? `
              <button type="button" class="btn btn-outline-danger" title="Xóa" onclick="deleteKhachHang('${kh._id}', '${escapeHtml(kh.hoTen)}')">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Không tìm thấy khách hàng nào</td></tr>';
  }
}

async function deleteKhachHang(id, hoTen) {
  if (!confirm(`Bạn có chắc chắn muốn xóa khách hàng "${hoTen}"?`)) return;

  const res = await api.delete(`/khach-hang/${id}`);
  if (res.success) {
    showToast(res.message || 'Xóa khách hàng thành công', 'success');
    loadKhachHangList();
  } else {
    showToast(res.message || 'Lỗi khi xóa khách hàng', 'danger');
  }
}

async function initKhachHangForm() {
  const params = getQueryParams();
  const editId = params.id;
  const isEdit = Boolean(editId);

  if (isEdit) {
    document.getElementById('formTitle').textContent = 'Chỉnh sửa Khách hàng';
    document.getElementById('btnSubmitForm').innerHTML = '<i class="bi bi-check2-circle me-1"></i> Cập nhật Khách hàng';

    const res = await api.get(`/khach-hang/${editId}`);
    if (res.success && res.data && res.data.khachHang) {
      const kh = res.data.khachHang;
      document.getElementById('inputHoTen').value = kh.hoTen || '';
      document.getElementById('inputSdt').value = kh.sdt || '';
      if(document.getElementById('inputEmail')) document.getElementById('inputEmail').value = kh.email || '';
      document.getElementById('inputDiaChi').value = kh.diaChi || '';
    } else {
      showToast('Không tìm thấy thông tin khách hàng', 'danger');
    }
  }

  const form = document.getElementById('khachHangForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const body = {
        hoTen: document.getElementById('inputHoTen').value.trim(),
        sdt: document.getElementById('inputSdt').value.trim(),
        email: document.getElementById('inputEmail')?.value.trim() || '',
        diaChi: document.getElementById('inputDiaChi').value.trim()
      };

      if (!body.hoTen) {
        showToast('Họ tên khách hàng không được để trống', 'danger');
        return;
      }

      let res;
      if (isEdit) {
        res = await api.put(`/khach-hang/${editId}`, body);
      } else {
        res = await api.post('/khach-hang', body);
      }

      if (res.success) {
        showToast(res.message || 'Lưu thông tin khách hàng thành công', 'success');
        setTimeout(() => {
          window.location.href = '/khach-hang/index.html';
        }, 800);
      } else {
        showToast(res.message || 'Lỗi khi lưu khách hàng', 'danger');
      }
    });
  }
}
