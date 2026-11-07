# Test Plan và release gates

## Sửa UI quản trị — 07/11/2026

Nghiệm thu: thẻ thời trang dịch tên/slot/cách mở khóa Việt–Anh, giá Gold/Kim cương/miễn phí đúng loại và không chồng nút ở 320/390/1440px; loại trang bị dịch ở bảng. Sổ cái hiển thị tên/ID chủ ví, tìm theo tên/ID người chơi/ID ví và chi tiết tham chiếu. API join đúng chủ ví, không lộ thông tin liên hệ; SUPER_ADMIN/SUPPORT được xem, PLAYER/GAME_ADMIN/ANALYST bị từ chối; không thay ledger/số dư. Bộ lọc đơn hàng có placeholder UUID theo locale. Kiểm loading/empty/error và dialog; kết quả thực tế tại PROJECT_STATUS.

Ngày: 07/11/2026. Đã có test suite Vitest/PostgreSQL integration/Playwright trong source; kết quả từng đợt ở [PROJECT_STATUS](../PROJECT_STATUS.md) và [SIMULATOR](SIMULATOR.md). Các gate chưa chạy trong tài liệu này vẫn là kế hoạch. Đọc cùng [GAME_DESIGN.md](GAME_DESIGN.md), [UI_UX.md](UI_UX.md) và tài liệu API/database/security. Dùng pnpm; không dùng database ứng dụng để chạy fixture.

Simulator có regression chính thức trong `packages/game-core/src/simulator.test.ts`: ecology theo mồi/độ sâu/nhiệt độ/giờ, casting theo gió/khối lượng, inspect/feed/bite, từ chối/vướng/giật sớm/lỡ hook, catch sau kiệt sức, chiều dài/khối lượng, tác động gear/drag/hướng cần, đứt/chùng dây và độc lập tần suất poll. Integration kiểm metadata/kỷ lục, chat duplicate/ownership/cooldown và tuần Việt Nam; E2E điều khiển range thật, hook lúc GET đang chạy, fight bằng Space, đổi cá và reload kiểm đúng một catch. Cá bơi/hoạt ảnh/mưa và âm thanh cần nghiệm thu trực quan/nghe, không suy ra từ unit test. Chưa xác minh FPS hoặc thiết bị thật.

## 1. Nguyên tắc

Game server và ledger là ranh giới tin cậy. Ưu tiên xác minh invariants có nguy cơ mất tiền ảo/dữ liệu và trạng thái khó phục hồi; không viết test chỉ lặp implementation. Không dùng mock database để kết luận transaction/race condition đúng. Integration chạy PostgreSQL/Redis thật trong môi trường cô lập, clock/RNG được inject khi cần kiểm thử; production chỉ dùng server clock và RNG an toàn.

Mỗi task có acceptance criteria trước code. Unit test phải deterministic; Monte Carlo dùng seed cố định và ngưỡng thống kê phù hợp, không coi một mẫu ít lần là bằng chứng distribution đúng. Không dùng dữ liệu người dùng thật trong QA.

## 2. Ma trận kiểm thử cốt lõi

| Miền                   | Unit / property                                                    | Integration / concurrency                                                                 | E2E và nghiệm thu                                                    |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Authentication         | Validate schema, password policy, expiry                           | Hash password; refresh rotation/reuse; logout revoke; rate limit; generic forgot response | Register → login → refresh → logout; session hết hạn; không lộ token |
| Fishing state          | Mọi transition hợp lệ/không hợp lệ, thời điểm sát biên, timeout    | Ownership, 1 active session/user với race 20 requests; config snapshot; trừ mồi một lần   | Cast → wait → hook → fight → catch/escape → retry                    |
| Fish probability       | Lọc hồ/bait/level, total weight zero, normalize, triangular bounds | Config invalid không publish; phiên cũ không đổi theo config mới                          | 10 loài dữ liệu hiển thị; không lộ kết quả trước catch               |
| Fight                  | Tick 50ms, hold/release TTL, clamp, timeout, mọi escape reason     | Early complete không thắng; spam không tăng tốc; time client giả không tác động           | Pointer/touch/Space; blur/pointercancel nhả; reconnect               |
| Gold/XP                | Integer rounding, min/max, ngưỡng L1/L2/L3/L4                      | Catch + ledger + XP + collection nguyên tử; rollback injection                            | UI số dư sau server confirm, refresh không cộng thêm                 |
| Shop/inventory         | Giá/quantity hợp lệ, equip slot/cap/level                          | Hai giao dịch vượt tổng balance chỉ một thành công; duplicate order; stale price          | Mua mồi → equip → cast; thiếu Gold; inventory empty                  |
| Mission                | Distinct species, kg integer, ngày VN, grace                       | Concurrent claim 20 requests tạo một grant; midnight boundary                             | Complete → claim → reload → trạng thái claimed                       |
| Collection/leaderboard | Count, max weight, tie-break ổn định                               | Dùng catch đã commit; pagination/index; không lộ email                                    | Loài đầu, kỷ lục mới, trang rỗng và lỗi                              |
| Admin                  | Role matrix, config range/cross-field validation                   | Người chơi không đọc/sửa admin; audit before/after; config version publish nguyên tử      | Game Admin sửa trọng số hợp lệ, Analyst chỉ đọc, lỗi validation rõ   |
| Analytics              | Event schema và dedupe key                                         | Outbox retry không nhân sự kiện nghiệp vụ; hạn chế PII                                    | Funnel first_cast/first_catch không bắn lại mỗi render               |

## 3. Ca biên và chống gian lận bắt buộc

Đổi cá: catch mới chưa cộng ví; giá 10% được snapshot, tối thiểu 1/tối đa 100 Gold. Xác nhận đổi mới tạo một ledger; replay cùng key trả receipt, concurrent key khác không nhân thưởng. Kiểm ownership, expectedGold, legacy đã nhận Gold, hạn mức 100 Gold/ngày, hai cá cùng tranh phần hạn mức cuối, reset đúng 00:00 Việt Nam và phân trang. Vượt hạn mức giữ cá/không đổi một phần. Collection/XP/mission không bị giảm hoặc phát lại khi đổi. UI kiểm loading/empty/error/populated, confirm/đóng dialog và viewport hẹp; các số cân bằng phải qua playtest trước chốt.

1. Gửi `fishId`, `rarity`, `rewardGold`, `XP`, `weight`, `progress=100` tự đặt: bị reject schema hoặc bị bỏ ngoài contract; không làm thay đổi reward.
2. Complete trước cast/hook/fight hoặc trên phiên của người khác: bị từ chối, không tạo catch/ledger.
3. Cùng idempotency key, cùng body: nhận lại cùng kết quả; cùng key khác body: conflict; key khác vẫn không vượt uniqueness theo nguồn nghiệp vụ.
4. Tắt mạng sau khi server commit nhưng trước khi nhận response: reload lấy được đúng một catch, đúng một khoản Gold.
5. Hai tab tạo/cast/claim/mua cùng lúc: một active session, stock/balance nhất quán và không âm.
6. DB lỗi giữa insert catch và ledger/profile: toàn bộ rollback; retry hoàn tất đúng một lần. Analytics lỗi không phá transaction gameplay.
7. Clock client tương lai/quá khứ, request trễ/lặp/đảo sequence, session cũ hết hạn: không mở lại bite window hoặc kéo dài fight.
8. Hold rồi blur/tab ẩn/mất mạng: server hết TTL → release, client không giữ button vô hạn.
9. Đổi config khi người chơi đang fight: reward/stat của phiên giữ snapshot cũ; phiên mới dùng bản mới.
10. Update/delete inventory/loadout đang bị session khóa: áp dụng policy nhất quán, không tạo sức mạnh hoặc hoàn mồi kép.

## 4. Xác suất và cân bằng

- Kiểm thử bảng đơn giản có kết quả tính tay; kiểm tra tổng xác suất bằng 1 sau normalize trong sai số số thực, mọi xác suất không âm và cá ngoài hồ có xác suất 0.
- Bài mô phỏng offline seed cố định 100.000 lượt ở baseline: tỷ lệ 55/25/13/5/2 phải nằm trong khoảng 5 sigma của phân phối nhị thức; báo cáo cả counts và khoảng sai số. Vì seed cố định, CI không flaky; khi thay algorithm phải xem lại kiểm định và không sửa seed để né lỗi.
- Bait/time/gear thay đổi phải cho phân phối hữu hiệu đúng công thức, không ép giữ 55/25/13/5/2 sau modifiers. Cấu hình không pool hợp lệ bị chặn trước khi tiêu mồi.
- Sinh tối thiểu 10.000 trọng lượng/loài: luôn trong min/max, không float currency, mean hợp lý theo triangular; deterministic unit kiểm tra các biên RNG 0 và gần 1.
- Playtest ít nhất 10 người mới, ưu tiên mobile phổ thông và mạng mobile: đo tutorial completion, first catch conversion, catch rate theo rarity, số phút có đủ Gold mua mồi/cần. Mục tiêu tutorial >70%, activation >50% là giả thuyết; mẫu 10 người chỉ tìm vấn đề UX, không đủ kết luận retention.

## 5. E2E flows ưu tiên P0

| Flow                 | Preconditions / expected                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| F01 Người chơi mới   | Account riêng → starter chỉ một lần → Hồ Sen → catch thường → profile/collection/ledger đồng nhất                           |
| F02 Miss hook        | Chờ hết bite → ESCAPED → FINISHED; mất một mồi, không nhận catch reward, tiếp tục được                                      |
| F03 Đứt dây          | Hold sai gây tension cao → LINE_BROKE, starter gear còn dùng được                                                           |
| F04 Reward replay    | Intercept/retry complete hoặc reload result → giữ nguyên catch ID và balance                                                |
| F05 Shop/equip       | Mua cần đủ cấp/Gold → equip → phiên mới dùng đúng stats; insufficient funds không trừ một phần                              |
| F06 Mission          | Đạt 3 cá → claim 2 tab đồng thời → một reward; ngày mới tạo occurrence riêng                                                |
| F07 Offline          | Đứt mạng trước/sau commit → thông báo rõ, reconnect không nhân thưởng hoặc kẹt nút                                          |
| F08 Admin            | Người chơi bị403; Analyst không publish; Game Admin tạo draft/preview; Super Admin publish valid config có step-up và audit |
| F09 Password/session | Logout và token cũ không dùng được; refresh token reuse theo policy; forgot không tiết lộ account                           |

Tạo kết quả fight có thể tái lập bằng clock/RNG test phía server, không thêm endpoint “force-catch” vào production. E2E cần ít nhất một flow chạy protocol thực để tránh chỉ kiểm thử mock UI.

## 6. Responsive, trình duyệt, accessibility và asset

Ma trận tối thiểu: Chromium desktop, Firefox desktop, WebKit/iOS Safari, Android Chrome trên ít nhất một thiết bị thật phổ thông. Kích thước 360×640, 390×844, tablet 768×1024, desktop 1440×900; portrait không có horizontal scroll ở game UI. Test keyboard, focus trap/restore, contrast, text zoom 200%, reduced motion, touch cancellation, safe area, trình duyệt chặn autoplay và âm tắt.

Xác minh loading/empty/error/populated của từng screen và dialog/sheet trong UI_UX. Ảnh thiếu phải fallback; font tiếng Việt không lỗi dấu; sự kiện gameplay không chặn bởi overlay vô hình. Canvas phải có hướng dẫn và DOM controls có tên truy cập; không tuyên bố minigame hỗ trợ mọi người dùng chỉ vì automated accessibility scan pass.

## 7. Performance và capacity gates

Các mức sau là mục tiêu để đo, không cam kết một VPS đáp ứng mọi quy mô. Registered users không tương đương concurrent players. Test load theo phiên gameplay thực, không chỉ hit health endpoint.

| Hạng mục      | Kịch bản / gate ban đầu                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API read      | p95 <300ms tại origin ở tải beta, loại trừ mạng người chơi; error rate ngoài 4xx hợp lệ <1%                                                               |
| API mutation  | p95 <500ms, p99 <1s, không mất/nhân reward; xem riêng hook latency vì liên quan window                                                                    |
| Baseline load | 100 concurrent sessions, 20% đang fight ×4 action/s =80 reel req/s + polling/auth/shop; ramp 10 phút, steady 30 phút                                      |
| Worst case    | 100 người cùng fight =400 reel req/s, cộng mutation khác; thử burst và báo giới hạn thực tế, không mặc định pass                                          |
| Endurance     | 2 giờ ở 50% tải đã chứng minh: không tăng heap vô hạn, không cạn pool, không backlog sweeper/outbox kéo dài                                               |
| Database      | EXPLAIN các query active session, ledger theo user/time, inventory, collection, leaderboard; không scan tăng tuyến tính vô ý; row-lock waits trong budget |
| Frontend      | 30 FPS ổn định trên mobile mục tiêu, 60 FPS desktop khi khả thi; frame p95 <33ms mobile; không đưa React render vào mỗi frame                             |
| Loading       | First playable mục tiêu ≤5s trên profile mạng mobile thử nghiệm; ghi rõ băng thông/latency/cache/device, không dùng một con số thiếu điều kiện            |
| Resource      | Theo dõi CPU, RSS, GC, Redis latency, DB connections, slow queries và disk; xác lập headroom ≥30% dưới tải beta mục tiêu                                  |

Với 1.000/10.000/50.000 concurrent, trước tiên extrapolate request model rồi benchmark từng nấc, scale API/stateless worker/DB theo bottleneck. 4 input/giây ở 10.000 người cùng fight là 40.000 req/s trước overhead; cần xem lại giao thức realtime/batching, không hứa VPS nhỏ đáp ứng. Rate limits không được vô tình khóa người chơi hợp lệ dưới tần suất thiết kế.

## 8. CI và bằng chứng nghiệm thu

PR: lint → typecheck → unit → integration PostgreSQL/Redis → build web/admin/api → dependency/secret checks. Staging: migration rehearsal → E2E → smoke/load theo thay đổi → xem logs/audit. Production có manual approval và rollback/backup restore đã diễn tập. Không triển khai production bằng workflow trống hoặc tự động khi chưa có quy trình.

Trước closed beta:

- Tất cả P0/P1 acceptance pass; không còn lỗi double reward, negative wallet, authorization bypass hoặc session kẹt.
- Các ca retry/concurrency/rollback được chạy trên PostgreSQL thật, có kết quả đính kèm bản build.
- Backup restore vào database mới thành công; migration rollback/app rollback theo chiến lược tương thích.
- Chạy ma trận mobile và walkthrough 10 state; số liệu performance có môi trường, commit, config version và giới hạn tải.
- Telemetry không chứa mật khẩu, token, full reset link hoặc dữ liệu cá nhân không cần thiết.

Public release thêm phê duyệt pháp lý, chính sách dữ liệu/tài khoản, quy trình hỗ trợ người dùng và quan sát retention thực. Crash-free >99% chỉ báo khi có cỡ mẫu và thời gian đo, không đánh dấu hoàn thành bằng build pass.

## 9. Quản lý dữ liệu và cleanup

Tests chính thức cho logic quan trọng là deliverable dự kiến, cần giữ trong repository khi triển khai. Chỉ task-only tests, debug fixtures, logs, DB tạm và process tạm phải dọn sau xác minh theo skill `test-artifact-cleanup`; không xóa test suite có trước, dữ liệu ứng dụng hoặc audit history. Lần Discovery này chỉ tạo tài liệu, không provision database hoặc process.

Khi bắt đầu implementation, mọi lệnh hướng dẫn phải ghi working directory và dùng pnpm. Không ghi “đã test” nếu mới viết test hoặc mới kiểm tra Markdown; báo riêng build, unit, integration, E2E, load và những mục chưa chạy.

## Payment regression (07/11/2026)

Giữ `apps/api/test/payments.test.ts`, `payments.integration.test.ts`, `payment-fixtures.ts` và browser suite `tests/e2e/payments.spec.ts`/harness/config theo yêu cầu task thanh toán. Kiểm tra VND server pricing, signed URL/IPN/query, ownership/RBAC, duplicate/concurrent callbacks, unique provider transaction, fulfillment rollback/retry, late success sau expiry, WebSocket owner isolation, reload/reconnect và inventory không nhân. Các test mới không gọi gateway bên ngoài. Chạy browser suite bằng `playwright.payments.config.ts` trên `fishing_world_payments_e2e_test`; không dùng application database. Provider sandbox/certification thực phải chạy thêm khi có credentials; xem [PAYMENTS](PAYMENTS.md).

## Auth expiry trong lượt câu (07/11/2026)

Khôi phục phiên web/admin: reload giữ URL khi refresh cookie còn hợp lệ; HMR giữ client/store/cache và React root, bootstrap đồng thời không nhân refresh. Giả lập API restart bằng network/429/5xx tại refresh và identity: retry tối đa ba lần; lỗi kéo dài hiện retry tại URL cũ, không về login. Retry identity tái sử dụng access token đã lấy; refresh 401/403 vẫn yêu cầu login. Bootstrap HMR không xóa context lượt câu đang được bảo vệ. Kiểm desktop/mobile; không đưa bearer vào localStorage/sessionStorage.

Nghiệm thu: refresh JWT tự động trước hạn/401 với idempotency key giữ nguyên; request đồng thời chỉ một refresh trong tab, tab cùng origin serialize qua Web Locks. Network/429/5xx không xóa auth; login sai không logout; logout 204 không cần JSON. Refresh rolling/absolute hết hạn giữa cast→hook→fight vẫn đọc/điều khiển/complete được đúng lượt; cookie-only reload `/play/fishing` khôi phục context. Không tạo/cast lượt mới, truy cập wallet/shop/admin hoặc dùng grant như bearer/payment socket. CSRF/ownership/reuse/logout/account suspension chặn grant; complete replay chỉ một catch/progression. Kết quả giữ trên màn cho đến khi đóng; lúc đó mới login lại. Deadline grant cố định, engine vẫn timeout bình thường. Browser kiểm WAITING/BITE/FIGHTING ở desktop/mobile, gồm reload và đóng kết quả.

## Character/fashion acceptance (07/11/2026)

Nghiệm thu nhân vật/fashion trong đợt này dùng PostgreSQL thật và Chromium trên build cố định, database/cổng riêng. Test tạm được dọn theo hướng dẫn; suite có trước giữ nguyên. Kết quả và giới hạn ở [CHARACTER_FASHION](CHARACTER_FASHION.md). Các invariants cần giữ trong các lần thay đổi sau:

- Account/Gold/XP không đổi khi tạo character; một main character/account; version conflict, sai slot/ID/variant, unowned item và texture URL bị từ chối.
- Hai order đồng thời/replay chỉ trừ Gold/Kim cương một lần và cấp đúng một inventory; collection tính phần thiếu, khóa item khi đọc giá; admin stale version/RBAC/audit.
- Payment DIAMOND dùng signed IPN/outbox/unique fulfillment; replay không cấp lại, ledger đối soát tại commit.
- Outfit tối thiểu 10, membership hiệu lực 20; expiry giữ outfit đã lưu, không cho tạo thêm khi quá capacity; private outfit không lộ qua share/community, equip chỉ chủ sở hữu và kiểm entitlement/version.
- Event có snapshot, một entry/vote mỗi account, không tự vote; quà/pass claim đúng một lần. Pass tính cá mới sau enroll, premium phải mua, điều khoản đã bắt đầu không đổi.
- Presence hai account hiển thị đúng rig/ngoại hình/tên trong canvas và danh sách; lease/sequence/speed/room bounds; client không giả animation CATCH/không di chuyển khi active fishing.
- Studio kiểm tên trống → sửa hợp lệ, thử item chưa sở hữu → bị chặn save, mua → lưu bộ → equip → reload → vào hồ; admin JSON lỗi inline → sửa → lưu, bảng metrics và narrow viewport. Không có pageerror hoặc lỗi THREE trong flow nghiệm thu.
- Gate chưa đo: mọi tổ hợp clipping, 12 người trên GPU mobile thật, Safari/WebKit, tốc độ mạng, FPS/draw calls, merchant sandbox thật và cân bằng giá theo cohort.

## Ảnh cá và độ hiếm admin (07/11/2026)

Nghiệm thu khi thay đổi editor: tất cả nhãn độ hiếm theo locale nhưng gửi enum; ảnh bắt buộc khi tạo; URL sai có lỗi inline và không gửi mutation; ảnh thư viện và HTTPS xem trước/tải thật; lưu rồi mở lại vẫn đúng ảnh; thêm cá qua form và ẩn có reason/version/audit, reload giữ ảnh/lịch sử. Kiểm desktop/mobile, footer không bị che. Ảnh `imageKey` phải đi qua FishArt ở consumer người chơi; không ghi đè snapshot catch/session cũ. Kết quả đợt này ở PROJECT_STATUS; test tạm được dọn, suite có trước giữ nguyên.

## Tải ảnh cá và bản dịch nhật ký quản trị

Nghiệm thu: chọn ảnh từ máy trên create/edit, preview, bỏ chọn, lưu/reload giữ ảnh; thay lần hai vẫn tải được URL cũ. File quá 5 MiB, SVG, file hỏng đổi đuôi hoặc >20 megapixel bị từ chối; lỗi tại field. Player bị cấm upload; stale version và config không hợp lệ không tạo asset/config/audit. Cùng nội dung ảnh không nhân bản asset; snapshot/audit không chứa base64. Kiểm action/target/system reason Việt–Anh ở dashboard, operations, tìm kiếm và chi tiết, giữ reason tự nhập/raw JSON. Kiểm bàn phím/focus/invalid state và nhãn control chọn tệp ở desktop/mobile. Kết quả thực tế ở PROJECT_STATUS.
