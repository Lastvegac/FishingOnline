# @fwo/game-core

Máy trạng thái TypeScript thuần, không DOM, không network/database, không tự sinh UUID và không dùng đồng hồ client. API inject server time/RNG an toàn, lưu `EngineState` JSON server-only và kiểm tra expectedVersion/ownership/idempotency trong transaction. Chỉ DTO từ `toPublicEngine` được gửi client. Không serialize toàn bộ state.

Luồng: `createEngine` → `castEngine` → `advanceEngine`/`hookEngine` → `reelEngine`/`advanceEngine` → `CAUGHT` hoặc `ESCAPED` → API commit catch/ledger/XP/collection atomically → `finishEngine`. `complete` không tạo thắng. Nếu API gọi advance và nó phát sinh result, API phải persist result trong cùng transaction trước trả response. `EngineState.result` là kết quả engine, không phải bằng chứng DB đã credit.

Simulation bước 50ms, input spacing 250ms, hold TTL 350ms, fight tối đa 75s với simulator (legacy 45s), inactivity 60s, session TTL 5 phút. Input chậm làm tự nhả, không pause phiên. Giá trị Gold/XP do `rewardForCatch`, XP `levelForXp`; dùng số nguyên an toàn trong engine, API ghi money bằng bigint/decimal string.

`simulator.ts` giữ casting/ecology/fish cues/fight physics. Tạo phiên mới với `simulation` để snapshot conditions + tackle và profile từng loài; thiếu field này giữ engine legacy. Hướng/lực/độ sâu, gió và khối lượng mồi quyết định điểm rơi. Ecology tác động lựa chọn/thời gian kiểm mồi/từ chối; giật sớm, lỡ cửa sổ, vướng bờ, đứt/chùng dây đều có thể thất bại. Fight dùng khối lượng, kiểu chống trả, drag, hướng cần, tải dây, độ giãn và mài mòn; bắt cá đòi kiệt sức rồi về bờ. Length là xấp xỉ từ weight và hệ số loài, được snapshot trong kết quả.

`toPublicEngine` là allowlist bắt buộc; không trả selected fish/weight, lịch bite tương lai hoặc suitability. Các test trong `simulator.test.ts` bổ sung cho regression legacy, kiểm môi trường, casting, tín hiệu, thất bại, điều khiển thực và bất biến theo tần suất poll. Xem [báo cáo simulator](../../../docs/SIMULATOR.md).

Khi đọc lại sau mất mạng, engine mô phỏng phần timeline hợp lệ trước thời hạn rồi mới áp dụng abandon nếu chưa có kết quả. Catch hoàn thành trong350ms cuối không bị đổi thành thất bại chỉ vì request đến muộn. `simulatedAt` tại terminal là thời điểm gameplay bắt cá; API nên dùng thời điểm đó cho catch/ngày nhiệm vụ và dùng thời điểm transaction riêng cho ledger.

`selectFish` có modifiers bait/time/gear/level và tutorial pool dễ trong3lượt đầu do server bật. `sampleWeight` triangular. Tất cả hàm random nhận `RandomSource` trả [0,1), không dùng Math.random mặc định để tránh vô tình triển khai RNG yếu ở server.

Từ thư mục `/Users/hanguyen/Downloads/fishing-world-online`: `rtk pnpm --filter @fwo/game-core typecheck` và `rtk pnpm --filter @fwo/game-core test`. Suite cố định clock/RNG, kiểm tra loop chơi thực, sai state/replay/TTL và public projection; integration transaction/anti-replay thuộc API.
