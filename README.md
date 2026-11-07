# Fishing World Online

Web/admin hỗ trợ chuyển giao diện Việt–Anh bằng selector ngôn ngữ, lưu trên trình duyệt. Xem [quy ước i18n và phạm vi bản dịch](docs/I18N.md) khi thêm UI hoặc locale.

Game câu cá 3D bằng Three.js, có tài khoản, tiến trình lưu PostgreSQL và giao diện desktop/mobile Việt–Anh. Phiên bản hiện tại là **bản mô phỏng chạy local** với 6 điểm câu, 37 loài, chọn hướng/lực/tầng nước, quan sát cá kiểm mồi và điều khiển drag/hướng cần khi đấu cá. Gold dùng trong game; chưa phát hành ra Internet. Xem [phạm vi và nghiệm thu simulator](docs/SIMULATOR.md).

## Chạy ứng dụng

Thực hiện các lệnh dưới đây tại **workspace root** (máy hiện tại: `/Users/hanguyen/Downloads/fishing-world-online`). Cần Node 22.13+ (đã kiểm bằng 22.23), pnpm 10 và Docker hoặc PostgreSQL tools. Quy ước terminal của workspace dùng tiền tố `rtk proxy`; trên máy không dùng RTK có thể bỏ hai từ đó.

```sh
rtk proxy pnpm install --frozen-lockfile
rtk proxy cp apps/api/.env.example apps/api/.env
```

Sửa `apps/api/.env`: đặt `JWT_SECRET` ngẫu nhiên ít nhất 32 ký tự, giữ origins local. File này được bỏ qua khi chia sẻ source. Không dùng giá trị `replace-...` làm secret.

**Cách 1 — Docker cho dịch vụ:**

```sh
rtk proxy pnpm infra:up
```

Dùng DATABASE_URL trong `.env.example`, bật `REDIS_URL=redis://127.0.0.1:56379`. Mailpit nhận email ở SMTP51025, xem thư tại http://127.0.0.1:58025. Docker daemon cần đang chạy.

**Cách 2 — PostgreSQL cài sẵn:**

```sh
rtk proxy pnpm services:local start
```

Script tạo cluster riêng `.local/postgres`, chỉ bind localhost55432; đặt `DATABASE_URL=postgresql://fwo@127.0.0.1:55432/fishing_world`. Không chạy cùng lúc với Postgres Docker dùng cổng này. Bỏ trống REDIS_URL cho phát triển một process; production bắt buộc Redis. Reset mật khẩu cần SMTP đang hoạt động.

Sau khi cơ sở dữ liệu sẵn sàng:

```sh
rtk proxy pnpm db:generate
rtk proxy pnpm db:migrate
rtk proxy pnpm db:seed
rtk proxy pnpm dev
```

- Game: http://localhost:5173
- Admin: http://localhost:5174
- API: http://localhost:3001/health · readiness `/ready` · Swagger `/docs`

Đăng ký tài khoản mới để nhận 200 Gold, 20 giun và bộ cần/dây/lưỡi cơ bản. Chọn **Ra hồ**, chỉnh hướng/lực/tầng nước rồi **Thả câu**. Cá có thể kiểm tra hoặc bỏ mồi; **Giật cần** khi có tín hiệu cắn thật, giật sớm có thể mất cá. Giữ nút/Space để thu dây, nhả để giảm căng, chỉnh drag và hướng cần đối lực cá. Máy chủ quyết định cá, trọng lượng, chiều dài và phần thưởng; kết quả được lưu trước khi hiển thị. Cá mới vào giỏ, Gold chỉ cộng khi xác nhận đổi cá.

Dừng app bằng Ctrl+C. Dừng dịch vụ native bằng `rtk proxy pnpm services:local stop`, hoặc Docker bằng `rtk proxy pnpm infra:down`. Dữ liệu ứng dụng được giữ lại.

## Tài khoản quản trị

Seed không tạo tài khoản hay mật khẩu mặc định. Đặt tạm `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (8–128 ký tự) trong môi trường CLI hoặc `.env`, rồi chạy tại root:

```sh
rtk proxy pnpm --filter @fwo/api admin:bootstrap
```

Xóa ADMIN_PASSWORD sau bootstrap. Đăng nhập tài khoản đó ở cổng5174. Dashboard có số liệu, quản lý nội dung, người chơi, cấu hình phiên bản và audit; quyền thực tế được kiểm tra trên server. Không cấp quyền admin từ màn đăng ký.

## Tính năng đã triển khai

- Đổi cá mới trong **Túi đồ → Giỏ cá** sang Gold để mua vật phẩm ở tiệm: mức thử nghiệm 10% thưởng cơ sở (1–100 Gold/con), tối đa 100 Gold/ngày Việt Nam. XP/bộ sưu tập ghi ngay khi bắt; cá/phiên legacy đã nhận thưởng tự động không được đổi thêm. Cần chạy `pnpm db:migrate` cho migration fish exchange khi cập nhật local. Hiện chỉ đổi vật phẩm trong game, chưa có doanh thu hoặc quà thật.

- Đăng ký bằng email/số điện thoại (OTP) hoặc Google; đổi tên/avatar cần OTP, email không đổi được. Local: đặt `OTP_DEV_OUTBOX=true` để xem mã tại `/api/v1/dev/otp-outbox?to=...` khi chưa có SMTP/SMS.
- Landing, đăng ký/đăng nhập, refresh cookie, đăng xuất, reset mật khẩu qua SMTP, quản lý phiên.
- Sảnh, 6 điểm câu với pool cá/shop riêng, điều kiện nước/thời tiết/ngày đêm mô phỏng và cảnh 3D có sóng, gió, mưa/sương, cá bơi; lựa chọn mồi, casting, bite/hook, đấu cá theo loài và khôi phục phiên.
- Profile/avatar, XP/cấp độ, trang bị, nâng cấp cần, shop Gold, lịch sử ví, cứu trợ mồi theo ngày.
- Bộ sưu tập 37 loài, chiều dài và hồ sơ kỷ lục (địa điểm, ngày, mồi, cần), daily missions theo ngày Việt Nam, thành tích và bảng xếp hạng.
- Chat tại điểm câu, chia sẻ cá đã bắt và xếp hạng cá lớn theo tuần; không nhận kết quả tự khai từ client. Phần simulator không có giải đấu đăng ký/phần thưởng hay thách đấu cược.
- Admin RBAC, chỉnh nội dung/cấu hình không redeploy, snapshot cho phiên đang chơi, audit và analytics cơ bản.
- PostgreSQL migration/seed, ledger bất biến, idempotency, version checks, validation, rate limit và logging.

## Cấu trúc và kiểm tra

`apps/web` và `apps/admin` dùng React/TypeScript/Vite, TanStack Query, Zustand và shared `packages/ui`; Three.js được tải riêng (lazy chunk) khi trang cần đồ họa 3D. `apps/api` là Fastify modular monolith với Prisma7/PostgreSQL. `packages/contracts`, `game-config`, `game-core` tách hợp đồng, cấu hình server và engine. Không import cấu hình xác suất server vào browser.

```sh
rtk proxy pnpm lint
rtk proxy pnpm typecheck
rtk proxy pnpm test
rtk proxy pnpm test:integration
rtk proxy pnpm build
rtk proxy pnpm test:e2e
```

Integration cần TEST_DATABASE_URL trỏ database riêng `fishing_world_*test`; lệnh root tự tạo/migrate/seed database test nếu chưa có; E2E dùng E2E_DATABASE_URL, mặc định `fishing_world_e2e_test` trên localhost55432 và tự migrate/seed. Cài browser lần đầu bằng `rtk proxy pnpm exec playwright install chromium`. Không trỏ kiểm thử vào database ứng dụng. Kết quả xác minh thực tế và giới hạn ở [PROJECT_STATUS](PROJECT_STATUS.md).

## Tài liệu

Hướng dẫn cho agent nằm trong [AGENTS.md](AGENTS.md), gồm sáu skill local về tái sử dụng component, màu semantic, validation, ranh giới module, gameplay/economy và kiểm thử. Các skill dùng source trong repo, không phụ thuộc workspace POSORA.

| Nội dung                                | Tài liệu                                                                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hợp đồng runtime và quyết định tích hợp | [IMPLEMENTATION_CONTRACT](docs/IMPLEMENTATION_CONTRACT.md)                                                                                           |
| Mô phỏng, các phase và giới hạn         | [SIMULATOR](docs/SIMULATOR.md)                                                                                                                       |
| Product, gameplay, UI                   | [PRD](docs/PRD.md), [GAME_DESIGN](docs/GAME_DESIGN.md), [UI_UX](docs/UI_UX.md)                                                                       |
| Kiến trúc, database, API                | [ARCHITECTURE](docs/ARCHITECTURE.md), [DATABASE](docs/DATABASE.md), [API](docs/API.md)                                                               |
| Vận hành và bảo mật                     | [DEPLOYMENT](docs/DEPLOYMENT.md), [SECURITY](docs/SECURITY.md), [TEST_PLAN](docs/TEST_PLAN.md)                                                       |
| Asset và giấy phép                      | [ASSETS](docs/ASSETS.md)                                                                                                                             |
| Lộ trình và công việc còn lại           | [ROADMAP](docs/ROADMAP.md), [BACKLOG](docs/BACKLOG.md), [TODO](TODO.md)                                                                              |
| Pháp lý, kinh doanh, marketing          | [LEGAL](docs/LEGAL.md), [MONETIZATION](docs/MONETIZATION.md), [MARKETING](docs/MARKETING.md)                                                         |
| Hồ sơ Discovery ban đầu                 | [DISCOVERY](docs/DISCOVERY.md), [COMPETITORS](docs/COMPETITORS.md), [RISK_REGISTER](docs/RISK_REGISTER.md), [AGENT_WORKFLOW](docs/AGENT_WORKFLOW.md) |

MVP local chưa đồng nghĩa sẵn sàng public: còn playtest/cân bằng, đo tải và thiết bị thật, staging/TLS/domain, email vận hành, backup offsite/WAL/restore, giám sát và rà soát pháp lý/định danh/tuổi/thời gian chơi. Docker/CI đã có cấu hình; việc provision và deployment cần môi trường vận hành thực tế. Gold không đổi tiền/vật thật; module thanh toán MoMo/VNPay/thẻ qua VNPay đã có nhưng mặc định tắt, chưa kết nối merchant; premium/ads/trading/cash-out chưa bật. Hướng dẫn tích hợp, API, migration và sandbox: [PAYMENTS](docs/PAYMENTS.md).

Nhân vật và thời trang: [CHARACTER_FASHION](docs/CHARACTER_FASHION.md) mô tả studio/wardrobe/Gold–Kim cương/events/passes/admin, migrations và giới hạn hình ảnh hiện tại. Tiếp tục bộ model procedural theo lựa chọn người dùng; cần migrate database local khi cập nhật, payment thật vẫn tắt mặc định.

Giá mở đầu: [bảng giá đầy đủ theo cấp](docs/LAUNCH_PRICING.md). Đồ câu/mồi dùng Gold kiếm trong game; cosmetic có đường miễn phí và mức 10–40 Gold hoặc 30–100 Kim cương/món. Hai gói nạp niêm yết 10.000đ/100 Kim cương và 20.000đ/200 Kim cương; chưa mở thanh toán thật. Local đã công bố cấu hình v3; database đã có cấu hình dùng `pricing:launch` preview/apply, không dùng seed để ghi đè giá admin.
