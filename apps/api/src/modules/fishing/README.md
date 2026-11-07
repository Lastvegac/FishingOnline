# Fishing authoritative

`POST /fishing/sessions`, action cast/hook/reel/complete/abandon, GET phiên và GET active hỗ trợ reload. Shared `@fwo/game-core` là state machine thuần; API giữ DB transaction, quyền sở hữu, inventory và rewards. CSPRNG dùng Node crypto; không có RNG/test override qua API hoặc force-catch route.

Một phiên chưa FINISHED/player bằng partial unique index. Mỗi session snapshot config/rod/bait/cá và chứa simulation bí mật; public projection chỉ state, version, serverTime, tension/progress/stamina, deadline khi BITE và CatchDto sau commit. Không expose fishPool/biteAt tương lai/selectedFish. expectedVersion so với persisted version trước clock advance; timeout/state có thể tự chuyển do server thời gian.

Cast tiêu một mồi đúng một lần; auto advance/reel có thể chạm CAUGHT nên settle trước khi gọi action tiếp. Settle unique catch/session; atomic catch/Gold ledger/XP/collection/missions/achievements. Complete không cấp thưởng, giữ receipt catch và chỉ phát session_ended một lần. Abandon kết thúc an toàn, không xóa thưởng đã đạt. Terminal timestamp dùng simulatedAt cho daily mission đúng mốc nửa đêm Việt Nam.

Nghiệm thu: full inject lifecycle với clock chỉ truyền qua server factory trong integration; anti client tampering, owner mismatch404, bait cast replay, repeated complete, unique ledger/catch, reload state. Core package có kiểm thử xác suất/thuật toán/timing/tension/disconnect riêng; server không có endpoint đổi clock.

Simulator mới snapshot conditions/profile/tackle ở create; cast nhận depth, reel nhận drag/rodAngle. Reward snapshot bổ sung chiều dài và thông tin địa điểm/mồi/cần; không sửa catch cũ. `community.ts` phục vụ forecast, room snapshots/chat và top cá tuần bằng catch thật; không truyền vật lý liên tục. Chat dùng mutation helper, khóa user, idempotency, cooldown và chỉ share catch cùng địa điểm do chính user bắt. Week tính theo thứ Hai 00:00 Việt Nam; đây là bảng tuần miễn phí, chưa có giải đấu đăng ký hoặc phát thưởng. Xem [SIMULATOR](../../../../../docs/SIMULATOR.md) và migration `202611070008_lake_community`.

Auth hết hạn giữa lượt: cast thành công cấp quyền cookie hoàn tất đúng lượt, deadline cố định `expiresAt + 2 phút` để xác nhận/khôi phục kết quả; đọc active với bearer hợp lệ cũng cấp grant để phục hồi lượt cũ. Polling/replay không kéo dài deadline. Engine vẫn giữ timeout thật; grant chỉ cho read/hook/reel/complete/abandon của session đã cast và context read cần thiết, không cho cast mới. Web không unmount vì lỗi auth nền trong lúc câu; sau complete/đóng kết quả mới yêu cầu login lại.
