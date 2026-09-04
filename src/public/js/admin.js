let roleChart = null;

document.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadAccounts();
  
  const searchInput = document.getElementById('searchNhanVien');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadAccounts(1, e.target.value);
      }, 300);
    });
  }
});

async function loadOverview() {
  const res = await api.get('/admin/overview');
  if (!res.success) return;
  
  const { thongKe, nhanVienByRole } = res.data;
  
  // Update stats
  document.getElementById('statNhanVien').textContent = thongKe.totalNhanVien;
  document.getElementById('statKhachHang').textContent = thongKe.totalKhachHang;
  document.getElementById('statSanPham').textContent = thongKe.totalSanPham;
  document.getElementById('statHoaDon').textContent = thongKe.totalHoaDon;
  
  // Render chart
  const ctx = document.getElementById('roleChart').getContext('2d');
  
  if (roleChart) roleChart.destroy();
  
  const labels = nhanVienByRole.map(r => r._id);
  const data = nhanVienByRole.map(r => r.count);
  
  roleChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function loadAccounts(page = 1, search = '') {
  const vaiTro = document.getElementById('filterVaiTro')?.value || '';
  const searchVal = search || document.getElementById('searchNhanVien')?.value || '';
  
  const res = await api.get('/admin/accounts', { page, limit: 10, search: searchVal, vaiTro });
  const tbody = document.querySelector('#tableAccounts tbody');
  
  if (!res.success) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
    return;
  }
  
  const { accounts, pagination } = res.data;
  
  if (accounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Không tìm thấy tài khoản</td></tr>`;
    document.getElementById('paginationContainer').innerHTML = '';
    return;
  }
  
  let html = '';
  accounts.forEach(acc => {
    const isLocked = acc.trangThai === 'Khóa';
    
    html += `
      <tr>
        <td>
          <div class="fw-semibold">${acc.hoTen}</div>
          <div class="small text-muted">${acc.sdt}</div>
        </td>
        <td class="fw-medium">${acc.tenDangNhap}</td>
        <td><span class="badge bg-secondary">${acc.vaiTro}</span></td>
        <td>
          <span class="badge ${isLocked ? 'bg-danger' : 'bg-success'}">${acc.trangThai}</span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-warning" onclick="resetPassword('${acc._id}')" title="Reset Mật Khẩu"><i class="bi bi-key"></i></button>
          <button class="btn btn-sm btn-light ${isLocked ? 'text-success' : 'text-danger'}" onclick="toggleStatus('${acc._id}')" title="${isLocked ? 'Mở Khóa' : 'Khóa'}">
            <i class="bi ${isLocked ? 'bi-unlock' : 'bi-lock'}"></i>
          </button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  renderPagination(pagination, loadAccounts);
}

async function toggleStatus(id) {
  if (!confirm('Bạn có chắc chắn muốn khóa/mở khóa tài khoản này?')) return;
  const res = await api.put(`/admin/accounts/${id}/toggle-status`);
  if (res.success) {
    loadAccounts();
  }
}

async function resetPassword(id) {
  const newPass = prompt('Nhập mật khẩu mới (hoặc để trống để dùng mặc định là 123456):', '123456');
  if (newPass === null) return; // Cancel
  
  const res = await api.put(`/admin/accounts/${id}/reset-password`, { matKhauMoi: newPass || '123456' });
  if (res.success) {
    api.showToast(`Reset mật khẩu thành công! Mật khẩu mới là: ${newPass || '123456'}`, 'success');
  }
}

async function backupDatabase() {
  const btn = document.querySelector('button[onclick="backupDatabase()"]');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-arrow-repeat text-white" style="animation: spin 1s infinite linear;"></i> Đang tạo...';
  btn.disabled = true;
  
  const res = await api.post('/admin/backup');
  if (res.success) {
    api.showToast(res.message, 'success');
  }
  
  btn.innerHTML = oldText;
  btn.disabled = false;
}

async function restoreDatabase() {
  if (!confirm('CẢNH BÁO: Việc phục hồi dữ liệu sẽ ghi đè lên toàn bộ dữ liệu hiện tại! Bạn có chắc chắn?')) return;
  
  const btn = document.querySelector('button[onclick="restoreDatabase()"]');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s infinite linear;"></i> Đang phục hồi...';
  btn.disabled = true;
  
  const res = await api.post('/admin/restore');
  if (res.success) {
    api.showToast(res.message, 'success');
    loadOverview();
  }
  
  btn.innerHTML = oldText;
  btn.disabled = false;
}

// Keyframes cho animation
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);

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
