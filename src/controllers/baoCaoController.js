const BaseController = require('./BaseController');
const HoaDon = require('../models/HoaDon');
const Imei = require('../models/Imei');

class BaoCaoController extends BaseController {
  constructor() {
    super();

    this.getBaoCaoDoanhThu = this.getBaoCaoDoanhThu.bind(this);
    this.getTopSanPham = this.getTopSanPham.bind(this);
    this.getHangTonLauNgay = this.getHangTonLauNgay.bind(this);
    this.getBaoCaoTaiChinhTongHop =
      this.getBaoCaoTaiChinhTongHop.bind(this);
  }

  /**
   * ============================================================
   * 1. BÁO CÁO DOANH THU - CHI PHÍ - LỢI NHUẬN
   * ============================================================
   *
   * GET /api/bao-cao/doanh-thu
   *
   * Query:
   * ?ngayBat=YYYY-MM-DD
   * &ngayKet=YYYY-MM-DD
   * &nhom=ngay|tuan|thang
   *
   * Ví dụ:
   * /api/bao-cao/doanh-thu
   *
   * /api/bao-cao/doanh-thu?ngayBat=2026-08-01&ngayKet=2026-08-30
   *
   * /api/bao-cao/doanh-thu?ngayBat=2026-08-01&ngayKet=2026-08-30&nhom=thang
   */
  async getBaoCaoDoanhThu(req, res) {
    try {
      const {
        ngayBat,
        ngayKet,
        nhom = 'ngay'
      } = req.query;

      // ----------------------------------------------------------
      // Kiểm tra nhóm thời gian
      // ----------------------------------------------------------
      if (!['ngay', 'tuan', 'thang'].includes(nhom)) {
        const error = new Error(
          'Tham số nhom không hợp lệ. Chỉ chấp nhận: ngay, tuan, thang'
        );

        error.statusCode = 400;
        throw error;
      }

      // ----------------------------------------------------------
      // Ngày bắt đầu
      // Mặc định: 30 ngày gần nhất
      // ----------------------------------------------------------
      let startDate;

      if (ngayBat) {
        startDate = new Date(`${ngayBat}T00:00:00`);
      } else {
        startDate = new Date();

        startDate.setDate(
          startDate.getDate() - 30
        );

        startDate.setHours(0, 0, 0, 0);
      }

      // ----------------------------------------------------------
      // Ngày kết thúc
      // ----------------------------------------------------------
      let endDate;

      if (ngayKet) {
        endDate = new Date(`${ngayKet}T23:59:59.999`);
      } else {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      }

      // ----------------------------------------------------------
      // Kiểm tra ngày
      // ----------------------------------------------------------
      if (Number.isNaN(startDate.getTime())) {
        const error = new Error(
          'ngayBat không hợp lệ. Định dạng: YYYY-MM-DD'
        );

        error.statusCode = 400;
        throw error;
      }

      if (Number.isNaN(endDate.getTime())) {
        const error = new Error(
          'ngayKet không hợp lệ. Định dạng: YYYY-MM-DD'
        );

        error.statusCode = 400;
        throw error;
      }

      if (startDate > endDate) {
        const error = new Error(
          'ngayBat không được lớn hơn ngayKet'
        );

        error.statusCode = 400;
        throw error;
      }

      // ----------------------------------------------------------
      // Định dạng nhóm thời gian MongoDB
      // ----------------------------------------------------------
      let dateFormat = '%Y-%m-%d';

      if (nhom === 'tuan') {
        dateFormat = '%G-W%V';
      }

      if (nhom === 'thang') {
        dateFormat = '%Y-%m';
      }

      // ----------------------------------------------------------
      // MongoDB Aggregation
      // ----------------------------------------------------------
      const reportData = await HoaDon.aggregate([
        {
          $match: {
            trangThai: 'hoan_thanh',

            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt'
              }
            },

            doanhThu: {
              $sum: {
                $ifNull: ['$tongTien', 0]
              }
            },

            chiPhi: {
              $sum: {
                $ifNull: ['$tongGiaNhap', 0]
              }
            }
          }
        },

        {
          $sort: {
            _id: 1
          }
        }
      ]);

      // ----------------------------------------------------------
      // Chuẩn bị dữ liệu Chart.js
      // ----------------------------------------------------------
      const labels = reportData.map(
        item => item._id
      );

      const doanhThuList = reportData.map(
        item => Number(item.doanhThu) || 0
      );

      const chiPhiList = reportData.map(
        item => Number(item.chiPhi) || 0
      );

      const loiNhuanList = reportData.map(
        (item, index) =>
          doanhThuList[index] - chiPhiList[index]
      );

      // ----------------------------------------------------------
      // Tổng hợp
      // ----------------------------------------------------------
      const tongDoanhThu =
        doanhThuList.reduce(
          (sum, value) => sum + value,
          0
        );

      const tongChiPhi =
        chiPhiList.reduce(
          (sum, value) => sum + value,
          0
        );

      const tongLoiNhuan =
        loiNhuanList.reduce(
          (sum, value) => sum + value,
          0
        );

      // ----------------------------------------------------------
      // Chi tiết
      // ----------------------------------------------------------
      const details = reportData.map(
        (item, index) => ({
          ky: item._id,

          doanhThu:
            doanhThuList[index],

          chiPhi:
            chiPhiList[index],

          loiNhuan:
            loiNhuanList[index]
        })
      );

      // ----------------------------------------------------------
      // Trả kết quả
      // ----------------------------------------------------------
      const data = {
        filter: {
          ngayBat: startDate,
          ngayKet: endDate,
          nhom
        },

        chartData: {
          labels,

          datasets: [
            {
              label: 'Doanh thu',
              data: doanhThuList
            },

            {
              label: 'Chi phí',
              data: chiPhiList
            },

            {
              label: 'Lợi nhuận gộp',
              data: loiNhuanList
            }
          ]
        },

        summary: {
          tongDoanhThu,
          tongChiPhi,
          tongLoiNhuan
        },

        details
      };

      return this.sendSuccess(
        res,
        data,
        'Lấy báo cáo doanh thu thành công'
      );

    } catch (err) {
      return this.handleError(
        res,
        err,
        'Lỗi khi lấy báo cáo doanh thu'
      );
    }
  }

  /**
   * ============================================================
   * 2. TOP SẢN PHẨM BÁN CHẠY
   * ============================================================
   *
   * GET /api/bao-cao/top-san-pham
   *
   * Query:
   * ?limit=5
   */
  async getTopSanPham(req, res) {
    try {
      let limit = parseInt(
        req.query.limit,
        10
      );

      if (Number.isNaN(limit) || limit <= 0) {
        limit = 5;
      }

      if (limit > 100) {
        limit = 100;
      }

      // ----------------------------------------------------------
      // MongoDB Aggregation
      // ----------------------------------------------------------
      const topProducts =
        await HoaDon.aggregate([
          {
            $match: {
              trangThai: 'hoan_thanh'
            }
          },

          {
            $unwind: '$danhSachSanPham'
          },

          {
            $group: {
              _id:
                '$danhSachSanPham.tenSanPham',

              soLuong: {
                $sum: {
                  $ifNull: [
                    '$danhSachSanPham.soLuong',
                    0
                  ]
                }
              },

              doanhThu: {
                $sum: {
                  $ifNull: [
                    '$danhSachSanPham.thanhTien',
                    0
                  ]
                }
              }
            }
          },

          {
            $sort: {
              soLuong: -1,
              doanhThu: -1
            }
          },

          {
            $limit: limit
          }
        ]);

      // ----------------------------------------------------------
      // Chart.js
      // ----------------------------------------------------------
      const labels = topProducts.map(
        product =>
          product._id || 'Không xác định'
      );

      const dataSoLuong = topProducts.map(
        product =>
          Number(product.soLuong) || 0
      );

      const dataDoanhThu = topProducts.map(
        product =>
          Number(product.doanhThu) || 0
      );

      // ----------------------------------------------------------
      // Chi tiết
      // ----------------------------------------------------------
      const details = topProducts.map(
        (product, index) => ({
          tenSanPham:
            labels[index],

          soLuong:
            dataSoLuong[index],

          doanhThu:
            dataDoanhThu[index]
        })
      );

      const data = {
        filter: {
          limit
        },

        chartData: {
          labels,

          datasets: [
            {
              label: 'Số lượng bán',
              data: dataSoLuong
            },

            {
              label: 'Doanh thu',
              data: dataDoanhThu
            }
          ]
        },

        details
      };

      return this.sendSuccess(
        res,
        data,
        'Lấy top sản phẩm bán chạy thành công'
      );

    } catch (err) {
      return this.handleError(
        res,
        err,
        'Lỗi khi lấy top sản phẩm'
      );
    }
  }

  /**
   * ============================================================
   * 3. HÀNG TỒN LÂU NGÀY
   * ============================================================
   *
   * GET /api/bao-cao/ton-lau-ngay?soNgay=60
   */
  async getHangTonLauNgay(req, res) {
    try {
      let soNgay = parseInt(
        req.query.soNgay,
        10
      );

      if (Number.isNaN(soNgay) || soNgay <= 0) {
        soNgay = 60;
      }

      // ----------------------------------------------------------
      // Tính mốc thời gian
      // ----------------------------------------------------------
      const mocThoiGian = new Date();

      mocThoiGian.setDate(
        mocThoiGian.getDate() - soNgay
      );

      // ----------------------------------------------------------
      // Lấy IMEI tồn kho lâu ngày
      // ----------------------------------------------------------
      const dsImeiTon =
        await Imei.find({
          trangThai: 'ton_kho',

          ngayNhap: {
            $lte: mocThoiGian
          }
        })
          .populate(
            'sanPhamId',
            'tenSanPham giaNhap'
          )
          .lean();

      const now = new Date();

      // ----------------------------------------------------------
      // Format dữ liệu
      // ----------------------------------------------------------
      const dataFormatted =
        dsImeiTon.map(item => {
          const ngayNhap =
            new Date(item.ngayNhap);

          const soNgayTon =
            Math.floor(
              (now - ngayNhap) /
              (1000 * 60 * 60 * 24)
            );

          return {
            imei:
              item.maImei ||
              item.code ||
              'N/A',

            tenSanPham:
              item.sanPhamId
                ? item.sanPhamId.tenSanPham
                : 'N/A',

            giaNhap:
              item.sanPhamId
                ? Number(
                    item.sanPhamId.giaNhap
                  ) || 0
                : 0,

            ngayNhap:
              item.ngayNhap,

            soNgayTon
          };
        });

      // Hàng tồn lâu nhất lên đầu
      dataFormatted.sort(
        (a, b) =>
          b.soNgayTon - a.soNgayTon
      );

      const data = {
        soNgayTieuChuan: soNgay,

        tongSoLuongTonLau:
          dataFormatted.length,

        data: dataFormatted
      };

      return this.sendSuccess(
        res,
        data,
        'Lấy danh sách hàng tồn lâu ngày thành công'
      );

    } catch (err) {
      return this.handleError(
        res,
        err,
        'Lỗi khi lấy danh sách hàng tồn lâu ngày'
      );
    }
  }

  /**
   * ============================================================
   * 4. BÁO CÁO TỔNG HỢP TÀI CHÍNH
   * ============================================================
   *
   * GET /api/bao-cao/tong-hop-tai-chinh
   *
   * Phần này được bổ sung từ File 1.
   */
  async getBaoCaoTaiChinhTongHop(req, res) {
    try {
      const result =
        await HoaDon.aggregate([
          {
            $match: {
              trangThai: 'hoan_thanh'
            }
          },

          {
            $group: {
              _id: null,

              tongDoanhThu: {
                $sum: {
                  $ifNull: [
                    '$tongTien',
                    0
                  ]
                }
              },

              tongChiPhi: {
                $sum: {
                  $ifNull: [
                    '$tongGiaNhap',
                    0
                  ]
                }
              },

              soHoaDon: {
                $sum: 1
              }
            }
          }
        ]);

      const resultData =
        result[0] || {
          tongDoanhThu: 0,
          tongChiPhi: 0,
          soHoaDon: 0
        };

      const tongDoanhThu =
        Number(
          resultData.tongDoanhThu
        ) || 0;

      const tongChiPhi =
        Number(
          resultData.tongChiPhi
        ) || 0;

      const tongLoiNhuan =
        tongDoanhThu - tongChiPhi;

      const data = {
        tongDoanhThu,

        tongChiPhi,

        tongLoiNhuan,

        soHoaDon:
          Number(
            resultData.soHoaDon
          ) || 0
      };

      return this.sendSuccess(
        res,
        data,
        'Lấy báo cáo tổng hợp tài chính thành công'
      );

    } catch (err) {
      return this.handleError(
        res,
        err,
        'Lỗi khi lấy báo cáo tổng hợp tài chính'
      );
    }
  }
}

module.exports = new BaoCaoController();