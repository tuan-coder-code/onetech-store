---
name: onetech-testing
description: Hướng dẫn đầy đủ viết test tự động (Integration Tests, E2E, RBAC 403 Forbidden, Transaction rollback, Cleanup dữ liệu) và đăng ký vào Master Test Runner (tests/run_all_tests.js) cho OneTech Store.
---

# ONETECH STORE — AUTOMATED TESTING GUIDE

Kỹ năng này cung cấp mẫu chuẩn, helper tái sử dụng và quy trình đầy đủ để viết bộ test tự động cho bất kỳ module nào trong OneTech Store.

---

## 1. Nguyên Tắc Testing

1. **Độc lập:** Mỗi bộ test tự kết nối DB, tự tạo dữ liệu cần thiết, tự cleanup sau khi xong.
2. **100% PASS:** Không merge PR khi có test FAIL.
3. **Bao phủ 3 tầng:** Service Logic → HTTP API → RBAC (6 vai trò).
4. **Không phụ thuộc thứ tự:** Test A không được phụ thuộc vào kết quả của Test B.

---

## 2. Helper Tái Sử Dụng (`tests/_helpers.js`)

> Tạo file này một lần, dùng cho toàn bộ bộ test của dự án.

```javascript
// tests/_helpers.js
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');

/**
 * Kết nối DB và khởi động HTTP server test
 * @returns {{ server, port, makeRequest, loginAs, closeAll }}
 */
async function setupTestEnvironment() {
  await connectDB();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  /**
   * Gửi HTTP request đến test server
   */
  async function makeRequest(path, method = 'GET', body = null, cookie = '') {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: '127.0.0.1', port, path, method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyStr ? Buffer.byteLength(bodyStr) : 0,
          ...(cookie ? { 'Cookie': cookie } : {})
        }
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }); }
          catch (e) { resolve({ status: res.statusCode, body: data, headers: res.headers }); }
        });
      });
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Đăng nhập và trả về cookie session
   * @param {'admin'|'thukho'|'banhang'|'thungan'|'ketoan'|'kythuat'} username
   */
  async function loginAs(username, password = '123456') {
    const res = await makeRequest('/api/auth/login', 'POST', { tenDangNhap: username, matKhau: password });
    if (res.status !== 200) throw new Error(`Đăng nhập thất bại cho user: ${username}`);
    return res.headers['set-cookie']?.[0] || '';
  }

  /**
   * Đóng server và ngắt kết nối DB
   */
  async function closeAll() {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }

  return { server, port, makeRequest, loginAs, closeAll };
}

/**
 * Hàm assert đơn giản dùng trong runTests()
 */
function createAssert() {
  let passed = 0, failed = 0;

  function assert(condition, message) {
    if (condition) { console.log(`  ✅ [PASS] ${message}`); passed++; }
    else           { console.error(`  ❌ [FAIL] ${message}`); failed++; }
  }

  function summary() {
    console.log('\n===============================================================');
    console.log(`🎉 KẾT QUẢ: ${passed} PASS | ${failed} FAIL`);
    console.log('===============================================================\n');
    if (failed > 0) { console.error(`❌ CÓ ${failed} TEST CASES THẤT BẠI!`); process.exit(1); }
    else            { console.log('✅ TOÀN BỘ TEST CASES ĐÃ VƯỢT QUA!\n'); process.exit(0); }
  }

  return { assert, summary };
}

module.exports = { setupTestEnvironment, createAssert };
```

---

## 3. Mẫu File Test Chuẩn (`tests/test_[module].js`)

```javascript
// tests/test_sanpham.js
const { setupTestEnvironment, createAssert } = require('./_helpers');
const { SanPham } = require('../src/models');
const SanPhamService = require('../src/services/SanPhamService');

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 KIỂM THỬ MODULE: SẢN PHẨM');
  console.log('===============================================================\n');

  const { makeRequest, loginAs, closeAll } = await setupTestEnvironment();
  const { assert, summary } = createAssert();

  // Dữ liệu test tạm thời — sẽ được cleanup sau
  const TEST_PREFIX = 'AUTO_TEST_' + Date.now();
  const createdIds = [];

  try {
    // ==================== TEST 1: Service Logic ====================
    console.log('--- TEST 1: Service Logic ---');

    const sp = await SanPhamService.taoMoi({
      maSP: TEST_PREFIX,
      tenMay: 'iPhone Test Auto',
      hang: 'Apple',
      giaBan: 30_000_000,
      giaNhap: 25_000_000
    });
    assert(sp?._id, 'Tạo sản phẩm mới qua Service thành công');
    createdIds.push(sp._id);

    // Test getDanhSach với filter
    const ds = await SanPhamService.getDanhSach({ search: TEST_PREFIX, limit: '5' });
    assert(ds.items.length > 0, 'getDanhSach() filter theo mã tìm thấy kết quả');
    assert(ds.pagination?.total >= 1, 'Pagination trả về total đúng');

    // Test getById
    const found = await SanPhamService.getById(String(sp._id));
    assert(found?.maSP === TEST_PREFIX, 'getById() tìm đúng sản phẩm');

    // Test taoMoi trùng maSP → phải 409
    let duplicateErr = null;
    try { await SanPhamService.taoMoi({ maSP: TEST_PREFIX, tenMay: 'X', hang: 'X', giaBan: 1, giaNhap: 1 }); }
    catch (e) { duplicateErr = e; }
    assert(duplicateErr?.statusCode === 409, 'Tạo trùng mã sản phẩm ném lỗi 409 Conflict');

    // ==================== TEST 2: HTTP API ====================
    console.log('\n--- TEST 2: HTTP API ---');

    const cookieAdmin = await loginAs('admin');

    const resGet = await makeRequest('/api/san-pham', 'GET', null, cookieAdmin);
    assert(resGet.status === 200, 'GET /api/san-pham → 200 OK');
    assert(resGet.body?.success === true, 'Response body có success: true');
    assert(Array.isArray(resGet.body?.data?.items), 'Response có data.items là mảng');

    // ==================== TEST 3: RBAC — 6 VAI TRÒ ====================
    console.log('\n--- TEST 3: RBAC (6 vai trò) ---');

    // Bảng vai trò và quyền với POST /api/san-pham
    const rbacCases = [
      { user: 'admin',    expectedStatus: 201, desc: 'Quản lý tạo sản phẩm → 201' },
      { user: 'thukho',  expectedStatus: 201, desc: 'Thủ kho tạo sản phẩm → 201' },
      { user: 'banhang', expectedStatus: 403, desc: 'NV bán hàng tạo sản phẩm → 403 Forbidden' },
      { user: 'thungan', expectedStatus: 403, desc: 'Thu ngân tạo sản phẩm → 403 Forbidden' },
      { user: 'ketoan',  expectedStatus: 403, desc: 'Kế toán tạo sản phẩm → 403 Forbidden' },
      { user: 'kythuat', expectedStatus: 403, desc: 'Kỹ thuật tạo sản phẩm → 403 Forbidden' },
    ];

    for (const tc of rbacCases) {
      const cookie = await loginAs(tc.user);
      const res = await makeRequest('/api/san-pham', 'POST', {
        maSP: TEST_PREFIX + '_' + tc.user + '_' + Date.now(),
        tenMay: 'RBAC Test', hang: 'Test', giaBan: 1000, giaNhap: 900
      }, cookie);
      if (res.status === 201) createdIds.push(res.body?.data?._id);
      assert(res.status === tc.expectedStatus, tc.desc);
    }

    // ==================== TEST 4: Unauthenticated ====================
    console.log('\n--- TEST 4: Unauthenticated ---');
    const resNoAuth = await makeRequest('/api/san-pham', 'GET');
    assert(resNoAuth.status === 401, 'Không có session → 401 Unauthorized');

  } catch (error) {
    console.error('\n❌ Lỗi ngoại lệ trong quá trình test:', error.message);
    process.exit(1);
  } finally {
    // ==================== CLEANUP ====================
    console.log('\n--- CLEANUP: Xóa dữ liệu test ---');
    try {
      const validIds = createdIds.filter(Boolean);
      if (validIds.length > 0) {
        const result = await SanPham.deleteMany({ _id: { $in: validIds } });
        console.log(`  🧹 Đã xóa ${result.deletedCount} bản ghi test.`);
      }
    } catch (cleanupErr) {
      console.warn('  ⚠️ Cleanup thất bại:', cleanupErr.message);
    }

    await closeAll();
    summary();
  }
}

runTests();
```

---

## 4. Mẫu Test Transaction Rollback

```javascript
// Kiểm tra Transaction rollback khi bán máy IMEI đã bán
console.log('\n--- TEST: Transaction Rollback ---');

const { MayImei, HoaDon } = require('../src/models');

// Setup: tạo máy test với trạng thái 'Da ban' (đã bán)
const mayDaBan = await MayImei.create({ imei: 'IMEI_ROLLBACK_TEST', trangThai: 'Da ban', ... });

let rollbackErr = null;
try {
  await HoaDonService.thanhToanHoaDon({
    dsMayImei: [mayDaBan._id],
    // ...payload khác
  });
} catch (e) {
  rollbackErr = e;
}

assert(rollbackErr?.statusCode === 409, 'Bán máy đã bán → Transaction rollback và ném 409');

// Kiểm tra HoaDon KHÔNG được tạo (rollback thành công)
const countHD = await HoaDon.countDocuments({ 'dsMayImei': mayDaBan._id }).lean();
assert(countHD === 0, 'Sau rollback, HoaDon không được tạo vào DB');

// Cleanup
await MayImei.deleteOne({ _id: mayDaBan._id });
```

---

## 5. Đăng Ký Vào Master Runner (`tests/run_all_tests.js`)

Mỗi khi tạo file test mới, thêm vào mảng `TEST_SUITES`:

```javascript
const TEST_SUITES = [
  { name: 'Auth & Session (Core)',                    file: 'test_auth.js' },
  { name: 'Sản Phẩm & Danh Mục (Thủ Kho - Tuần 1)',  file: 'test_sanpham.js' },
  { name: 'Máy IMEI & Nhập Kho (Thủ Kho - Tuần 2)',  file: 'test_mayimei.js' },
  { name: 'Bán Hàng POS & IMEI Lock (Tuần 3)',        file: 'test_hoadon.js' },
  { name: 'Đặt Trước & Cấn Trừ Cọc (Tuần 4)',        file: 'test_dattruoc.js' },
  { name: 'Đổi Trả & Bảo Hành (Kỹ Thuật - Tuần 5)', file: 'test_doitra.js' },
  { name: 'Công Nợ & Sổ Quỹ (Kế Toán - Tuần 6)',     file: 'test_congno.js' },
  { name: 'Trả Góp (Tuần 7)',                         file: 'test_tragop.js' },
  // ← Thêm suite mới vào đây
];
```

Chạy: **`npm test`** để kiểm thử toàn bộ hệ thống.

---

## 6. Checklist Viết Test — Bắt Buộc Trước Khi Submit PR

- [ ] File test có **prefix cleanup** (`TEST_PREFIX = 'AUTO_TEST_' + Date.now()`)?
- [ ] Có khối **`finally { cleanup + closeAll() }`** để xóa dữ liệu test?
- [ ] Đã test **Service Logic** (tạo/đọc/cập nhật/lỗi validate)?
- [ ] Đã test **HTTP API** (status code, response shape)?
- [ ] Đã test **RBAC cho cả 6 vai trò** với endpoint nhạy cảm?
- [ ] Đã test **401 Unauthenticated** cho endpoint cần đăng nhập?
- [ ] Đã test **Transaction rollback** cho nghiệp vụ multi-collection?
- [ ] Đã đăng ký vào `tests/run_all_tests.js`?
- [ ] `npm test` chạy qua **100% PASS**?
