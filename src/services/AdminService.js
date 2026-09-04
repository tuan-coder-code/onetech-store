const BaseService = require('./BaseService');
const { NhanVien, HoaDon, MayImei, KhachHang, NhaCungCap, SanPham, PhieuBaoHanh } = require('../models');

/**
 * AdminService - Phân hệ Quản trị hệ thống (Admin)
 * Cung cấp chức năng quản lý tài khoản nâng cao và thống kê hệ thống
 */
class AdminService extends BaseService {
  constructor() {
    super(NhanVien);
  }

  /**
   * Lấy tổng quan thống kê hệ thống dành cho Admin
   */
  async getSystemOverview() {
    const [
      totalNhanVien,
      totalKhachHang,
      totalNhaCungCap,
      totalSanPham,
      totalMayImei,
      totalHoaDon,
      totalBaoHanh,
      nhanVienByRole,
      recentAccounts
    ] = await Promise.all([
      NhanVien.countDocuments(),
      KhachHang.countDocuments(),
      NhaCungCap.countDocuments(),
      SanPham.countDocuments(),
      MayImei.countDocuments(),
      HoaDon.countDocuments(),
      PhieuBaoHanh.countDocuments(),
      NhanVien.aggregate([
        { $group: { _id: '$vaiTro', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      NhanVien.find().select('-matKhau').sort({ createdAt: -1 }).limit(10).lean()
    ]);

    return {
      thongKe: {
        totalNhanVien,
        totalKhachHang,
        totalNhaCungCap,
        totalSanPham,
        totalMayImei,
        totalHoaDon,
        totalBaoHanh
      },
      nhanVienByRole,
      recentAccounts
    };
  }

  /**
   * Lấy danh sách tất cả tài khoản nhân viên (Admin chuyên trách)
   */
  async getAllAccounts(query = {}) {
    const { search, vaiTro, trangThai } = query;
    const filter = {};

    if (search && search.trim()) {
      filter.$or = [
        { hoTen: { $regex: search.trim(), $options: 'i' } },
        { tenDangNhap: { $regex: search.trim(), $options: 'i' } },
        { sdt: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    if (vaiTro) filter.vaiTro = vaiTro;
    if (trangThai) filter.trangThai = trangThai;

    const { page, limit, skip } = this.getPaginationOptions(query);

    const [accounts, total] = await Promise.all([
      NhanVien.find(filter).select('-matKhau').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NhanVien.countDocuments(filter)
    ]);

    return {
      accounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Khóa / Mở khóa tài khoản nhân viên
   */
  async toggleAccountStatus(id, currentUserId) {
    const nv = await NhanVien.findById(id);
    if (!nv) {
      throw this.createError('Không tìm thấy tài khoản nhân viên', 404);
    }

    if (id.toString() === currentUserId.toString()) {
      throw this.createError('Không thể tự khóa/mở khóa tài khoản của chính mình', 400);
    }

    nv.trangThai = nv.trangThai === 'Hoạt động' ? 'Khóa' : 'Hoạt động';
    await nv.save();

    const nvObj = nv.toObject();
    delete nvObj.matKhau;
    return nvObj;
  }

  /**
   * Reset mật khẩu nhân viên về mặc định
   */
  async resetPassword(id, newPassword = '123456') {
    const nv = await NhanVien.findById(id);
    if (!nv) {
      throw this.createError('Không tìm thấy tài khoản nhân viên', 404);
    }

    nv.matKhau = newPassword;
    await nv.save(); // Pre-save hook sẽ tự hash

    return { success: true, hoTen: nv.hoTen, tenDangNhap: nv.tenDangNhap };
  }

  /**
   * Backup dữ liệu hệ thống (giả lập) — Trả về metadata snapshot
   */
  async backupDatabase() {
    const [nv, kh, ncc, sp, may, hd, bh] = await Promise.all([
      NhanVien.countDocuments(),
      KhachHang.countDocuments(),
      NhaCungCap.countDocuments(),
      SanPham.countDocuments(),
      MayImei.countDocuments(),
      HoaDon.countDocuments(),
      PhieuBaoHanh.countDocuments()
    ]);

    return {
      success: true,
      backupTime: new Date(),
      snapshot: {
        nhanVien: nv,
        khachHang: kh,
        nhaCungCap: ncc,
        sanPham: sp,
        mayImei: may,
        hoaDon: hd,
        phieuBaoHanh: bh
      },
      message: `Backup thành công! Đã snapshot ${nv + kh + ncc + sp + may + hd + bh} bản ghi.`
    };
  }

  /**
   * Phục hồi dữ liệu hệ thống từ file backup (giả lập)
   */
  async restoreDatabase(fileData) {
    // Trong thực tế, bạn sẽ parse file JSON/BSON và insert lại vào DB
    // Ở đây chúng ta giả lập thành công sau một khoảng thời gian
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          restoreTime: new Date(),
          message: 'Phục hồi dữ liệu thành công từ file bản sao!'
        });
      }, 1500);
    });
  }
}

module.exports = new AdminService();
