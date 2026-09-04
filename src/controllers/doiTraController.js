const BaseController = require('./BaseController');
const DoiTraService = require('../services/DoiTraService');

/**
 * DoiTraController - Quản lý Đổi trả hàng & Hoàn tiền
 */
class DoiTraController extends BaseController {
  constructor() {
    super();
    this.index = this.index.bind(this);
    this.getDetail = this.getDetail.bind(this);
    this.create = this.create.bind(this);
    this.traTien = this.traTien.bind(this);
    this.doiMay = this.doiMay.bind(this);
    this.tuChoi = this.tuChoi.bind(this);
  }

  // GET /api/doi-tra
  async index(req, res) {
    try {
      const result = await DoiTraService.getPhieuDoiTraList(req.query);
      return this.sendSuccess(res, result, 'Lấy danh sách phiếu đổi trả thành công');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi lấy danh sách phiếu đổi trả');
    }
  }

  // GET /api/doi-tra/:id
  async getDetail(req, res) {
    try {
      const result = await DoiTraService.getPhieuDoiTraDetail(req.params.id);
      return this.sendSuccess(res, result, 'Lấy chi tiết phiếu đổi trả thành công');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi lấy chi tiết phiếu đổi trả');
    }
  }

  // POST /api/doi-tra
  async create(req, res) {
    try {
      const sessionUser = req.session ? req.session.user : null;
      const result = await DoiTraService.taoPhieuDoiTra(req.body, sessionUser);
      return this.sendSuccess(res, result, `Tạo phiếu đổi trả ${result.phieuDoiTra.maDT} thành công`, 201);
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi tạo phiếu đổi trả');
    }
  }

  // PUT /api/doi-tra/:id/tra-tien
  async traTien(req, res) {
    try {
      const sessionUser = req.session ? req.session.user : null;
      const result = await DoiTraService.traTienKhach(req.params.id, req.body, sessionUser);
      return this.sendSuccess(res, result, 'Hoàn tiền cho khách thành công — Phiếu hoàn tiền đã được lập!');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi xử lý hoàn tiền');
    }
  }

  // PUT /api/doi-tra/:id/doi-may
  async doiMay(req, res) {
    try {
      const result = await DoiTraService.doiMayMoi(req.params.id, req.body);
      return this.sendSuccess(res, result, 'Đổi máy mới cho khách thành công!');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi đổi máy');
    }
  }

  // PUT /api/doi-tra/:id/tu-choi
  async tuChoi(req, res) {
    try {
      const result = await DoiTraService.tuChoiDoiTra(req.params.id, req.body);
      return this.sendSuccess(res, result, 'Đã từ chối phiếu đổi trả');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi từ chối đổi trả');
    }
  }
}

module.exports = new DoiTraController();
