# @fwo/admin

Ứng dụng vận hành riêng của Fishing World Online. React + Vite + TypeScript, CSS Modules, TanStack Query; tái sử dụng `@fwo/ui`, bearer memory, refresh singleflight và CSRF client. API quyết định mọi quyền; ẩn menu không thay authorization.

Từ thư mục `/Users/hanguyen/Downloads/fishing-world-online`:

```sh
rtk proxy pnpm --filter @fwo/admin dev
rtk proxy pnpm --filter @fwo/admin typecheck
rtk proxy pnpm --filter @fwo/admin build
```

Admin ở `http://localhost:5174`, proxy `/api` tới API 3001, đổi bằng `VITE_API_TARGET`. Chủ dự án tạo quyền quản trị qua bootstrap CLI của API; không có email/mật khẩu mặc định hoặc nút tự cấp quyền.

## Chức năng

- Overview/analytics đếm dữ liệu thực; không vẽ retention/revenue giả khi chưa có cohort hoặc payment.
- Loài cá, hồ, trang bị, mồi, shop, missions: danh sách/tìm kiếm, sửa bounded fields, thêm định nghĩa JSON theo canonical config. Máy chủ validate referential constraints, version và audit.
- Config: sao chép bản nháp JSON, lưu schemaVersion 1, Super Admin phát hành với expectedActiveVersion và lý do.
- Users: xem tối đa 100 tài khoản mới nhất; Support/Super Admin thu hồi session, Super Admin thay status với lý do. Không hiển thị password/token.
- Ledger/audit chỉ đọc, tối đa 100 mục mới nhất; dialog xem bản ghi đầy đủ.
- Sổ cái hiển thị tên hiện tại và ID người chơi sở hữu ví; tìm theo tên/ID người chơi/ID ví, chi tiết có ID ví và tham chiếu. Chỉ SUPER_ADMIN/SUPPORT được đọc. Không lấy danh sách tài khoản giới hạn 100 mục để suy chủ ví.
- Thẻ thời trang dùng tên/slot/cách mở khóa Việt–Anh; giữ mã để tra cấu hình, giá Gold/Kim cương/miễn phí đúng loại và action xuống hàng riêng. Loại trang bị dùng nhãn dịch; bộ lọc đơn hàng có placeholder UUID cho ID người chơi.

- Điều hướng chia nhóm theo nghiệp vụ, lọc theo vai trò ([navigation.ts](src/navigation.ts)); tiêu đề tab/breadcrumb lấy từ cùng định nghĩa. Favicon ở `public/icon.svg`.
- Bảng dùng chung `DataTable`: sắp xếp theo cột, tìm kiếm không dấu (client-side trên tối đa 100 bản ghi đã tải), trạng thái rỗng/không có kết quả. Error boundary theo trang.
- Phiên đăng nhập ([auth.ts](src/auth.ts)): cùng transport với web; hết hạn → về login có thông báo và quay lại trang cũ; đăng xuất/đăng nhập đồng bộ giữa các tab; kiểm tra lại role khi tab quay lại. Đăng xuất chủ động thì lần đăng nhập sau về Tổng quan.
- Reload khôi phục qua refresh cookie; Vite HMR tái sử dụng client/store/cache và React root. API tạm ngừng/mạng lỗi khi khôi phục được thử lại; nếu vẫn lỗi, hiện `ErrorState` có nút thử lại tại trang hiện tại thay vì chuyển về login.
- Thanh toán: tổng quan ba chỉ số, khu vực lịch sử đơn gom bộ lọc/trạng thái/bảng, nút xóa lọc và trạng thái rỗng riêng cho đơn/catalog. Typography, khoảng cách và lưới responsive được scope tại trang thanh toán.

Mỗi mutation có loading/error và audit reason. Phân quyền menu theo SUPER_ADMIN, GAME_ADMIN, SUPPORT, ANALYST; API vẫn trả 403 nếu truy cập trực tiếp ngoài quyền. Đây là tập chức năng Gold-only MVP, chưa có event monetization/payments/ads UI.

Tiêu chí nghiệm thu: đăng nhập đúng role, 403 không vượt quyền, sửa nội dung tạo config version/audit, publish conflict trả lỗi, ledger không có thao tác sửa, typecheck/build/E2E workspace thành công.
