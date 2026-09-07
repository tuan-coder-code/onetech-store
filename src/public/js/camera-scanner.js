/**
 * Module Quét Mã Vạch Barcode / IMEI / QR Code bằng Camera Điện Thoại & Webcam Laptop
 * Sử dụng thư viện Html5Qrcode chuẩn HTML5 Camera API
 * Hỗ trợ các định dạng mã vạch thông dụng: CODE_128, CODE_39, EAN_13, UPC_A, QR_CODE
 */

let cameraScannerInstance = null;
let currentCameraScannerModal = null;
let onScanCallback = null;
let isContinuousScanMode = false;
let lastScannedCode = '';
let lastScannedTime = 0;

/**
 * Phát âm thanh bíp POS khi quét thành công
 */
function playScannerBeep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // AudioContext blocked
  }
}

/**
 * Khởi tạo Modal Camera vào DOM nếu chưa có
 */
function ensureCameraModalInDOM() {
  if (document.getElementById('cameraScannerModal')) return;

  const modalHtml = `
    <div class="modal fade" id="cameraScannerModal" tabindex="-1" aria-labelledby="cameraScannerModalLabel" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content shadow-lg border-0" style="border-radius: 16px; overflow: hidden;">
          <div class="modal-header bg-dark text-white py-3">
            <h6 class="modal-title fw-bold d-flex align-items-center mb-0" id="cameraScannerModalLabel">
              <i class="bi bi-camera-fill text-warning me-2 fs-5"></i> Quét Mã Vạch IMEI / Barcode
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" onclick="closeCameraScanner()"></button>
          </div>

          <div class="modal-body p-3 bg-light">
            <!-- Tùy chọn Camera & Chế độ quét -->
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <div class="d-flex align-items-center gap-1.5 flex-grow-1" style="max-width: 250px;">
                <i class="bi bi-camera-video text-muted small"></i>
                <select id="selectCameraDevices" class="form-select form-select-sm" style="font-size: 0.8rem;" onchange="switchSelectedCamera(this.value)">
                  <option value="">Đang tìm camera...</option>
                </select>
              </div>

              <div class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" id="checkContinuousScan" onchange="toggleContinuousScan(this.checked)">
                <label class="form-check-label small fw-semibold" for="checkContinuousScan" title="Bật để quét liên tục nhiều máy">Quét liên tục</label>
              </div>
            </div>

            <!-- Khung chiếu Camera -->
            <div class="position-relative bg-black rounded-3 overflow-hidden" style="min-height: 280px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);">
              <div id="cameraScannerReader" style="width: 100%;"></div>

              <!-- Đường quét Laser mô phỏng -->
              <div id="scannerLaserLine" class="scanner-laser" style="display: none;"></div>

              <!-- Khung ngắm Viewfinder -->
              <div class="scanner-reticle" id="scannerReticle">
                <div class="reticle-corner top-left"></div>
                <div class="reticle-corner top-right"></div>
                <div class="reticle-corner bottom-left"></div>
                <div class="reticle-corner bottom-right"></div>
              </div>
            </div>

            <!-- Trạng thái & Kết quả quét gần nhất -->
            <div class="mt-3 text-center">
              <div id="scannerStatusText" class="small text-muted mb-1">
                <i class="bi bi-info-circle me-1"></i> Hướng camera vào mã vạch IMEI trên vỏ hộp hoặc thân máy
              </div>
              <div id="scannerLastResult" class="fw-bold font-monospace text-primary fs-6 p-2 rounded bg-white border border-primary-subtle d-none"></div>
            </div>
          </div>

          <div class="modal-footer bg-light py-2 d-flex justify-content-between">
            <span class="badge bg-secondary-subtle text-secondary small">
              <i class="bi bi-upc-scan me-1"></i> 1D Barcode & QR Code
            </span>
            <button type="button" class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" onclick="closeCameraScanner()">
              <i class="bi bi-x-circle me-1"></i> Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  injectScannerStyles();
}

/**
 * Thêm CSS cho viewfinder và tia laser quét
 */
function injectScannerStyles() {
  if (document.getElementById('cameraScannerStyles')) return;
  const style = document.createElement('style');
  style.id = 'cameraScannerStyles';
  style.innerHTML = `
    .scanner-reticle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 78%;
      height: 150px;
      pointer-events: none;
      border: 1.5px dashed rgba(255, 255, 255, 0.4);
      border-radius: 8px;
    }
    .reticle-corner {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: #3b82f6;
      border-style: solid;
    }
    .reticle-corner.top-left { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-top-left-radius: 6px; }
    .reticle-corner.top-right { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-top-right-radius: 6px; }
    .reticle-corner.bottom-left { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-bottom-left-radius: 6px; }
    .reticle-corner.bottom-right { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-bottom-right-radius: 6px; }
    
    .scanner-laser {
      position: absolute;
      top: 25%;
      left: 12%;
      right: 12%;
      height: 2.5px;
      background: linear-gradient(90deg, transparent, #ef4444 20%, #ef4444 80%, transparent);
      box-shadow: 0 0 10px #ef4444;
      animation: laserSweep 2s ease-in-out infinite alternate;
      pointer-events: none;
    }
    @keyframes laserSweep {
      0% { top: 25%; opacity: 0.8; }
      100% { top: 75%; opacity: 0.95; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Đảm bảo thư viện Html5Qrcode đã được nạp
 */
async function ensureHtml5QrcodeLoaded() {
  if (typeof Html5Qrcode !== 'undefined') return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = '/js/html5-qrcode.min.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://unpkg.com/html5-qrcode';
      fallbackScript.onload = () => resolve(true);
      fallbackScript.onerror = () => resolve(false);
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  });
}

/**
 * Mở modal Camera Scanner
 * @param {Object} options
 * @param {Function} options.onScan Callback khi quét trúng mã
 * @param {String} [options.title] Tiêu đề
 * @param {Boolean} [options.continuous=false] Quét liên tục hay quét 1 mã rồi đóng
 */
async function openCameraScanner(options = {}) {
  const { onScan, title, continuous = false } = options;
  if (!onScan || typeof onScan !== 'function') {
    console.error('openCameraScanner: thiếu callback onScan');
    return;
  }

  onScanCallback = onScan;
  isContinuousScanMode = continuous;
  lastScannedCode = '';

  ensureCameraModalInDOM();

  const loaded = await ensureHtml5QrcodeLoaded();
  if (!loaded) {
    if (typeof api !== 'undefined' && api.showToast) {
      api.showToast('Không thể tải thư viện Camera Scanner!', 'danger');
    } else {
      alert('Không thể tải thư viện Camera Scanner!');
    }
    return;
  }

  if (title) {
    const titleEl = document.getElementById('cameraScannerModalLabel');
    if (titleEl) {
      titleEl.innerHTML = `<i class="bi bi-camera-fill text-warning me-2 fs-5"></i> ${title}`;
    }
  }

  const checkContinuous = document.getElementById('checkContinuousScan');
  if (checkContinuous) {
    checkContinuous.checked = continuous;
  }

  const modalEl = document.getElementById('cameraScannerModal');
  currentCameraScannerModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  currentCameraScannerModal.show();

  modalEl.removeEventListener('hidden.bs.modal', handleModalHidden);
  modalEl.addEventListener('hidden.bs.modal', handleModalHidden);

  setTimeout(() => {
    startCameraStream();
  }, 350);
}

/**
 * Khởi động luồng Camera
 */
async function startCameraStream(preferredDeviceId = null) {
  const laser = document.getElementById('scannerLaserLine');
  const statusText = document.getElementById('scannerStatusText');
  const lastResult = document.getElementById('scannerLastResult');

  if (lastResult) lastResult.classList.add('d-none');
  if (statusText) statusText.innerHTML = '<div class="spinner-border spinner-border-sm text-primary me-1"></div> Đang kích hoạt camera...';

  try {
    if (cameraScannerInstance) {
      await cameraScannerInstance.stop().catch(() => {});
      cameraScannerInstance.clear();
      cameraScannerInstance = null;
    }

    cameraScannerInstance = new Html5Qrcode('cameraScannerReader');

    const devices = await Html5Qrcode.getCameras();
    const selectDevices = document.getElementById('selectCameraDevices');

    if (selectDevices && devices && devices.length > 0) {
      selectDevices.innerHTML = devices.map((d, i) => `
        <option value="${d.id}" ${d.label.toLowerCase().includes('back') || i === devices.length - 1 ? 'selected' : ''}>
          ${d.label || `Camera ${i + 1}`}
        </option>
      `).join('');
    }

    let cameraIdOrConfig = { facingMode: 'environment' };
    if (preferredDeviceId) {
      cameraIdOrConfig = preferredDeviceId;
    } else if (selectDevices && selectDevices.value) {
      cameraIdOrConfig = selectDevices.value;
    }

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(viewfinderWidth * 0.8),
          height: Math.floor(minEdge * 0.5)
        };
      },
      aspectRatio: 1.333334
    };

    await cameraScannerInstance.start(
      cameraIdOrConfig,
      config,
      (decodedText, decodedResult) => {
        handleCameraDetectedCode(decodedText, decodedResult);
      },
      () => {}
    );

    if (laser) laser.style.display = 'block';
    if (statusText) {
      statusText.innerHTML = '<span class="text-success fw-semibold"><i class="bi bi-camera-fill me-1"></i> Camera sẵn sàng!</span> Hướng vào mã vạch trên máy';
    }

  } catch (err) {
    console.error('Lỗi khởi động camera scanner:', err);
    if (laser) laser.style.display = 'none';
    if (statusText) {
      statusText.innerHTML = `
        <span class="text-danger fw-semibold"><i class="bi bi-exclamation-triangle-fill me-1"></i> Không thể truy cập Camera</span><br>
        <span class="text-muted small">Vui lòng cấp quyền Camera trên trình duyệt hoặc kiểm tra kết nối webcam.</span>
      `;
    }
  }
}

/**
 * Xử lý khi quét trúng mã vạch
 */
function handleCameraDetectedCode(decodedText, decodedResult) {
  if (!decodedText) return;
  const cleanCode = decodedText.trim();

  const now = Date.now();
  if (cleanCode === lastScannedCode && (now - lastScannedTime) < 1500) {
    return;
  }
  lastScannedCode = cleanCode;
  lastScannedTime = now;

  playScannerBeep('success');

  if (navigator.vibrate) {
    navigator.vibrate(80);
  }

  const lastResult = document.getElementById('scannerLastResult');
  if (lastResult) {
    lastResult.textContent = `Đã quét: ${cleanCode}`;
    lastResult.classList.remove('d-none');
  }

  if (onScanCallback) {
    onScanCallback(cleanCode, decodedResult);
  }

  if (!isContinuousScanMode) {
    setTimeout(() => {
      closeCameraScanner();
    }, 450);
  }
}

function switchSelectedCamera(deviceId) {
  if (!deviceId) return;
  startCameraStream(deviceId);
}

function toggleContinuousScan(enabled) {
  isContinuousScanMode = enabled;
  if (typeof api !== 'undefined' && api.showToast) {
    api.showToast(enabled ? 'Đã bật chế độ Quét liên tục nhiều máy' : 'Đã chuyển sang chế độ Quét từng máy', 'info');
  }
}

async function closeCameraScanner() {
  const laser = document.getElementById('scannerLaserLine');
  if (laser) laser.style.display = 'none';

  if (cameraScannerInstance) {
    try {
      await cameraScannerInstance.stop();
      cameraScannerInstance.clear();
    } catch (e) {}
    cameraScannerInstance = null;
  }

  if (currentCameraScannerModal) {
    currentCameraScannerModal.hide();
  }
}

function handleModalHidden() {
  closeCameraScanner();
}

window.openCameraScanner = openCameraScanner;
window.closeCameraScanner = closeCameraScanner;
