# Roadmap: từ Discovery đến Production

07/11/2026 · Một developer chính **20 giờ/tuần**, đã được người dùng xác nhận. Đây là phạm vi kế hoạch, không cam kết ngày ra mắt. Trình tự theo phụ thuộc; agent có thể soạn tài liệu độc lập nhưng không tạo thêm năng lực kiểm thử/quyết định của người chịu trách nhiệm.

| Mốc / phase        | Tuần làm việc cơ sở, cộng dồn | Đầu ra                                                                     | Gate chuyển giai đoạn                                                            |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 0 Discovery        | 1–3                           | PRD, nghiên cứu, GDD, kiến trúc/schema/API, backlog; phỏng vấn 12–15 người | Chốt side-view/loop; rõ giả định, rủi ro, phạm vi pháp lý; tài liệu v0.1 hiện có |
| 1 Foundation       | 4–8                           | pnpm, React/Phaser, API, Docker Postgres/Redis, CI, auth                   | Clean clone chạy; hash/token/constraints và seed đã test                         |
| 2 Backend Core     | 9–15                          | Profile/content/inventory/ledger/shop/fishing endpoints                    | Transaction/replay/race invariants pass                                          |
| 3 Game Core        | 16–20                         | Phaser scenes, simulation, assets/audio                                    | Loop hoàn chỉnh trên thiết bị mục tiêu; thử bằng shapes trước asset cuối         |
| 4 Integration      | 21–27                         | Auth/lobby/profile/collection/equipment/missions/leaderboard               | End-to-end server authoritative; 3 nhiệm vụ và kỷ lục thật                       |
| 5 Admin/operations | 28–31                         | Admin/RBAC/config/audit/analytics                                          | Điều chỉnh trọng số không deploy, active session giữ snapshot                    |
| 6 QA/staging       | 32–36                         | E2E, performance/security, migration/backup/restore, docs                  | Không còn lỗi nghiêm trọng; giới hạn tải đã đo; runbooks                         |
| 7 Closed Beta      | 37–42                         | Cohort nhỏ, 2 vòng cân bằng/onboarding                                     | Pháp lý cho beta đã giải quyết; D1/D7 đo được, feedback có owner                 |
| 8 Public readiness | 43–46*                        | Hồ sơ/chính sách/monitoring/support/launch                                 | Chủ sản phẩm nghiệm thu, release manual approval, pháp lý hoàn tất               |

Khung 46 tuần là base để lên lịch, phù hợp tổng effort và dự phòng; dải 32–53 tuần từ [BACKLOG.md](BACKLOG.md) phản ánh bất định. `*` Tuần pháp lý ở đây là công việc chuẩn bị nội bộ, không dự báo thời gian thụ lý. Nếu phụ thuộc kéo dài, có thể tiếp tục playtest nội bộ, không tự mở beta/public.

## Các mốc nhỏ có thể nghiệm thu

1. M1: đăng ký/đăng nhập và starter đúng một lần, không có gameplay.
2. M2: API cast/hook/reel/catch với test client, ví/collection đúng; không cần artwork cuối.
3. M3: prototype side-view chơi nội bộ được một lượt trên mobile và desktop.
4. M4: shop/equipment/mission/admin tích hợp đủ, mọi trạng thái lỗi hữu ích.
5. M5: build staging đã QA + restore backup; bản release candidate.
6. M6: beta pháp lý phù hợp, retention và kinh tế có số liệu thực; quyết định public hoặc tiếp tục sửa.

Không đồng thời làm nhiều hồ, guild và payments trong lúc M2 chưa đúng. Khi thiếu thời gian, giảm số biến thể đồ họa và trang bị; không cắt ledger, ownership, transaction hoặc kiểm thử phần thưởng.

## Nhịp tuần đề xuất ở 20 giờ

12 giờ implementation, 4 giờ kiểm thử/sửa lỗi, 2 giờ tài liệu/review, 2 giờ phỏng vấn/đo dữ liệu. Tỷ lệ thay đổi theo phase. Cuối mỗi tuần cập nhật PROJECT_STATUS, TODO, CHANGELOG và estimate còn lại; không cộng giờ AI như giờ đã nghiệm thu. Mỗi task đi qua mục tiêu → phân tích → file plan → code → check → sửa → nghiệm thu → docs.

## Điều kiện scale và mở rộng

100 CCU là benchmark đầu tiên, không SLA từ thiết kế. Trước 1.000 CCU phải load test với waiting polls và input fight, đo DB/CPU/lock; trước 10.000/50.000 CCU đánh giá lại REST tần suất cao, connection và DB contention. Registered users không quyết định VPS khi chưa biết DAU/session length/peak CCU. Xem [DEPLOYMENT.md](DEPLOYMENT.md).

Vòng monetization sau MVP chỉ mở khi có legal review cho từng mô hình, D1/D7 và khả năng phục vụ đã đo. Tiến độ còn phụ thuộc asset có license, email delivery, doanh nghiệp phát hành, ngân sách tư vấn và khả năng bảo trì ngoài 20 giờ phát triển.
