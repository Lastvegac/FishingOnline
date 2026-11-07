# Players, inventory, wallet và progression

Giỏ cá: `GET /inventory/catches` phân trang 20 catch chưa nhận Gold; `POST /inventory/catches/:id/exchange` kiểm chủ sở hữu, expectedGold, trạng thái và hạn mức 100 Gold/ngày Việt Nam. Khóa người chơi serialize cả catch/exchange; ledger FISH_EXCHANGE, đánh dấu goldClaimed/exchangedAt và analytics cùng transaction. Giá lưu trong rewardGold/rewardSnapshot, không tính lại theo config hiện tại. Cá legacy mặc định đã nhận Gold; chỉ catch từ phiên snapshot exchange mới chờ đổi. Đổi cá giữ nguyên XP/collection/mission. Gold sử dụng qua shop orders hiện có.

Nhóm module giữ các nghiệp vụ đọc profile/catalog, túi đồ/equip/upgrade, cửa hàng Gold, collection, daily missions/achievements và leaderboard trong một service layer. Chưa tách repository class vì Prisma transaction client được truyền rõ vào service, tránh abstraction không có tác dụng.

Gold integer BigInt trên DB, serialized string. `ledger()` chỉ thêm entry rồi cập nhật projection trong cùng transaction; DB deferred trigger đối soát ở commit. Mọi mutation user serialize user row, receipt idempotent persisted. Shop lock hàng hóa để chống oversell liên tài khoản, xác minh giá/configVersion/level, không nhận amount/reward tùy ý. Equipment không mua nhiều bản; bait stack được cộng grantQuantity. Upgrade rod tối đa2 cấp, giá100/250Gold và bonus+1power/+1control mỗi cấp, giá công khai trước thao tác.

Daily mission snapshot criteria+reward theo ngày Việt Nam, hoàn tất do catches thật; claim một lần và grace12h sau cuối ngày. Đổi adminconfig không đổi reward đã snapshot. Rescue cấp5worm khi hếtworm và Gold<30, unique grant/player/VNday. Catch timestamp simulation quyết định ngày nhiệm vụ; ledger timestamp là lúc commit.

Nghiệm thu: integration duplicate/concurrent purchases, finite stock, insufficient balance rollback, upgrade replay/ownership, thiếu dây/lưỡi không vào hồ, rescue eligibility/once-per-day, claim concurrent không duplicateXP/Gold. Leaderboard stable ties theo UUID, không lộ email. Tests fixture chạy DB `_test` riêng và dọn sau test.
