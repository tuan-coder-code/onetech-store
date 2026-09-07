/**
 * Module xử lý dữ liệu cho Dashboard & Báo cáo Thống kê
 * Phụ trách: Đinh Đức Vương (Thành viên 5) & Nguyễn Tuấn Vũ (Frontend)
 */

let revenueChartInstance = null;
let currentChartGroup = 'ngay';

/**
 * Hiệu ứng đếm số từ 0 lên target
 */
function animateCount(elementId, target, duration = 800) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
  await loadFinancialReports();
});

/**
 * Render nút thao tác nhanh trên Dashboard theo vai trò người dùng
 */
function renderDashboardActions(user) {
  const container = document.getElementById('dashboardQuickActions');
  if (!container || !user) return;

  const role = user.vaiTro;
  let buttonsHtml = '';

  if (role === 'Quản lý') {
    buttonsHtml = `
      <a href="/ban-hang/index.html" class="btn btn-primary btn-sm border-2 fw-medium">
        <i class="bi bi-cart-check me-1"></i> Bán hàng POS
      </a>
      <a href="/nhap-kho/index.html" class="btn btn-outline-primary btn-sm border-2 fw-medium">
        <i class="bi bi-box-arrow-in-down me-1"></i> Nhập kho
      </a>
      <a href="/kiem-ke/index.html" class="btn btn-outline-success btn-sm border-2 fw-medium">
        <i class="bi bi-clipboard-check me-1"></i> Kiểm kê kho
      </a>
      <a href="/so-quy/index.html" class="btn btn-outline-secondary btn-sm border-2 fw-medium">
        <i class="bi bi-wallet2 me-1"></i> Sổ quỹ
      </a>
    `;
  } else if (role === 'NV bán hàng') {
    buttonsHtml = `
      <a href="/ban-hang/index.html" class="btn btn-primary btn-sm border-2 fw-medium">
        <i class="bi bi-cart-check me-1"></i> Bán hàng POS
      </a>
      <a href="/dat-truoc/index.html" class="btn btn-outline-primary btn-sm border-2 fw-medium">
        <i class="bi bi-bookmark-star me-1"></i> Đặt trước
      </a>
      <a href="/bao-hanh/index.html" class="btn btn-outline-secondary btn-sm border-2 fw-medium">
        <i class="bi bi-shield-check me-1"></i> Tra cứu BH
      </a>
    `;
  } else if (role === 'Thủ kho') {
    buttonsHtml = `
      <a href="/nhap-kho/index.html" class="btn btn-primary btn-sm border-2 fw-medium">
        <i class="bi bi-box-arrow-in-down me-1"></i> Nhập kho
      </a>
      <a href="/kiem-ke/index.html" class="btn btn-outline-primary btn-sm border-2 fw-medium">
        <i class="bi bi-clipboard-check me-1"></i> Kiểm kê kho
      </a>
      <a href="/may-imei/index.html" class="btn btn-outline-secondary btn-sm border-2 fw-medium">
        <i class="bi bi-upc-scan me-1"></i> Quản lý IMEI
      </a>
    `;
  } else if (role === 'Thu ngân') {
    buttonsHtml = `
      <a href="/ban-hang/index.html" class="btn btn-primary btn-sm border-2 fw-medium">
        <i class="bi bi-cart-check me-1"></i> Bán hàng POS
      </a>
      <a href="/so-quy/index.html" class="btn btn-outline-primary btn-sm border-2 fw-medium">
        <i class="bi bi-wallet2 me-1"></i> Thu - Chi Sổ quỹ
      </a>
      <a href="/cong-no/index.html" class="btn btn-outline-secondary btn-sm border-2 fw-medium">
        <i class="bi bi-journal-bookmark me-1"></i> Công nợ
      </a>
    `;
  } else if (role === 'Kế toán') {
    buttonsHtml = `
      <a href="/so-quy/index.html" class="btn btn-primary btn-sm border-2 fw-medium">
        <i class="bi bi-wallet2 me-1"></i> Sổ quỹ
      </a>
      <a href="/cong-no/index.html" class="btn btn-outline-primary btn-sm border-2 fw-medium">
        <i class="bi bi-journal-bookmark me-1"></i> Đối soát công nợ
      </a>
      <a href="/kiem-ke/index.html" class="btn btn-outline-secondary btn-sm border-2 fw-medium">
        <i class="bi bi-clipboard-check me-1"></i> Kiểm kê kho
      </a>
    `;
  } else if (role === 'Kỹ thuật') {
    buttonsHtml = `
      <a href="/bao-hanh/index.html" class="btn btn-primary btn-sm border-2 fw-medium">
        <i class="bi bi-shield-check me-1"></i> Tra cứu & Bảo hành
      </a>
      <a href="/may-imei/index.html" class="btn btn-outline-primary btn-sm border-2 fw-medium">
        <i class="bi bi-upc-scan me-1"></i> Tra cứu IMEI
      </a>
    `;
  }

  container.innerHTML = buttonsHtml;

  // Ẩn/hiện thẻ phụ theo quyền
  const linkNhanVien = document.getElementById('linkNhanVien');
  if (linkNhanVien && role !== 'Quản lý') {
    linkNhanVien.style.display = 'none';
  }

  const linkNhaCungCap = document.getElementById('linkNhaCungCap');
  if (linkNhaCungCap && !['Quản lý', 'Thủ kho', 'Kế toán'].includes(role)) {
    linkNhaCungCap.style.display = 'none';
  }

  const linkKhachHang = document.getElementById('linkKhachHang');
  if (linkKhachHang && !['Quản lý', 'NV bán hàng', 'Thu ngân', 'Kế toán'].includes(role)) {
    linkKhachHang.style.display = 'none';
  }
}

/**
 * Tải dữ liệu tổng quan Dashboard
 */
async function loadDashboardData() {
  const res = await api.get('/dashboard');
  if (!res.success) {
    console.warn('Lỗi tải dữ liệu dashboard:', res.message);
    return;
  }

  const { stats, recentMayImei } = res;

  // Cập nhật thẻ thống kê với hiệu ứng đếm số
  animateCount('statTotalMayImei', stats.totalMayImei || 0);
  animateCount('statTotalSanPham', stats.totalSanPham || 0, 600);
  animateCount('statImeiConHang', stats.imeiConHang || 0, 900);
  animateCount('statImeiDaBan', stats.imeiDaBan || 0, 700);
  animateCount('statImeiBaoHanh', stats.imeiBaoHanh || 0, 750);
  animateCount('statTotalKhachHang', stats.totalKhachHang || 0, 650);
  animateCount('statTotalNhaCungCap', stats.totalNhaCungCap || 0, 600);
  animateCount('statTotalNhanVien', stats.totalNhanVien || 0, 600);

  // Render nút thao tác nhanh
  const user = await getCurrentUser();
  if (user) {
    renderDashboardActions(user);
  }

  // Render bảng IMEI mới nhất
  const tableRecentImei = document.getElementById('tableRecentImei');
  if (tableRecentImei && recentMayImei && recentMayImei.length > 0) {
    tableRecentImei.innerHTML = recentMayImei.map(item => {
      let badgeClass = 'badge bg-secondary';
      let badgeText = item.trangThai || 'Khác';
      if (item.trangThai === 'Con hang') {
        badgeClass = 'badge bg-success';
        badgeText = 'Còn hàng';
      } else if (item.trangThai === 'Da ban') {
        badgeClass = 'badge bg-primary';
        badgeText = 'Đã bán';
      } else if (item.trangThai === 'Bao hanh') {
        badgeClass = 'badge bg-warning text-dark';
        badgeText = 'Bảo hành';
      } else if (item.trangThai === 'Loi') {
        badgeClass = 'badge bg-danger';
        badgeText = 'Lỗi';
      }

      return `
        <tr>
          <td>
            <span class="font-monospace fw-bold text-dark">${escapeHtml(item.imei)}</span>
            ${(item.mauSac || item.dungLuong) ? `<div class="small text-muted">${escapeHtml(item.mauSac || '')} ${escapeHtml(item.dungLuong || '')}</div>` : ''}
          </td>
          <td>${item.sanPham ? escapeHtml(item.sanPham.tenMay) : 'N/A'}</td>
          <td class="fw-semibold">${formatCurrency(item.giaNhap)}</td>
          <td><span class="${badgeClass}">${badgeText}</span></td>
        </tr>
      `;
    }).join('');
  } else if (tableRecentImei) {
    tableRecentImei.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Chưa có bản ghi IMEI nào</td></tr>';
  }
}

/**
 * Lấy thông tin người dùng hiện tại an toàn
 */
async function getCurrentUser() {
  if (currentUser && currentUser.vaiTro) return currentUser;
  if (window.currentUser && window.currentUser.vaiTro) {
    currentUser = window.currentUser;
    return currentUser;
  }
  try {
    const res = await api.get('/auth/me');
    if (res && res.success) {
      currentUser = res.user || (res.data && res.data.user) || (res.data && res.data.hoTen ? res.data : null);
      window.currentUser = currentUser;
      return currentUser;
    }
  } catch (err) {
    console.warn('Lỗi lấy thông tin phiên đăng nhập:', err.message);
  }
  return null;
}

/**
 * Kiểm tra xem người dùng có quyền xem báo cáo tài chính doanh thu / chi phí
 */
function hasFinancialReportPermission(user) {
  if (!user || !user.vaiTro) return false;
  return ['Quản lý', 'Admin', 'Kế toán'].includes(user.vaiTro);
}

/**
 * Render giao diện phân quyền bảo mật cho vai trò không có quyền xem Doanh thu & Chi phí
 */
function renderRestrictedChartCard(user) {
  const roleName = user?.vaiTro || 'Nhân viên';

  // 1. Ẩn bộ lọc ngày và các nút nhóm thời gian
  const controls = document.getElementById('revenueChartControls');
  if (controls) {
    controls.innerHTML = `
      <span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2.5 py-1 rounded-pill small">
        <i class="bi bi-shield-lock-fill me-1"></i> Dành riêng Quản lý & Kế toán
      </span>
    `;
  }

  // 2. Thay thế canvas bằng thông báo bảo mật sang trọng, chuyên nghiệp
  const chartContainer = document.getElementById('canvasRevenueChartContainer');
  if (chartContainer) {
    let quickLink = '';
    if (roleName === 'NV bán hàng') {
      quickLink = `<a href="/ban-hang/index.html" class="btn btn-primary btn-sm"><i class="bi bi-cart-check me-1"></i> Đến Bán Hàng POS</a>`;
    } else if (roleName === 'Thủ kho') {
      quickLink = `<a href="/nhap-kho/index.html" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-in-down me-1"></i> Đến Nhập Kho</a>`;
    } else if (roleName === 'Thu ngân') {
      quickLink = `<a href="/ban-hang/index.html" class="btn btn-primary btn-sm"><i class="bi bi-cart-check me-1"></i> Đến Bán Hàng POS</a>`;
    } else if (roleName === 'Kỹ thuật') {
      quickLink = `<a href="/bao-hanh/index.html" class="btn btn-primary btn-sm"><i class="bi bi-shield-check me-1"></i> Đến Tra Cứu Bảo Hành</a>`;
    }

    chartContainer.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center text-center h-100 p-4" style="background: linear-gradient(135deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.95) 100%); border-radius: 12px; border: 1.5px dashed #cbd5e1;">
        <div class="stat-icon purple mb-3" style="width: 52px; height: 52px; font-size: 1.4rem;">
          <i class="bi bi-shield-lock-fill"></i>
        </div>
        <h6 class="fw-bold text-dark mb-1">Báo Cáo Doanh Thu & Chi Phí Tài Chính</h6>
        <p class="text-muted small mb-3" style="max-width: 440px; line-height: 1.5;">
          Số liệu doanh thu thuần, chi phí và lợi nhuận được phân quyền bảo mật, chỉ hiển thị cho tài khoản vai trò <b>Quản lý</b> và <b>Kế toán</b>.
        </p>
        <div class="d-flex flex-wrap align-items-center justify-content-center gap-2">
          <span class="badge bg-secondary-subtle text-secondary border px-2.5 py-1.5 font-monospace">
            <i class="bi bi-person-badge me-1"></i> Vai trò của bạn: <b>${escapeHtml(roleName)}</b>
          </span>
          ${quickLink}
        </div>
      </div>
    `;
  }

  // 3. Hiển thị các thẻ tóm tắt dưới dạng bảo mật
  const cardTongDoanhThu = document.getElementById('cardTongDoanhThu');
  const cardTongChiPhi = document.getElementById('cardTongChiPhi');
  const cardLoiNhuanGop = document.getElementById('cardLoiNhuanGop');

  if (cardTongDoanhThu) {
    cardTongDoanhThu.innerHTML = '<span class="text-muted small font-monospace"><i class="bi bi-lock-fill me-1"></i>Bảo mật</span>';
  }
  if (cardTongChiPhi) {
    cardTongChiPhi.innerHTML = '<span class="text-muted small font-monospace"><i class="bi bi-lock-fill me-1"></i>Bảo mật</span>';
  }
  if (cardLoiNhuanGop) {
    cardLoiNhuanGop.innerHTML = '<span class="text-muted small font-monospace"><i class="bi bi-lock-fill me-1"></i>Bảo mật</span>';
  }
}

/**
 * Tải Báo Cáo Tài Chính, Biểu Đồ Doanh Thu, Top SP & Hàng Tồn Lâu Ngày
 */
async function loadFinancialReports() {
  try {
    const user = await getCurrentUser();

    // 1. Tải dữ liệu doanh thu & vẽ biểu đồ (hoặc hiển thị thẻ bảo mật nếu không có quyền)
    if (hasFinancialReportPermission(user)) {
      await updateRevenueChart(currentChartGroup);
    } else {
      renderRestrictedChartCard(user);
    }

    // 2. Tải Top sản phẩm bán chạy (Chỉ dành cho Quản lý, Kế toán, NV bán hàng, Thủ kho)
    const tbodyTop = document.getElementById('tbodyTopSanPham');
    const canViewTopSp = !user || ['Quản lý', 'Admin', 'Kế toán', 'NV bán hàng', 'Thủ kho'].includes(user.vaiTro);
    if (canViewTopSp) {
      const resTop = await api.get('/bao-cao/top-san-pham?limit=5');
      if (tbodyTop && resTop && resTop.success && resTop.data) {
        const { topTheoSoLuong = [] } = resTop.data;
        if (topTheoSoLuong.length === 0) {
          tbodyTop.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">Chưa có dữ liệu bán hàng</td></tr>';
        } else {
          tbodyTop.innerHTML = topTheoSoLuong.map((item, idx) => `
            <tr>
              <td>
                <div class="fw-bold">${idx + 1}. ${escapeHtml(item.tenMay)}</div>
                <div class="small text-muted">${escapeHtml(item.hang || 'N/A')}</div>
              </td>
              <td class="text-center"><span class="badge bg-primary-subtle text-primary fw-bold">${item.soLuongBan}</span></td>
              <td class="text-end fw-bold text-success">${formatCurrency(item.doanhThu)}</td>
            </tr>
          `).join('');
        }
      }
    } else if (tbodyTop) {
      tbodyTop.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3"><i class="bi bi-shield-lock me-1"></i> Số liệu chỉ dành cho bộ phận Bán hàng & Kho</td></tr>';
    }

    // 3. Tải Hàng tồn lâu ngày (tất cả 6 vai trò đều có quyền)
    const resTon = await api.get('/bao-cao/ton-lau-ngay?soNgay=30&limit=5');
    const tableTonKhoLau = document.getElementById('tableTonKhoLauNgay');
    const badgeCountTonLau = document.getElementById('badgeCountTonLau');

    if (resTon && resTon.success && resTon.data) {
      const { danhSach = [], tongSoLuong = 0 } = resTon.data;
      if (badgeCountTonLau) badgeCountTonLau.textContent = `${tongSoLuong} máy`;

      if (tableTonKhoLau) {
        if (danhSach.length === 0) {
          tableTonKhoLau.innerHTML = '<tr><td colspan="3" class="text-center text-success py-3"><i class="bi bi-check2-circle me-1"></i> Không có máy tồn lâu > 30 ngày</td></tr>';
        } else {
          tableTonKhoLau.innerHTML = danhSach.map(item => `
            <tr>
              <td>
                <div class="font-monospace fw-bold">${escapeHtml(item.imei)}</div>
                <div class="small text-muted">${escapeHtml(item.tenMay)}</div>
              </td>
              <td class="fw-semibold">${formatCurrency(item.giaNhap)}</td>
              <td><span class="badge bg-danger">${item.soNgayTon} ngày</span></td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi khi tải báo cáo tài chính:', err.message);
  }
}

/**
 * Chuyển đổi nhóm thời gian trên biểu đồ
 */
async function switchChartGroup(group) {
  currentChartGroup = group;
  ['btnGroupNgay', 'btnGroupTuan', 'btnGroupThang', 'btnGroupNam'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });

  const activeBtn = document.getElementById(`btnGroup${group.charAt(0).toUpperCase() + group.slice(1)}`);
  if (activeBtn) activeBtn.classList.add('active');

  await updateRevenueChart(group);
}

/**
 * Lọc biểu đồ doanh thu theo ngày
 */
async function filterRevenueChart() {
  const user = await getCurrentUser();
  if (!hasFinancialReportPermission(user)) {
    if (typeof api !== 'undefined' && api.showToast) {
      api.showToast('Bạn không có quyền lọc báo cáo tài chính doanh thu', 'warning');
    }
    return;
  }

  const tuNgay = document.getElementById('inputFilterTuNgay')?.value;
  const denNgay = document.getElementById('inputFilterDenNgay')?.value;
  if (!tuNgay && !denNgay) {
    if (typeof api !== 'undefined' && api.showToast) {
      api.showToast('Vui lòng chọn Từ ngày hoặc Đến ngày để lọc', 'warning');
    } else {
      alert('Vui lòng chọn Từ ngày hoặc Đến ngày để lọc');
    }
    return;
  }
  
  if (tuNgay && denNgay && new Date(tuNgay) > new Date(denNgay)) {
    if (typeof api !== 'undefined' && api.showToast) {
      api.showToast('Từ ngày không được lớn hơn Đến ngày', 'warning');
    } else {
      alert('Từ ngày không được lớn hơn Đến ngày');
    }
    return;
  }
  
  await updateRevenueChart(currentChartGroup);
}

/**
 * Vẽ / Cập nhật Biểu đồ Chart.js
 */
async function updateRevenueChart(group = 'ngay') {
  const user = await getCurrentUser();
  if (!hasFinancialReportPermission(user)) {
    renderRestrictedChartCard(user);
    return;
  }

  // Khôi phục canvas nếu trước đó bị thay thế
  const chartContainer = document.getElementById('canvasRevenueChartContainer');
  let canvas = document.getElementById('canvasRevenueChart');
  if (!canvas && chartContainer) {
    chartContainer.innerHTML = '<canvas id="canvasRevenueChart"></canvas>';
    canvas = document.getElementById('canvasRevenueChart');
  }

  if (!canvas || typeof Chart === 'undefined') return;

  const tuNgay = document.getElementById('inputFilterTuNgay')?.value || '';
  const denNgay = document.getElementById('inputFilterDenNgay')?.value || '';
  let url = `/bao-cao/doanh-thu?nhom=${group}`;
  if (tuNgay) url += `&tuNgay=${tuNgay}`;
  if (denNgay) url += `&denNgay=${denNgay}`;

  const res = await api.get(url);
  if (!res || !res.success || !res.data) {
    if (res && (res.status === 403 || res.statusCode === 403)) {
      renderRestrictedChartCard(user);
      return;
    }
    console.warn('Không thể tải báo cáo doanh thu:', res?.message);
    return;
  }

  const { tongQuan = {}, bieuDo = {} } = res.data;

  // Cập nhật card tổng quan
  const cardTongDoanhThu = document.getElementById('cardTongDoanhThu');
  const cardTongChiPhi = document.getElementById('cardTongChiPhi');
  const cardLoiNhuanGop = document.getElementById('cardLoiNhuanGop');

  if (cardTongDoanhThu) cardTongDoanhThu.textContent = formatCurrency(tongQuan.tongDoanhThu || 0);
  if (cardTongChiPhi) cardTongChiPhi.textContent = formatCurrency(tongQuan.tongChiPhi || 0);
  if (cardLoiNhuanGop) {
    const ln = tongQuan.loiNhuanGop || 0;
    cardLoiNhuanGop.textContent = formatCurrency(ln);
    cardLoiNhuanGop.className = `fw-bold fs-6 ${ln >= 0 ? 'text-success' : 'text-danger'}`;
  }

  const hasData = bieuDo.labels && bieuDo.labels.length > 0;
  const labels = hasData ? bieuDo.labels : ['Chưa có phát sinh'];
  const doanhThuData = hasData && bieuDo.doanhThu ? bieuDo.doanhThu : [0];
  const chiPhiData = hasData && bieuDo.chiPhi ? bieuDo.chiPhi : [0];
  const isSinglePoint = labels.length === 1;

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Doanh thu',
          data: doanhThuData,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: isSinglePoint ? 0 : 0.3,
          fill: true,
          pointRadius: isSinglePoint ? 6 : 4,
          pointHoverRadius: isSinglePoint ? 8 : 6,
          pointBackgroundColor: '#4f46e5',
          borderWidth: 2
        },
        {
          label: 'Chi phí',
          data: chiPhiData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          tension: isSinglePoint ? 0 : 0.3,
          fill: true,
          pointRadius: isSinglePoint ? 6 : 4,
          pointHoverRadius: isSinglePoint ? 8 : 6,
          pointBackgroundColor: '#ef4444',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 350
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `${(val / 1000000).toLocaleString('vi-VN')} Tr`
          }
        }
      }
    }
  });
}

function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '0 đ';
  return Number(num).toLocaleString('vi-VN') + ' đ';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
