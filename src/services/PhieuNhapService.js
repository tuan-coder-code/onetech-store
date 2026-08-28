const BaseService = require('./BaseService');
const { PhieuNhap, CT_PhieuNhap, MayImei, PhuKien, CongNo } = require('../models');
const TonKhoService = require('./TonKhoService');
const ThanhToanService = require('./ThanhToanService');

class PhieuNhapService extends BaseService {
  constructor() {
    super(PhieuNhap);
  }

  /**
   * Tạo phiếu nhập kho và xử lý nghiệp vụ liên quan
   * @param {Object} payload 
   */
  async taoPhieuNhap(payload = {}) {
    const { 
      maNCC, 
      maNV, 
      danhSachMay = [], 
      danhSachPhuKien = [], 
      hinhThucThanhToan = 'Tien mat', 
      ghiChu = '' 
    } = payload;

    if (!maNCC || !maNV) {
      throw this.createError('Thiếu thông tin Nhà Cung Cấp hoặc Nhân Viên lập phiếu', 400);
    }
    if (danhSachMay.length === 0 && danhSachPhuKien.length === 0) {
      throw this.createError('Phiếu nhập phải có ít nhất 1 máy hoặc 1 phụ kiện', 400);
    }

    // 1. Kiểm tra trùng lặp IMEI
    const listImeis = danhSachMay.map(item => item.imei.trim());
    if (listImeis.length > 0) {
      const existingImeis = await MayImei.find({ imei: { $in: listImeis } }).select('imei');
      if (existingImeis.length > 0) {
        const duplicateList = existingImeis.map(m => m.imei);
        throw this.createError('Phát hiện IMEI đã tồn tại trong hệ thống', 409, { existingImeis: duplicateList });
      }
      
      // Kiểm tra trùng IMEI ngay trong payload
      const uniqueImeis = new Set(listImeis);
      if (uniqueImeis.size !== listImeis.length) {
        throw this.createError('Phát hiện IMEI trùng lặp trong danh sách nhập', 400);
      }
    }

    // 2. Tính tổng tiền phiếu nhập
    let tongTien = 0;
    danhSachMay.forEach(item => { tongTien += Number(item.giaNhap) || 0; });
    danhSachPhuKien.forEach(item => { tongTien += (Number(item.giaNhap) * Number(item.soLuong)) || 0; });

    // 3. Tạo phiếu nhập
    const phieuNhap = await PhieuNhap.create({
      nhaCungCap: maNCC,
      nhanVien: maNV,
      tongTien,
      ghiChu
    });

    // 4. Xử lý danhSachMay (Tạo máy IMEI & CT_PhieuNhap)
    if (danhSachMay.length > 0) {
      const newImeis = danhSachMay.map(item => ({
        imei: item.imei.trim(),
        sanPham: item.maSP,
        giaNhap: Number(item.giaNhap),
        mauSac: item.mauSac || '',
        dungLuong: item.dungLuong || '',
        trangThai: 'Con hang'
      }));
      
      // Bulk insert MayImei
      await MayImei.insertMany(newImeis);

      const newCTPhieuNhaps = danhSachMay.map(item => ({
        phieuNhap: phieuNhap._id,
        imei: item.imei.trim(),
        sanPham: item.maSP,
        donGiaNhap: Number(item.giaNhap)
      }));

      // Bulk insert CT_PhieuNhap
      await CT_PhieuNhap.insertMany(newCTPhieuNhaps);

      // Cập nhật tồn kho qua TonKhoService (An's task)
      for (const item of danhSachMay) {
        // null default kho for now
        await TonKhoService.capNhatTonKho(item.maSP, null, 1); 
      }
    }

    // 5. Xử lý danhSachPhuKien
    if (danhSachPhuKien.length > 0) {
      for (const item of danhSachPhuKien) {
        const pk = await PhuKien.findById(item.maPK);
        if (!pk) {
          throw this.createError(`Không tìm thấy phụ kiện với mã ${item.maPK}`, 404);
        }
        pk.soLuongTon += Number(item.soLuong);
        await pk.save();
      }
    }

    // 6. Xử lý thanh toán
    if (hinhThucThanhToan === 'Ghi no') {
      // Tìm công nợ NCC hiện tại hoặc tạo mới
      let congNo = await CongNo.findOne({ loaiDoiTuong: 'NhaCungCap', nhaCungCap: maNCC, trangThai: { $in: ['Con no', 'Qua han'] } });
      if (!congNo) {
        congNo = new CongNo({
          loaiDoiTuong: 'NhaCungCap',
          nhaCungCap: maNCC,
          phieuNhap: phieuNhap._id,
          soTienNo: tongTien,
          soTienDaTra: 0,
          trangThai: 'Con no'
        });
      } else {
        congNo.soTienNo += tongTien;
        congNo.trangThai = 'Con no'; // Nếu trước đó đã trả hết thì đổi lại thành còn nợ
      }
      await congNo.save();
    } else {
      // Trả ngay (Tien mat, Chuyen khoan, Quet the) -> Gọi ThanhToanService tạo Phiếu Chi
      await ThanhToanService.taoPhieuChi({
        phieuNhap: phieuNhap._id,
        maDT: maNCC, // NCC
        soTien: tongTien,
        hinhThuc: hinhThucThanhToan,
        lyDo: 'Thanh toán tiền nhập hàng phiếu ' + phieuNhap.maPN
      });
    }

    return phieuNhap;
  }

  /**
   * Lấy danh sách phiếu nhập
   */
  async getDanhSachPhieuNhap(query = {}) {
    const filter = {};
    if (query.nhaCungCap) filter.nhaCungCap = query.nhaCungCap;
    if (query.nhanVien) filter.nhanVien = query.nhanVien;

    const { page, limit, skip } = this.getPaginationOptions(query);
    const [list, total] = await Promise.all([
      PhieuNhap.find(filter)
        .populate('nhaCungCap', 'tenNCC dienThoai')
        .populate('nhanVien', 'hoTen username')
        .sort({ ngayNhap: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PhieuNhap.countDocuments(filter)
    ]);

    return { list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Lấy chi tiết phiếu nhập
   */
  async getChiTietPhieuNhap(id) {
    const phieuNhap = await PhieuNhap.findById(id)
      .populate('nhaCungCap', 'tenNCC dienThoai diaChi')
      .populate('nhanVien', 'hoTen username');
      
    if (!phieuNhap) {
      throw this.createError('Không tìm thấy phiếu nhập', 404);
    }

    const chiTiet = await CT_PhieuNhap.find({ phieuNhap: id }).populate('sanPham', 'tenMay hang');

    return { phieuNhap, chiTiet };
  }

  /**
   * Nhập hàng loạt nhiều IMEI từ chuỗi văn bản
   */
  async importHangLoat(payload) {
    const { 
      maNCC, 
      maNV, 
      maSP, 
      imeiListText = '', 
      giaNhap,
      mauSac = '',
      dungLuong = '',
      hinhThucThanhToan = 'Tien mat', 
      ghiChu = ''
    } = payload;

    if (!imeiListText || typeof imeiListText !== 'string') {
      throw this.createError('Vui lòng cung cấp danh sách IMEI', 400);
    }

    // Parse IMEI list
    const parsedImeis = imeiListText
      .split(/[,\s\n]+/)
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (parsedImeis.length === 0) {
      throw this.createError('Không tìm thấy IMEI nào hợp lệ trong danh sách', 400);
    }

    // Map to danhSachMay
    const danhSachMay = parsedImeis.map(imei => ({
      maSP,
      imei,
      giaNhap,
      mauSac,
      dungLuong
    }));

    // Re-use taoPhieuNhap
    const phieuNhapPayload = {
      maNCC,
      maNV,
      danhSachMay,
      danhSachPhuKien: [], // API này chuyên trị IMEI
      hinhThucThanhToan,
      ghiChu: ghiChu || `Nhập kho hàng loạt ${parsedImeis.length} máy`
    };

    return await this.taoPhieuNhap(phieuNhapPayload);
  }

  /**
   * Trả hàng Nhà cung cấp (Tình huống biên)
   * Yêu cầu: danh sách IMEI phải đang ở trạng thái 'Con hang' hoặc 'Loi'
   */
  async traHangNhaCungCap(payload) {
    const { imeiList = [], maNCC, lyDo = '' } = payload;
    if (!maNCC) throw this.createError('Thiếu mã Nhà cung cấp', 400);
    if (!imeiList || imeiList.length === 0) throw this.createError('Danh sách IMEI trả hàng không được trống', 400);

    const imeis = await MayImei.find({ imei: { $in: imeiList } });
    if (imeis.length !== imeiList.length) {
      throw this.createError('Một số IMEI không tồn tại trong hệ thống', 404);
    }

    // Kiểm tra trạng thái
    for (const m of imeis) {
      if (m.trangThai !== 'Con hang' && m.trangThai !== 'Loi') {
        throw this.createError(`IMEI ${m.imei} đang ở trạng thái ${m.trangThai}, không thể trả hàng`, 400);
      }
    }

    // Kiểm tra NCC và lấy giá nhập
    const ctPhieuNhaps = await CT_PhieuNhap.find({ imei: { $in: imeiList } }).populate('phieuNhap');
    if (ctPhieuNhaps.length !== imeiList.length) {
      throw this.createError('Không tìm thấy thông tin nhập kho gốc của một số IMEI', 404);
    }

    let tongTienTra = 0;
    for (const ct of ctPhieuNhaps) {
      if (ct.phieuNhap.nhaCungCap.toString() !== maNCC.toString()) {
        throw this.createError(`IMEI ${ct.imei} không thuộc Nhà cung cấp này`, 400);
      }
      tongTienTra += ct.donGiaNhap;
    }

    // Đổi trạng thái máy
    await MayImei.updateMany(
      { imei: { $in: imeiList } },
      { $set: { trangThai: 'Tra NCC' } }
    );

    // Trừ tồn kho
    for (const m of imeis) {
      await TonKhoService.capNhatTonKho(m.sanPham, null, -1);
    }

    // Xử lý tài chính
    let congNo = await CongNo.findOne({ loaiDoiTuong: 'NhaCungCap', nhaCungCap: maNCC });
    if (congNo && congNo.soTienNo > congNo.soTienDaTra) {
      let duNo = congNo.soTienNo - congNo.soTienDaTra;
      if (tongTienTra <= duNo) {
        // Trừ trực tiếp vào nợ
        congNo.soTienDaTra += tongTienTra;
        if (congNo.soTienNo === congNo.soTienDaTra) {
          congNo.trangThai = 'Da tra het';
        }
        await congNo.save();
      } else {
        // Trừ hết nợ, phần dư ra thì lập Phiếu thu nhận lại tiền từ NCC
        let tienThua = tongTienTra - duNo;
        congNo.soTienDaTra = congNo.soTienNo;
        congNo.trangThai = 'Da tra het';
        await congNo.save();

        await ThanhToanService.taoPhieuThu({
          congNo: congNo._id,
          soTien: tienThua,
          hinhThuc: 'Tien mat',
          ghiChu: lyDo || `Nhận hoàn tiền trả NCC phần dư nợ`
        });
      }
    } else {
      // NCC không nợ, trả tiền thẳng cho mình
      await ThanhToanService.taoPhieuThu({
        soTien: tongTienTra,
        hinhThuc: 'Tien mat',
        ghiChu: lyDo || `Nhận hoàn tiền trả hàng NCC`
      });
    }

    return { success: true, tongTienTra, soLuongTra: imeiList.length };
  }
}

module.exports = new PhieuNhapService();
