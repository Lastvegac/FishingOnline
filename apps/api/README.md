# API — Fishing World Online

Fastify 5 + TypeScript + Prisma 7.10.1/adapter-pg trên PostgreSQL. Modular monolith thực thi luật game phía server; frontend không quyết định cá, trọng lượng hay phần thưởng. Đây là MVP phát triển nội bộ, chưa đáp ứng gate phát hành công khai trong `docs/LEGAL.md` (định danh/tuổi/người giám hộ/thời gian chơi/privacy và rà soát vận hành).

## Local

Node 22.23+ và pnpm 10.29+, PostgreSQL 15+, Redis tùy chọn trong development. Từ **workspace root**, cài bằng `rtk pnpm install --frozen-lockfile`. Từ **apps/api**, sao chép `.env.example` thành `.env`, đặt JWT_SECRET random ≥32 ký tự và database URL đúng. Native service của repo dùng `postgresql://fwo@127.0.0.1:55432/fishing_world`; Docker Compose dùng password local ở `.env.example`. Không dùng thông tin local ở production.

Các lệnh sau chạy tại **apps/api**:

```sh
rtk pnpm db:generate
rtk pnpm db:migrate
rtk pnpm db:seed
rtk pnpm dev
```

Seed idempotent tạo 10 loài cá, Hồ Sen, 5 trang bị, 3 mồi, cửa hàng, 3 daily missions và 3 achievements. Nếu đã có active config, seed không ghi đè nội dung đang vận hành. Không seed tài khoản/default admin. HTTP `http://localhost:3001`; liveness `/health`, dependency readiness `/ready`, OpenAPI/Swagger `/docs` ở development. Vite web/admin proxy `/api` cùng origin.

Khôi phục mật khẩu gửi SMTP thật; Mailpit local host127.0.0.1 port51025. Nếu SMTP chưa cấu hình/không hoạt động, API trả503 EMAIL_UNAVAILABLE thay vì báo đã gửi. Link dùng `WEB_ORIGIN/?reset=...`, token hash trong DB, TTL30 phút, một lần dùng. Không log reset URL/token.

## Admin bootstrap

Chỉ sau seed, cung cấp biến môi trường `ADMIN_EMAIL`, `ADMIN_PASSWORD` (8–128 ký tự) và `ADMIN_USERNAME` bằng secret/operator shell, rồi chạy tại **apps/api**:

```sh
rtk pnpm admin:bootstrap
```

Không commit password vào script hay `.env.example`; xóa biến password sau dùng. CLI từ chối khi đã có admin. Quản lý role tiếp theo cần SUPER_ADMIN + nhập lại password qua API và audit; MFA vẫn là gate phải hoàn thiện trước production. Admin ứng dụng riêng ở port5174 dùng cùng auth. Production còn yêu cầu `REDIS_URL`, HTTPS origin whitelist, `PUBLIC_RELEASE_APPROVED=true` sau review thật; một flag không thay thế phê duyệt pháp lý/an toàn.

## Build và kiểm tra

Tại **apps/api**:

```sh
rtk pnpm typecheck
rtk pnpm test
rtk pnpm test:integration
rtk pnpm build
rtk pnpm start
```

`test` chỉ HTTP boundary/unit, không cần DB. `test:integration` yêu cầu DB đã migrate và TEST_DATABASE_URL có database name kết thúc `_test`; suite từ chối app DB, truncate dữ liệu fixture/game config CASCADE trước/sau và giữ `_prisma_migrations`. Không dùng chung test DB với công việc khác. Bộ test chính thức được giữ theo master prompt. Build bundle code workspace thành JS, để external các dependency native/runtime; start không cần chạy TypeScript trực tiếp.

## Dữ liệu và bảo mật

- Mọi mutation kinh tế/fishing/admin/profile cần `Idempotency-Key` UUID; key cùng body trả receipt đã lưu, key đổi body trả409. Thứ tự row locks user UUID ổn định; state version so trước advance simulation.
- Ledger append-only, deferred database trigger kiểm tra `wallet.balance = SUM(ledger.delta)` lúc commit; CHECK không âm; catch/session unique; một session chưa FINISHED/player bằng partial index. Khóa finite stock liên người chơi.
- Engine JSON/config snapshot chỉ trong DB; DTO dùng allowlist. Tick50ms, reel≥250ms, hold hết hạn350ms, CSPRNG Node crypto. Catch settlement atomic với ledger/XP/collection/missions/achievements. `complete` chỉ acknowledge kết quả đã settle.
- Argon2id; accessJWT10 phút trong memory client; opaque refresh cookie7 ngày, absolute30 ngày, token hash/family rotation/reuse detection; cookies secure ở production; HMAC CSRF + exact Origin; logout/reset/revoke serialize với refresh.
- Local rate limit process chỉ dùng phát triển. Production Redis bắt buộc; ip/user limits không dùng email để thay IP budget. Rate limit Redis không fail-open. DB/Redis không public. Production DB role phải không có quyền sửa trigger/schema.
- Config edit tạo immutable version mới + audit. Existing sessions giữ snapshot cũ. Publish kiểm tra FK/identity/starter invariants, không xóa định nghĩa của inventory/collection, không đổi slot/kind trang bị đang tồn tại. Active flags bảo toàn khi sửa mục khác.
- Không có payment, quảng cáo, cashout, client force-win, hoặc endpoint sửa Gold trực tiếp.

Các module có tài liệu riêng: [Auth](src/modules/auth/README.md), [Players/economy](src/modules/players/README.md), [Fishing](src/modules/fishing/README.md), [Admin](src/modules/admin/README.md), [Analytics](src/modules/analytics/README.md). Migration SQL trong `prisma/migrations` là nguồn sự thật cho các constraint Prisma không biểu diễn được.
