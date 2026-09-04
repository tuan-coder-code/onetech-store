const mongoose = require('mongoose');
const BaseService = require('./BaseService');
const {
  PhieuDoiTra,
  PhieuHoanTien,
  HoaDon,
  CT_HoaDon_May,
  MayImei,
  KhachHang
} = require('../models');

/**
 * DoiTraService - Phân hệ Đổi trả hàng & Hoàn tiền
 * Tích hợp entity PhieuHoanTien độc lập theo ERD
 */
class DoiTraService extends BaseService {
  constructor() {
    super(PhieuDoiTra);
  }

  /**
   * Lấy danh sách phiếu đổi trả
   */
  async getPhieuDoiTraList(query = {}) {
    const { trangThai, imei, search } = query;
    const filter = {};

    if (trangThai) filter.trangThai = trangThai;
    if (imei && imei.trim()) {
      filter.imei = { $regex: imei.trim(), $options: 'i' };
    }
    if (search && search.trim()) {
      filter.$or = [
        { maDT: { $regex: search.trim(), $options: 'i' } },
        { imei: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const { page, limit, skip } = this.getPaginationOptions(query);

    const [list, total] = await Promise.all([
      PhieuDoiTra.find(filter)
        .populate({
          path: 'hoaDon',
          populate: [
            { path: 'khachHang', select: 'hoTen sdt' },
            { path: 'nhanVien', select: 'hoTen vaiTro' }
          ]
        })
        .sort({ ngayDoiTra: -1, createdAt: -1 })
        .skip(skip).limit(limit),
      PhieuDoiTra.countDocuments(filter)
    ]);

    return {
      phieuDoiTras: list,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Lấy chi tiết phiếu đổi trả kèm phiếu hoàn tiền (nếu có)
   */
  async getPhieuDoiTraDetail(id) {
    const pdt = await PhieuDoiTra.findById(id)
      .populate({
        path: 'hoaDon',
        populate: [
          { path: 'khachHang', select: 'hoTen sdt diaChi email' },
          { path: 'nhanVien', select: 'hoTen vaiTro' }
        ]
      });

    if (!pdt) {
      throw this.createError('Không tìm thấy phiếu đổi trả', 404);
    }

    // Lấy thông tin máy IMEI
    const mayImei = await MayImei.findOne({ imei: pdt.imei }).populate('sanPham');

    // Lấy phiếu hoàn tiền liên quan (nếu có)
    const phieuHoanTien = await PhieuHoanTien.findOne({ phieuDoiTra: pdt._id })
      .populate('khachHang', 'hoTen sdt')
      .populate('nhanVien', 'hoTen vaiTro');

    return {
      phieuDoiTra: pdt,
      mayImei,
      phieuHoanTien
    };
  }

  /**
   * Tạo phiếu đổi trả
   * @param {Object} payload { imei, lyDo, ghiChu }
   * @param {Object} sessionUser Nhân viên thao tác
   */
  async taoPhieuDoiTra(payload = {}, sessionUser = null) {
    const { imei, lyDo, ghiChu = '' } = payload;

    if (!imei || !imei.trim()) {
      throw this.createError('Vui lòng nhập số IMEI máy cần đổi/trả', 400);
    }
    if (!lyDo || !lyDo.trim()) {
      throw this.createError('Vui lòng nhập lý do đổi/trả', 400);
    }

    const cleanImei = imei.trim();

    // 1. Kiểm tra IMEI tồn tại
    const mayImei = await MayImei.findOne({ imei: cleanImei }).populate('sanPham');
    if (!mayImei) {
      throw this.createError(`Không tìm thấy máy có IMEI "${cleanImei}"`, 404);
    }

    // 2. Tìm hóa đơn bán máy này
    const ctHoaDon = await CT_HoaDon_May.findOne({ imei: cleanImei }).populate('hoaDon');
    if (!ctHoaDon || !ctHoaDon.hoaDon) {
      throw this.createError('Máy chưa được bán, không thể tạo phiếu đổi/trả', 400);
    }

    // 3. Kiểm tra trạng thái máy
    if (mayImei.trangThai === 'Bao hanh') {
      throw this.createError('Máy đang trong trạng thái bảo hành, không thể đổi/trả', 400);
    }

    // 4. Tạo phiếu đổi trả
    const phieuDoiTra = await PhieuDoiTra.create({
      hoaDon: ctHoaDon.hoaDon._id,
      imei: cleanImei,
      lyDo: lyDo.trim(),
      trangThai: 'Cho xu ly',
      ghiChu: ghiChu || ''
    });

    return await this.getPhieuDoiTraDetail(phieuDoiTra._id);
  }

  /**
   * Xử lý trả tiền cho khách — Sinh PhieuHoanTien độc lập (theo ERD)
   * @param {String} pdtId - ID phiếu đổi trả
   * @param {Object} payload { hinhThuc, ghiChu, nhanVien }
   * @param {Object} sessionUser Nhân viên thao tác
   */
  async traTienKhach(pdtId, payload = {}, sessionUser = null) {
    const pdt = await PhieuDoiTra.findById(pdtId).populate('hoaDon');
    if (!pdt) {
      throw this.createError('Không tìm thấy phiếu đổi trả', 404);
    }

    if (pdt.trangThai === 'Da tra tien') {
      throw this.createError('Phiếu đổi trả này đã được hoàn tiền trước đó', 400);
    }
    if (pdt.trangThai === 'Tu choi') {
      throw this.createError('Phiếu đổi trả này đã bị từ chối', 400);
    }

    const { hinhThuc = 'Tien mat', ghiChu = '', nhanVien } = payload;
    const maNV = nhanVien || (sessionUser ? sessionUser._id : null);

    // Lấy giá bán máy từ hóa đơn
    const ctHoaDon = await CT_HoaDon_May.findOne({ imei: pdt.imei, hoaDon: pdt.hoaDon._id });
    const soTienHoan = ctHoaDon ? ctHoaDon.donGiaBan : 0;

    if (soTienHoan <= 0) {
      throw this.createError('Không xác định được giá bán máy để hoàn tiền', 400);
    }

    // 1. Tạo PhieuHoanTien độc lập (Entity ERD mới)
    const phieuHoanTien = await PhieuHoanTien.create({
      phieuDoiTra: pdt._id,
      khachHang: pdt.hoaDon.khachHang || null,
      nhanVien: maNV,
      soTien: soTienHoan,
      hinhThuc,
      ghiChu: ghiChu || `Hoàn tiền đổi trả máy IMEI ${pdt.imei}`
    });

    // 2. Cập nhật trạng thái phiếu đổi trả
    pdt.trangThai = 'Da tra tien';
    pdt.ghiChu = (pdt.ghiChu ? pdt.ghiChu + ' | ' : '') + `Đã hoàn tiền ${soTienHoan.toLocaleString('vi-VN')} đ qua ${hinhThuc}`;
    await pdt.save();

    // 3. Cập nhật trạng thái máy IMEI → 'Con hang' (nhập lại kho)
    await MayImei.findOneAndUpdate(
      { imei: pdt.imei },
      { $set: { trangThai: 'Con hang' } }
    );

    return await this.getPhieuDoiTraDetail(pdt._id);
  }

  /**
   * Xử lý đổi máy mới cho khách
   * @param {String} pdtId - ID phiếu đổi trả
   * @param {Object} payload { imeiMoi, ghiChu }
   */
  async doiMayMoi(pdtId, payload = {}) {
    const pdt = await PhieuDoiTra.findById(pdtId);
    if (!pdt) throw this.createError('Không tìm thấy phiếu đổi trả', 404);

    if (pdt.trangThai === 'Da doi may' || pdt.trangThai === 'Da tra tien') {
      throw this.createError(`Phiếu đổi trả này đã được xử lý (${pdt.trangThai})`, 400);
    }

    const { imeiMoi, ghiChu = '' } = payload;
    if (!imeiMoi || !imeiMoi.trim()) {
      throw this.createError('Vui lòng nhập số IMEI máy mới để đổi cho khách', 400);
    }

    // Kiểm tra IMEI mới tồn tại và còn hàng
    const mayMoi = await MayImei.findOne({ imei: imeiMoi.trim() });
    if (!mayMoi) throw this.createError(`IMEI mới "${imeiMoi}" không tồn tại`, 404);
    if (mayMoi.trangThai !== 'Con hang') {
      throw this.createError(`IMEI mới "${imeiMoi}" không khả dụng (Trạng thái: ${mayMoi.trangThai})`, 409);
    }

    // 1. Máy cũ → 'Con hang' (nhập lại kho)
    await MayImei.findOneAndUpdate(
      { imei: pdt.imei },
      { $set: { trangThai: 'Con hang' } }
    );

    // 2. Máy mới → 'Da ban'
    await MayImei.findOneAndUpdate(
      { imei: imeiMoi.trim(), trangThai: 'Con hang' },
      { $set: { trangThai: 'Da ban' } }
    );

    // 3. Cập nhật phiếu đổi trả
    pdt.trangThai = 'Da doi may';
    pdt.ghiChu = (pdt.ghiChu ? pdt.ghiChu + ' | ' : '') + `Đã đổi sang IMEI mới: ${imeiMoi.trim()}. ${ghiChu}`;
    await pdt.save();

    return await this.getPhieuDoiTraDetail(pdt._id);
  }

  /**
   * Từ chối đổi trả
   */
  async tuChoiDoiTra(pdtId, payload = {}) {
    const pdt = await PhieuDoiTra.findById(pdtId);
    if (!pdt) throw this.createError('Không tìm thấy phiếu đổi trả', 404);

    pdt.trangThai = 'Tu choi';
    pdt.ghiChu = (pdt.ghiChu ? pdt.ghiChu + ' | ' : '') + (payload.lyDo || 'Từ chối đổi trả');
    await pdt.save();

    return await this.getPhieuDoiTraDetail(pdt._id);
  }
}

module.exports = new DoiTraService();
