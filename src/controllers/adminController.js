const BaseController = require('./BaseController');
const AdminService = require('../services/AdminService');

/**
 * AdminController - Quản trị hệ thống (Admin)
 */
class AdminController extends BaseController {
  constructor() {
    super();
    this.getOverview = this.getOverview.bind(this);
    this.getAccounts = this.getAccounts.bind(this);
    this.toggleStatus = this.toggleStatus.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.backup = this.backup.bind(this);
    this.restore = this.restore.bind(this);
  }

  // GET /api/admin/overview
  async getOverview(req, res) {
    try {
      const result = await AdminService.getSystemOverview();
      return this.sendSuccess(res, result, 'Lấy tổng quan hệ thống thành công');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi lấy tổng quan hệ thống');
    }
  }

  // GET /api/admin/accounts
  async getAccounts(req, res) {
    try {
      const result = await AdminService.getAllAccounts(req.query);
      return this.sendSuccess(res, result, 'Lấy danh sách tài khoản thành công');
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi lấy danh sách tài khoản');
    }
  }

  // PUT /api/admin/accounts/:id/toggle-status
  async toggleStatus(req, res) {
    try {
      const currentUserId = req.session && req.session.user ? req.session.user._id : null;
      const result = await AdminService.toggleAccountStatus(req.params.id, currentUserId);
      return this.sendSuccess(res, result, `Tài khoản "${result.hoTen}" đã được ${result.trangThai === 'Hoạt động' ? 'mở khóa' : 'khóa'} thành công`);
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi thay đổi trạng thái tài khoản');
    }
  }

  // PUT /api/admin/accounts/:id/reset-password
  async resetPassword(req, res) {
    try {
      const newPassword = req.body.matKhauMoi || '123456';
      const result = await AdminService.resetPassword(req.params.id, newPassword);
      return this.sendSuccess(res, result, `Đã reset mật khẩu tài khoản "${result.tenDangNhap}" thành công`);
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi reset mật khẩu');
    }
  }

  // POST /api/admin/backup
  async backup(req, res) {
    try {
      const result = await AdminService.backupDatabase();
      return this.sendSuccess(res, result, result.message);
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi backup dữ liệu');
    }
  }

  // POST /api/admin/restore
  async restore(req, res) {
    try {
      const result = await AdminService.restoreDatabase(req.body);
      return this.sendSuccess(res, result, result.message);
    } catch (error) {
      return this.handleError(res, error, 'Lỗi khi phục hồi dữ liệu');
    }
  }
}

module.exports = new AdminController();
