# Realistic Fishing Simulator

## Phase 1 — khảo sát và quyết định triển khai

Nguồn thực thi đã khảo sát: contracts, game-config, game-core, fishing/players/admin/auth API, Prisma, web/game, shared UI/Three.js, unit/integration/E2E và tài liệu kiến trúc. Giữ React/Vite/Three.js, Fastify modular monolith và PostgreSQL; không dựng lại tài khoản, ví, shop hay collection.

| Hệ thống   | Đã có trước thay đổi                                   | Khoảng trống                                                   |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Thế giới   | 6 địa hình, pool cá và shop riêng                      | Cùng cảnh hồ; chưa có điều kiện nước/thời tiết                 |
| Cá         | 37 loài, habitat/salinity, weight/reward, mồi ưa thích | Chọn cá lúc cast, chờ RNG 3–8 giây; chưa có AI theo môi trường |
| Casting    | API aim/power, trừ một mồi trong transaction           | UI cố định 0.6; điểm rơi chưa ảnh hưởng gameplay               |
| Hook       | Deadline server, tutorial, chặn complete sớm           | Chưa có kiểm mồi/nhả mồi hoặc chất lượng giật                  |
| Fight      | Tick 50ms, hold TTL, tension/stamina/progress, escape  | Chưa có drag, hướng cần, sức dây, mài mòn, khoảng cách         |
| Trang bị   | Rod/line/hook/bait, nâng cấp, đồ theo địa hình         | Dây/lưỡi chỉ cộng power/control; chưa có phụ kiện riêng        |
| Hình/âm    | Cảnh 3D, procedural fish, sóng, đuôi, âm tín hiệu      | Chưa phản ánh khối lượng, thời tiết hoặc trạng thái kiếm ăn    |
| Tiến trình | XP/level, mở hồ/đồ, missions, achievements, collection | Chưa có skill riêng, công thức mồi, ảnh chiến lợi phẩm         |
| Cộng đồng  | Leaderboard toàn server                                | Chưa có hiện diện, chat, avatar chung hồ hay giải đấu          |
| An toàn    | Ownership, version, idempotency, snapshots, ledger     | Phải giữ toàn bộ khi thêm mô phỏng                             |

## Các giai đoạn và nghiệm thu

1. Khảo sát: chạy suite có sẵn làm baseline; ghi rõ khoảng trống.
2. Fish AI: profile loài, độ sâu/giờ/nhiệt độ/mồi tác động tiếp cận và từ chối; kiểm deterministic và không lộ cá trước kết quả.
3. Môi trường: điều kiện server được snapshot; hình ảnh theo cùng điều kiện. Đây là thời tiết trong game, không lấy dự báo thật.
4. Casting: hướng/lực/độ sâu do người chơi chọn; gió, khối lượng bộ câu, địa hình quyết định điểm rơi và cảnh giác.
5. Bite/hook: tín hiệu kiểm mồi khác cắn thật; giật sớm/thả quá hạn có thể mất cá; không tự giật.
6. Fighting: mass/species/stamina/drag/steering/gear trong tick cố định; đứt dây, chùng dây, quá xa, kiệt sức và landing.
7. Model: hình riêng theo nhóm loài, đuôi theo trạng thái; kích thước chiến lợi phẩm theo weight/length server.
8. Gear: snapshot rod/line/hook và reel tích hợp với rod; không bịa thêm inventory mà shop không bán.
9. UX/audio: shared controls, Việt–Anh, touch/keyboard, giảm chuyển động, ngắm cảnh/fullscreen; âm theo môi trường.
10. Community: triển khai phần có thể xác minh trên dữ liệu thật; phân biệt nền tảng cộng đồng với multiplayer/giải đấu đầy đủ.
11. Regression/security: engine, schema, integration PostgreSQL, E2E, lint/typecheck/build; dọn artifact/DB test riêng, giữ dữ liệu ứng dụng.

Phiên legacy thiếu snapshot simulator tiếp tục engine cũ. Không ghi lại config hoặc simulation của phiên cũ để áp luật mới. Gold/XP, exchange và ledger giữ transaction hiện có. Mọi con số vật lý/cân bằng là giả thuyết gameplay cần playtest; không tuyên bố mô phỏng thủy sinh khoa học hoặc production-ready.

## File và kết quả theo phase

| Phase           | Triển khai trong source                                                                                     | Xác minh và giới hạn                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Khảo sát    | Tài liệu này; contracts, config, engine, API, Prisma, web và shared scene hiện có                           | Baseline 33 unit qua trước thay đổi; không dựng lại tài khoản/shop/tiến trình                                                                                                   |
| 2 — Fish AI     | `packages/game-config/src/simulator.ts`, `packages/game-core/src/simulator.ts`, hai package `index.ts`      | Test profile khác nhau, mồi/giờ/nhiệt độ/habitat, inspect/feed/bite và rejection; AI theo lượt câu, chưa mô phỏng quần thể bền vững                                             |
| 3 — Môi trường  | `conditionsFor`, forecast ở `apps/api/src/modules/fishing/community.ts`, shared `three/lake.ts`             | Sáu water profile, weather/time/current/wind có tác động engine; thời tiết trong game, snapshot từng phiên                                                                      |
| 4 — Casting     | `solveCast`, contracts cast schema, fishing API, `FishingPage.tsx`, `LakeScene.ts`                          | Test hướng/lực/gió/khối lượng/rod length/độ sâu, điểm rơi và snag; input chuột/cảm ứng/range bàn phím                                                                           |
| 5 — Bite/hook   | `scheduleBehavior`, `hookEngine`, cue/escape contracts, UI i18n                                             | Test kiểm/ăn/cắn/từ chối, giật sớm/lỡ cửa sổ và deadline bí mật; giật sớm hiện mất cá thay vì tung xác suất móc thấp                                                            |
| 6 — Fighting    | `simulateFight`, `reelEngine`, drag/angle contracts và UI metrics                                           | Test catch thật sau exhaustion, ảnh hưởng gear/mass/drag/hướng cần, line break/slack và poll invariance                                                                         |
| 7 — Model       | `packages/ui/src/three/models.ts`, `three/art.ts`, shared `FishArt`, cảnh hồ                                | Thêm nhóm hình cho loài trước dùng mẫu chung; length server đổi kích thước hiển thị. Model procedural, chưa có 37 rig/animation riêng                                           |
| 8 — Trang bị    | `tackleFor`, fishing create snapshot, vật phẩm/shop hiện có                                                 | Tải cần/drag tích hợp, tải dây/giãn/mài mòn, hook grip; không đổi giá/thưởng. Độ bền chỉ thuộc phiên, chưa có inventory reel/float/phụ kiện độc lập                             |
| 9 — UX/audio    | `FishingPage`, `FishingAudio`, `game.module.css`, shared `RangeField`, VI/EN catalogs; collection và basket | Hướng/lực/depth/drag/angle, điều kiện, fullscreen/ngắm cảnh, ambient/reel/cue. Reuse shared loading/error/empty/forms/modal; âm tổng hợp, chưa có thư viện âm thu ngoài thực tế |
| 10 — Cộng đồng  | `community.ts`, `LakeCommunity.tsx`, Prisma `LakeMessage`, migration `202611070008_lake_community`          | Chat/khoe cá thật/cooldown/idempotency và top cá theo tuần; tích hợp pipeline nhân vật/hiện diện đang có trong workspace. Chưa có thách đấu hoặc giải đăng ký có thưởng         |
| 11 — Regression | `game-core/src/simulator.test.ts`, API integration và E2E game/UI hiện có; OpenAPI/docs                     | 51 unit và 28 integration qua; 30 test engine gồm 21 legacy + 9 simulator. Giữ test chính thức, database kiểm thử tách riêng. Kết quả browser/build cuối ghi ở PROJECT_STATUS   |

Ngoài suite chính thức, lượt kiểm tra deterministic dùng mồi ưa thích, độ sâu/giờ phù hợp và bộ surf rod/braided line/saltwater hook cho thấy **37/37 loài có thể bắt được** với điều khiển hold/release/drag/đối hướng trong giới hạn engine. Đây là kiểm tra khả năng chơi được ở một mẫu khối lượng/thời tiết thuận lợi, chưa chứng minh cân bằng cho mọi cân nặng, trang bị hoặc người chơi. `FishArt` được mở rộng tương thích bằng chế độ `model` cho chiến lợi phẩm simulator; các màn catalog ảnh hiện có vẫn dùng chế độ mặc định của chúng.

## An toàn dữ liệu và cập nhật local

- Schema mới chỉ thêm bảng chat và index; metadata simulator/catch dùng JSON snapshot hiện có. Không cập nhật ngược session/catch/ledger hoặc số dư cũ.
- Unit/integration dùng server clock/RNG được inject trong test; API thực không có endpoint force-win/đổi giờ. Client không thể tự gửi fish/weight/reward/progress.
- Khi cập nhật database ứng dụng, chạy từ root: `rtk proxy pnpm db:generate` rồi `rtk proxy pnpm db:migrate`. Task simulator chỉ áp migration/seed vào database riêng kết thúc `_test`. Kiểm tra read-only cuối cho thấy database ứng dụng local đã đủ 11 migration/schema up to date; task không chạy fixture hoặc cleanup trên database ứng dụng.
- Có thể dùng config cũ thiếu `behavior`/`water`: giá trị mặc định được resolve và snapshot khi tạo phiên mới. Không cần seed lại để bật engine mới trên những địa điểm hiện có; seed vẫn cần cho môi trường chưa có catalog.

## Phạm vi còn thiếu của tầm nhìn đầy đủ

Thuyền/sonar, nhiều slot reel/float/accessory, lure retrieval, phối mồi/công thức, bộ kỹ năng độc lập, môi trường xa bờ, cá biến thể, ảnh chiến lợi phẩm xuất file, trưng bày công khai bộ sưu tập, thách đấu và giải đấu đăng ký có thưởng chưa được triển khai trong phần simulator này. Chat mới có xác thực/giới hạn tốc độ, chưa có giao diện moderation/report. Nhân vật/trang phục/thanh toán đang được phát triển đồng thời là các module riêng; không tính chúng là sản phẩm được nghiệm thu bởi suite simulator. Không tạo nút giả cho các mục còn thiếu, không bật thanh toán thật trong đợt mô phỏng.

Cảnh vẫn là thế giới procedural dùng chung với màu/nước/cá/vegetation và điều kiện theo địa hình, chưa có sáu bản đồ được dựng thủ công riêng. Chưa đo FPS/p95, tải nhiều người, chất lượng âm hoặc nghiệm thu Safari/thiết bị thật. Các kiểm tra build/type không thay thế những nghiệm thu này.

## Kết quả nghiệm thu cuối và cleanup

- 51 unit; 28 PostgreSQL integration; 4 E2E chính thức desktop/mobile (gameplay và shared UI) qua trong các lượt chạy tương ứng. Hai kiểm tra UI tạm bổ sung qua cho community loading/empty/error/populated và khác biệt kích thước model.
- Typecheck toàn workspace, build web/admin/API, lint phần simulator và color lint qua. Build còn cảnh báo chunk lớn; lint toàn workspace còn gặp file verification tạm của phần việc khác, được giữ nguyên.
- E2E dùng bản sao source cố định để tránh HMR trong workspace đang có nhiều thay đổi. Đã xem ảnh cảnh/chiến lợi phẩm desktop/mobile; chưa đánh giá chất lượng âm/FPS/thiết bị thật.
- Đã dọn hai database riêng `fishing_world_simulator_test`, `fishing_world_simulator_e2e_test`, bản sao QA và các script/ảnh/trace tạm thuộc task. Giữ suite chính thức, dữ liệu ứng dụng, ledger/audit và artifact của các phần việc khác.
