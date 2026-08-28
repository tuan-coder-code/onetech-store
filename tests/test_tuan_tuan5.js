const mongoose = require('mongoose');
require('dotenv').config();
const { PhieuNhapService } = require('../src/services');
const { NhaCungCap, MayImei, CongNo, TonKho, SanPham, NhanVien } = require('../src/models');

async function testTuanTuan5() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/onetech_store');
    console.log('✅ Đã kết nối DB');

    // Tìm dữ liệu cần thiết
    const ncc = await NhaCungCap.findOne();
    const nv = await NhanVien.findOne();
    const sp = await SanPham.findOne();

    if (!ncc || !nv || !sp) {
      console.log('❌ Lỗi: Database chưa có đủ dữ liệu mẫu.');
      process.exit(1);
    }

    // 1. Chuẩn bị 2 máy mới tinh để thử nghiệm trả hàng
    const imeiTest1 = 'IMEI_TRAHANG_1_' + Date.now();
    const imeiTest2 = 'IMEI_TRAHANG_2_' + Date.now();
    const imeiListForTest = [imeiTest1, imeiTest2];
    const donGiaNhap = 10000000; // 10 triệu
    const tongTien = donGiaNhap * 2;

    const phieuNhapPayload = {
      maNCC: ncc._id,
      maNV: nv._id,
      danhSachMay: [
        { maSP: sp._id, imei: imeiTest1, giaNhap: donGiaNhap },
        { maSP: sp._id, imei: imeiTest2, giaNhap: donGiaNhap }
      ],
      hinhThucThanhToan: 'Ghi no',
      ghiChu: 'Phiếu nhập mồi để test trả hàng'
    };

    console.log(`\n--- BƯỚC 1: Lập Phiếu nhập mồi (${tongTien}đ) ---`);
    const oldCongNo = await CongNo.findOne({ loaiDoiTuong: 'NhaCungCap', nhaCungCap: ncc._id }) || { soTienNo: 0, soTienDaTra: 0 };
    const oldDuNo = oldCongNo.soTienNo - oldCongNo.soTienDaTra;
    
    await PhieuNhapService.taoPhieuNhap(phieuNhapPayload);
    const afterNhappCongNo = await CongNo.findOne({ loaiDoiTuong: 'NhaCungCap', nhaCungCap: ncc._id });
    const afterNhapDuNo = afterNhappCongNo.soTienNo - afterNhappCongNo.soTienDaTra;
    console.log(`✅ Dư nợ sau khi nhập: ${afterNhapDuNo} (tăng ${afterNhapDuNo - oldDuNo} VNĐ)`);
    
    const tonKhoTruocKhiTra = await TonKho.findOne({ sanPham: sp._id });

    // 2. Kịch bản trả hàng
    console.log(`\n--- BƯỚC 2: Gọi API Trả hàng 2 máy vừa nhập ---`);
    const payloadTraHang = {
      maNCC: ncc._id,
      imeiList: imeiListForTest,
      lyDo: 'Máy móp viền'
    };

    const res = await PhieuNhapService.traHangNhaCungCap(payloadTraHang);
    console.log(`✅ Kết quả: Thành công, trả ${res.soLuongTra} máy, tổng tiền cấn trừ: ${res.tongTienTra}đ`);

    // 3. Kiểm chứng sự thay đổi Database
    console.log(`\n--- BƯỚC 3: Đối soát Database ---`);
    const imeiSauKhiTra = await MayImei.find({ imei: { $in: imeiListForTest } });
    if (imeiSauKhiTra.every(m => m.trangThai === 'Tra NCC')) {
      console.log('✅ Trạng thái IMEI đã được chuyển thành "Tra NCC"');
    } else {
      console.log('❌ Lỗi: Trạng thái IMEI chưa cập nhật đúng');
    }

    const tonKhoSauKhiTra = await TonKho.findOne({ sanPham: sp._id });
    if (tonKhoTruocKhiTra.soLuong - tonKhoSauKhiTra.soLuong === 2) {
      console.log(`✅ Tồn kho máy đã được giảm trừ 2 đơn vị (Từ ${tonKhoTruocKhiTra.soLuong} xuống ${tonKhoSauKhiTra.soLuong})`);
    } else {
      console.log('❌ Lỗi: Tồn kho chưa được trừ đúng');
    }

    const afterTraCongNo = await CongNo.findOne({ loaiDoiTuong: 'NhaCungCap', nhaCungCap: ncc._id });
    const afterTraDuNo = afterTraCongNo.soTienNo - afterTraCongNo.soTienDaTra;
    if (afterNhapDuNo - afterTraDuNo === tongTien) {
      console.log(`✅ Dư nợ đã được cấn trừ chính xác ${tongTien}đ (Trở về mức: ${afterTraDuNo} VNĐ)`);
    } else {
      console.log('❌ Lỗi: Công nợ chưa được xử lý đúng');
    }

  } catch (error) {
    console.error('❌ Lỗi Test:', error);
  } finally {
    mongoose.connection.close();
  }
}

testTuanTuan5();
