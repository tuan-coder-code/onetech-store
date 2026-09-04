const mongoose = require('mongoose');

const khachHangSchema = new mongoose.Schema({
  hoTen: { type: String, required: true, trim: true },
  sdt: { type: String, required: true, trim: true },
  diaChi: { type: String, trim: true },
  email: { type: String, trim: true },
  tongChiTieu: { type: Number, default: 0, min: 0 },
  hangThanhVien: { type: String, enum: ['Đồng', 'Bạc', 'Vàng', 'Kim Cương'], default: 'Đồng' },
  status: { type: Boolean, default: true } // Trạng thái hoạt động (Bit: 1 - Hoạt động, 0 - Đã xóa/Khóa)
}, {
  timestamps: true
});

module.exports = mongoose.model('KhachHang', khachHangSchema, 'KHACHHANG');
