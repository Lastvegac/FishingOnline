# MVP backlog và thứ tự triển khai

07/11/2026 · Effort là giờ làm tập trung của một người, gồm tài liệu module, code, test và sửa lỗi trong task. Không cộng thêm một lần nữa cho cùng test ở giai đoạn tích hợp. Ước lượng có sai số cao trước prototype; cập nhật sau mỗi milestone.

P0 = điều kiện vòng chơi nội bộ an toàn; P1 = phải có trước beta theo master prompt; P2 = sau MVP. P1 không có nghĩa được bỏ khỏi MVP. Mỗi task chỉ nhận một owner; task hoàn tất khi có bằng chứng kiểm tra và tài liệu, không chỉ file đã tạo.

| ID   | Ưu tiên / task                       |    Giờ | Phụ thuộc     | Tiêu chí nghiệm thu                                                                                              |
| ---- | ------------------------------------ | -----: | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| D00  | P0 Discovery, PRD/GDD/architecture   |  30–45 | Yêu cầu       | Đủ tài liệu, nguồn/giả định phân biệt, review quyết định; phần tài liệu v0.1 đã tạo, chưa tính là user-approved  |
| F01  | P0 Workspace/tooling/UI foundation   |  20–28 | D00           | pnpm lock/workspace; React/Vite/TS strict; shared UI/token exports; lint/typecheck/build từ clean clone          |
| F02  | P0 DB/Redis/Prisma/seed              |  20–30 | F01           | Docker local, migration clean DB, seed lặp an toàn 10 cá/hồ/items, constraints/index/ledger trigger              |
| F03  | P0 Fastify API baseline/CI           |  16–24 | F01           | Env Zod, errors/log redact, health, OpenAPI, CORS/rate limit; CI lint/type/unit/integration/build                |
| A01  | P0 Register/login/session            |  26–38 | F02,F03       | Argon2id, rotated refresh/hash/reuse, logout, CSRF; integration auth/owner/access role                           |
| A02  | P1 Forgot/reset/account UX           |  14–22 | A01           | Token một lần/expiry, không enumerate; mail local và cấu hình provider staging; reset revoke                     |
| C01  | P0 Content/profile/config            |  18–26 | F02,A01       | Hồ Sen/10 cá qua API, profile/starter grant đúng một lần, config version valid                                   |
| W01  | P0 Ledger/shop/inventory/loadout     |  28–40 | C01           | Atomic purchase/equip/upgrade; unique receipt, không âm; khóa loadout; hỗ trợ cứu trợ mồi có daily grant unique  |
| G01  | P0 Game-core simulation server       |  30–44 | C01           | Weighted RNG, gram/XP/reward, 10 states, clock/input TTL; deterministic tests + probability bounds               |
| G02  | P0 Fishing endpoints/transaction     |  30–44 | W01,G01       | Ownership/timing/sequence; một active session; concurrent catch chỉ một reward, timeout/sweeper/outbox           |
| P01  | P0 Phaser prototype bằng shapes      |  24–36 | F01,G01       | Side-view responsive, cast/bite/fight, input pointer/Space, cleanup scene, không React per-frame                 |
| P02  | P1 Animation/audio/asset pack        |  24–40 | P01           | Nền, nhân vật, 10 ảnh cá, effects và âm có license; mute/autoplay/reduced motion; asset budget                   |
| U01  | P0 Auth/lobby/game integration       |  26–38 | A01,G02,P01   | Đăng ký → hồ → catch → server-confirmed result; reload/reconnect/escape hoạt động                                |
| U02  | P1 Profile/collection/shop/inventory |  24–36 | W01,U01       | Các screen và nested states responsive; level/gold/count thật; dùng shared controls                              |
| M01  | P1 Daily/achievement/leaderboard     |  22–32 | G02,U02       | 3 mission, timezone/grace, claim race; 3 achievement danh hiệu; rank từ catch hợp lệ                             |
| AD01 | P1 Admin/RBAC/audit                  |  30–44 | C01,W01,M01   | CRUD cá/hồ/gear/mồi/mission/shop, hỗ trợ user và audit; config preview/version/publish; Analyst read-only        |
| AN01 | P1 Analytics và vận hành             |  16–24 | U01,M01       | Outbox/event dedupe, funnel/cohort, dashboards/log retention; không PII dư                                       |
| Q01  | P1 Tích hợp/QA/performance/security  |  36–56 | Các task trên | E2E thực, mobile thật, 100 CCU + worst-case burst, threat/replay/rollback test; sửa lỗi P0/P1                    |
| O01  | P1 Staging/deployment/restore        |  22–34 | F03,Q01       | Docker/HTTPS/secrets, CI stage gate, restore rehearsal, rollback app và runbook                                  |
| L01  | P1 Rà soát pháp lý và tài khoản      | 20–40* | D00, tư vấn   | Memo phân loại theo tương tác, hồ sơ/độ tuổi/guardian/privacy; triển khai thay đổi cần thiết được estimate riêng |
| B01  | P1 Beta/vòng sửa balance             |  30–50 | Q01,O01,L01   | Hai cohort quan sát D7, feedback có owner, tuning có config version, báo kết quả đạt/chưa đạt                    |

`*` L01 chỉ là công sức chuẩn bị/phối hợp của developer; không phải thời gian xử lý cơ quan quản lý, phí tư vấn hoặc effort triển khai identity chưa xác định.

Tổng D00 đến B01: **506–771 giờ**. Cộng dự phòng 25–35% cho tích hợp/balance/phụ thuộc: khoảng **633–1.041 giờ**, tương đương **32–53 tuần ở 20 giờ/tuần**. Ngày lịch thực có thể dài hơn do chờ asset/pháp lý hoặc dev không đủ 20 giờ. Không báo bộ tài liệu v0.1 hôm nay tương đương đã làm đủ 30–45 giờ Discovery: estimate bao gồm phỏng vấn/playtest/review còn thiếu.

## Task triển khai đầu tiên: F01

Mục tiêu: clean clone có thể install/typecheck/build một web shell, API health và package contracts, trước khi dựng cơ chế chơi. Chia F01 thành các lát nhỏ: (a) workspace/TS config; (b) web shell/shared UI; (c) API skeleton/health; (d) CI check. Phần API chi tiết và CI thời gian thuộc F03, không mở rộng F01 thành toàn bộ game.

File dự kiến: root `package.json`, `pnpm-workspace.yaml`, lockfile, TS/lint configs; `apps/web` và `apps/api` tối thiểu; packages shared/contracts/game-core/game-config/ui chỉ tạo khi có consumer thực. `apps/admin` tạo ở AD01, không bắt dev setup ứng dụng chưa dùng.

Lệnh dự kiến sau khi có source, tất cả chạy từ `/Users/hanguyen/Downloads/fishing-world-online`: `rtk pnpm install`, `rtk pnpm lint`, `rtk pnpm typecheck`, `rtk pnpm test`, `rtk pnpm build`. Đây là contract sẽ tạo trong F01/F03, hiện chưa có scripts để chạy. Không dùng npm/yarn hoặc tạo placeholder API trả fake success.

## Backlog sau MVP

| Nhóm            | Điều kiện cân nhắc                                    | Chưa làm                                                                    |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| Nội dung        | Người chơi hoàn thành collection nhanh, D7 tốt        | Hồ/sông/biển, hàng trăm cá, mùa/sự kiện hoạt động                           |
| Social/realtime | Nhu cầu quan sát được; đánh giá phân loại pháp lý mới | Socket.IO, chat/moderation, guild, co-presence                              |
| Monetization    | Pháp lý/nhà cung cấp/retention và tracking sẵn sàng   | Cosmetic thanh toán, VIP tiện ích, rewarded ads, affiliate/sponsorship      |
| Tài khoản       | Hỗ trợ/chi phí phù hợp                                | Social login, avatar upload có kiểm duyệt                                   |
| Economy         | Bằng chứng từ cohort                                  | Repair/durability, pity, nhiều slot/skill; mọi thay đổi có migration config |
| Tăng trưởng     | D1/D7 đủ và có khả năng vận hành                      | Referral chống farm, SEO mở rộng, quảng cáo quy mô                          |

Betting, cash-out, đổi Gold ra tiền/vật thật và trading tiền thật không nằm trong roadmap.
