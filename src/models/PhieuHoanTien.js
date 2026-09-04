const mongoose = require('mongoose');

const phieuHoanTienSchema = new mongoose.Schema({
  maPHT: { type: String, unique: true, index: true },
  phieuDoiTra: { type: mongoose.Schema.Types.ObjectId, ref: 'PhieuDoiTra', required: true },
  khachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang' },
  nhanVien: { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien' },
  soTien: { type: Number, required: true, min: 0 },
  hinhThuc: {
    type: String,
    enum: ['Tien mat', 'Chuyen khoan', 'Quet the', 'Vi dien tu'],
    default: 'Tien mat'
  },
  ngayHoanTien: { type: Date, default: Date.now },
  ghiChu: { type: String, default: '' }
}, {
  timestamps: true
});

// Auto sinh mã phiếu hoàn tiền
phieuHoanTienSchema.pre('save', function(next) {
  if (!this.maPHT) {
    this.maPHT = 'PHT' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('PhieuHoanTien', phieuHoanTienSchema, 'PHIEUHOANTIEN');
