const mongoose = require('mongoose');

const khuyenMaiSchema = new mongoose.Schema({
  maKM: { type: String, unique: true, index: true, trim: true },
  tenKM: { type: String, required: true, trim: true },
  loaiGiam: {
    type: String,
    required: true,
    enum: ['Phan tram', 'Truc tiep'],
    default: 'Phan tram'
  },
  giaTriGiam: { type: Number, required: true, min: 0 }, // % hoặc số tiền
  giaTriToiDa: { type: Number, default: 0, min: 0 }, // Giới hạn giảm tối đa (cho loại %)
  ngayBatDau: { type: Date, required: true },
  ngayKetThuc: { type: Date, required: true },
  soLuotToiDa: { type: Number, default: 0, min: 0 }, // 0 = không giới hạn
  soLuotDaDung: { type: Number, default: 0, min: 0 },
  trangThai: {
    type: String,
    required: true,
    enum: ['Hoat dong', 'Het han', 'Tam ngung'],
    default: 'Hoat dong'
  },
  ghiChu: { type: String, default: '' }
}, {
  timestamps: true
});

// Auto sinh mã KM nếu chưa có
khuyenMaiSchema.pre('save', function(next) {
  if (!this.maKM) {
    this.maKM = 'KM' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('KhuyenMai', khuyenMaiSchema, 'KHUYENMAI');
