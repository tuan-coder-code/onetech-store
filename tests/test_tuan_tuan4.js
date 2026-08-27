const mongoose = require('mongoose');
require('dotenv').config();
const { PhieuNhapService, NhaCungCapService } = require('../src/services');
const { NhaCungCap, NhanVien, SanPham, Kho } = require('../src/models');

async function testTuanTuan4() {
  try {
    // 1. Kết nối DB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/onetech_store');
    console.log('✅ Đã kết nối DB');

    // 2. Lấy dữ liệu mock từ Seed
    const ncc = await NhaCungCap.findOne();
    const nv = await NhanVien.findOne();
    const sp = await SanPham.findOne();

    if (!ncc || !nv || !sp) {
      console.log('❌ Lỗi: Database chưa được seed. Hãy chạy "npm run seed" trước.');
      process.exit(1);
    }

    const testImeis = [
      'BULK_IMEI_1_' + Date.now(),
      'BULK_IMEI_2_' + Date.now(),
      'BULK_IMEI_3_' + Date.now(),
      'BULK_IMEI_4_' + Date.now(),
      'BULK_IMEI_5_' + Date.now()
    ];
    // Chuỗi giả lập copy paste từ Excel có dấu phẩy, khoảng trắng, xuống dòng
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

    console.log('\n--- 🚀 BẮT ĐẦU TEST CASE 1: Import hàng loạt 5 IMEI ---');
    const phieuNhap = await PhieuNhapService.importHangLoat(payloadBulk);
    console.log('✅ Import thành công, phiếu nhập ID:', phieuNhap._id.toString());

    console.log('\n--- 🚀 BẮT ĐẦU TEST CASE 2: Import lại IMEI cũ để kiểm tra 409 Conflict ---');
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

    console.log('\n--- 🚀 BẮT ĐẦU TEST CASE 3: Lấy lịch sử nhập của NCC ---');
    const lichSu = await NhaCungCapService.getLichSuNhap(ncc._id);
    console.log(`✅ Nhà cung cấp: ${lichSu.nhaCungCap.tenNCC}`);
    console.log(`✅ Tổng dư nợ hiện tại: ${lichSu.duNo} VNĐ`);
    console.log(`✅ Đã lấy được ${lichSu.lichSuNhap.list.length} phiếu nhập trong trang 1.`);
    
    const coPhieuMoiTao = lichSu.lichSuNhap.list.find(pn => pn._id.toString() === phieuNhap._id.toString());
    if (coPhieuMoiTao) {
      console.log('✅ Tồn tại phiếu nhập vừa import bulk trong lịch sử.');
    } else {
      console.log('❌ Không tìm thấy phiếu vừa tạo trong lịch sử.');
    }

  } catch (error) {
    console.error('❌ Lỗi Test:', error);
  } finally {
    mongoose.connection.close();
  }
}

testTuanTuan4();
