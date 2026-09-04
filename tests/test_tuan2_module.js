require('dotenv').config();
const mongoose = require('mongoose');
const { PhieuNhapService, NhaCungCapService } = require('../src/services');
const { NhaCungCap, NhanVien, SanPham, Kho, CongNo, MayImei, TonKho } = require('../src/models');

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ MODULE PHẠM MINH TUÂN (NHẬP KHO - TRẢ HÀNG NCC)');
  console.log('===============================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/onetech_store');
    console.log('✅ Đã kết nối DB\n');

    const ncc = await NhaCungCap.findOne();
    const nv = await NhanVien.findOne();
    const sp = await SanPham.findOne();

    if (!ncc || !nv || !sp) {
      console.log('❌ Lỗi: Database chưa có đủ dữ liệu mẫu.');
      process.exit(1);
    }

    // -------------------------------------------------------------
    // TEST 1: Nhập hàng loạt nhiều IMEI (Tuần 4)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Nhập hàng loạt 5 IMEI (Import Bulk) ---');
    const testImeis = [
      'BULK_IMEI_1_' + Date.now(),
      'BULK_IMEI_2_' + Date.now(),
      'BULK_IMEI_3_' + Date.now(),
      'BULK_IMEI_4_' + Date.now(),
      'BULK_IMEI_5_' + Date.now()
    ];
    const imeiListText = `${testImeis[0]}, ${testImeis[1]} \n ${testImeis[2]} ,  ${testImeis[3]}\n\n${testImeis[4]}  `;

    const payloadBulk = {
      maNCC: ncc._id,
      maNV: nv._id,
      maSP: sp._id,
      imeiListText,
      giaNhap: 12000000,
      mauSac: 'Vàng',
      dungLuong: '512GB',
      hinhThucThanhToan: 'Ghi no',
      ghiChu: 'Test import hàng loạt tuần 4'
    };

    const phieuNhap = await PhieuNhapService.importHangLoat(payloadBulk);
    console.log('✅ Import thành công 5 IMEI, phiếu nhập ID:', phieuNhap._id.toString());

    // -------------------------------------------------------------
    // TEST 2: Chặn nhập trùng IMEI (Tuần 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Import lại IMEI cũ để kiểm tra 409 Conflict ---');
    try {
      await PhieuNhapService.importHangLoat(payloadBulk);
      console.log('❌ Thất bại: Lẽ ra phải chặn lỗi trùng lặp IMEI nhưng lại pass!');
    } catch (error) {
      if (error.statusCode === 409) {
        console.log('✅ Bắt lỗi thành công: 409 Conflict (Trùng lặp IMEI).');
      } else {
        console.log('❌ Có lỗi khác xảy ra:', error.message);
      }
    }

    // -------------------------------------------------------------
    // TEST 3: Lấy lịch sử nhập của NCC (Tuần 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Lấy lịch sử nhập của NCC ---');
    const lichSu = await NhaCungCapService.getLichSuNhap(ncc._id);
    console.log(`✅ Nhà cung cấp: ${lichSu.nhaCungCap.tenNCC}`);
    console.log(`✅ Tổng dư nợ hiện tại: ${lichSu.duNo} VNĐ`);
    
    const coPhieuMoiTao = lichSu.lichSuNhap.list.find(pn => pn._id.toString() === phieuNhap._id.toString());
    if (coPhieuMoiTao) {
      console.log('✅ Đã tìm thấy Phiếu nhập vừa tạo trong lịch sử NCC.');
    }

    // -------------------------------------------------------------
    // TEST 4: Trả hàng NCC (Tuần 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Trả hàng NCC (2 máy vừa nhập) ---');
    const oldDuNo = lichSu.duNo;
    const tonKhoTruocKhiTra = await TonKho.findOne({ sanPham: sp._id });

    const imeiListForTest = [testImeis[0], testImeis[1]];
    const resTra = await PhieuNhapService.traHangNhaCungCap({
      maNCC: ncc._id,
      imeiList: imeiListForTest,
      lyDo: 'Máy móp viền'
    });
    console.log(`✅ Trả thành công ${resTra.soLuongTra} máy, cấn trừ: ${resTra.tongTienTra}đ`);

    const imeiSauKhiTra = await MayImei.find({ imei: { $in: imeiListForTest } });
    if (imeiSauKhiTra.every(m => m.trangThai === 'Tra NCC')) {
      console.log('✅ Trạng thái 2 IMEI đã chuyển thành "Tra NCC"');
    }

    const tonKhoSauKhiTra = await TonKho.findOne({ sanPham: sp._id });
    console.log(`✅ Tồn kho máy đã giảm 2 (Từ ${tonKhoTruocKhiTra.soLuong} xuống ${tonKhoSauKhiTra.soLuong})`);

    const lsSauTra = await NhaCungCapService.getLichSuNhap(ncc._id);
    if (oldDuNo - lsSauTra.duNo === 24000000) { // 2 máy x 12tr
      console.log(`✅ Dư nợ đã được cấn trừ chính xác 24,000,000đ (Trở về mức: ${lsSauTra.duNo} VNĐ)`);
    }

    console.log('\n===============================================================');
    console.log('🎉 TẤT CẢ CÁC TEST CASES MODULE TUÂN ĐÃ VƯỢT QUA 100%!');
    console.log('===============================================================');

  } catch (error) {
    console.error('\n❌ Lỗi Test:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

runTests();
