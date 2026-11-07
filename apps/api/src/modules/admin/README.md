# Admin và cấu hình game

SUPER_ADMIN/GAME_ADMIN sửa nội dung; SUPPORT xem user/history/revoke sessions; ANALYST xem aggregates. Mọi route kiểm tra role trên DB, mutations kiểm tra lại sau lấy lock. Auth user registration không nhận role; CLI bootstrap một lần không default credentials. Đổi role yêu cầu password step-up và không được mất active Super Admin cuối cùng; MFA là gate trước production.

GET `/admin/wallet-transactions` giữ giới hạn 100 và quyền SUPER_ADMIN/SUPPORT; trả `AdminWalletTransactionDto` kèm `userId`, `username` hiện tại qua quan hệ wallet → user → profile. Chỉ chọn tên profile, không trả thông tin liên hệ/mật khẩu. Số Gold dạng chuỗi và ngày ISO; dữ liệu ledger gốc không bị sửa. Tên có thể null khi thiếu profile, ID người chơi vẫn có.

CRUD fish/equipment/baits/locations/missions/shop-items: GET trả `{items,configVersion}`, PATCH partial bounded fields + optional expectedVersion/reason, POST `{item:<full canonical entry>,reason}`, archive có kiểm tra starter invariants. Edit tạo version GameConfig mới và audit before/after atomically. Fish/item definitions còn nguyên để inventory/collection không mất; activeflags độc lập, không resurrect khi publish mục khác. Không đổi slot/kind trang bị đã tồn tại.

Config draft `POST /admin/configs/game/versions` với GameConfig schema; publish SUPER_ADMIN, expectedActiveVersion và reason. Advisory lock serialize các publisher, published values bất biến bằng trigger. Runtime sessions giữ configId+snapshot cũ, phiên mới dùng activeconfig. Gate active free starterlake/easyfish/rodlinehook/worm/30Gold pack ngăn hardlock onboarding.

Nghiệm thu: player403, analyst không xem audit thô, activefalse giữ qua unrelated patch, audit append-only, config/reward/session snapshot không thay giữa phiên; test suite có PostgreSQL constraints. Endpoint đọc giới hạn100 mục trong MVP; cần cursor pagination/export quyền hạn trước vận hành lớn.

Fish PATCH hỗ trợ `imageKey` qua schema canonical `fishImageKeySchema`: mã thư viện `fish/<slug>`, đường dẫn ảnh `/fish/` hoặc HTTPS, tối đa 2.048 ký tự. POST fish validate entry riêng trước publish để lỗi trả đúng field của form. Admin dùng form thêm cá có ảnh/xem trước; thao tác ẩn vẫn PATCH active=false, giữ snapshot và lịch sử. POST/PATCH cá nhận thêm `photoUpload:{data:<base64>}` cùng request; sharp xác minh và chuẩn hóa WebP, lưu bảng `fish_photo_assets` trong cùng transaction cấu hình/audit. GET `/fish-photos/:id` trả ảnh công khai. Migration `202611070012_fish_photos`; không sửa bản ghi/audit cũ.
