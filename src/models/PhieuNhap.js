const mongoose = require('mongoose');

const phieuNhapSchema = new mongoose.Schema({
  maPN: { type: String, unique: true, index: true },
  nhaCungCap: { type: mongoose.Schema.Types.ObjectId, ref: 'NhaCungCap', required: true },
  nhanVien: { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', required: true },
  donDatHangNCC: { type: mongoose.Schema.Types.ObjectId, ref: 'DonDatHangNCC' }, // Bổ sung khóa ngoại tới Đơn Đặt Hàng NCC
  ngayNhap: { type: Date, default: Date.now },
  tongTien: { type: Number, default: 0, min: 0 },
  ghiChu: { type: String, default: '' }
}, {
  timestamps: true
});

phieuNhapSchema.pre('save', function(next) {
  if (!this.maPN) {
    this.maPN = 'PN' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('PhieuNhap', phieuNhapSchema, 'PHIEUNHAP');
