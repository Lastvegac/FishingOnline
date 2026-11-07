# Fishing World Online — hướng dẫn làm việc

Đọc hướng dẫn này trước khi sửa dự án. Quyết định và phạm vi người dùng đã chốt trong phiên hiện tại được ưu tiên; hoàn tất công việc được giao, không tự mở rộng thành refactor toàn dự án hoặc thêm bước xin phép không cần thiết.

## Chọn skill theo công việc

Chỉ đọc các skill có liên quan. Skill nằm ngay trong repository, không cần cài global hoặc truy cập project khác.

| Khi thực hiện                                                         | Skill cần dùng                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Thêm/sửa UI, state, dialog hoặc tương tác ở web/admin                 | [fwo-ui-components](.agents/skills/fwo-ui-components/SKILL.md)           |
| Sửa màu, theme hoặc artwork/cảnh 3D (Three.js)                        | [fwo-ui-colors](.agents/skills/fwo-ui-colors/SKILL.md)                   |
| Thêm/sửa input, form, ràng buộc hoặc thông báo validation             | [fwo-form-validation](.agents/skills/fwo-form-validation/SKILL.md)       |
| Thêm module, đổi imports, di chuyển logic hoặc thiết kế ranh giới     | [fwo-feature-boundaries](.agents/skills/fwo-feature-boundaries/SKILL.md) |
| Sửa gameplay, phần thưởng, Gold, inventory, shop, mission hoặc config | [fwo-game-economy](.agents/skills/fwo-game-economy/SKILL.md)             |
| Chọn/chạy kiểm tra, thêm test hoặc dọn dữ liệu/artifact kiểm thử      | [fwo-verification](.agents/skills/fwo-verification/SKILL.md)             |

## Ràng buộc dự án

- Dùng **pnpm**, không dùng npm/yarn. Mọi shell command có tiền tố `rtk`; dùng `rtk proxy pnpm ...` khi cần giữ nguyên filter/output. Ghi rõ thư mục chạy lệnh; mặc định là thư mục gốc chứa file này. Tìm bằng `rg`/`rg --files` trước.
- Giữ stack đã chốt: React/TypeScript/Vite/Three.js cho cảnh game, Zustand cho UI/auth, TanStack Query cho API; Fastify/Zod/Prisma/PostgreSQL/Redis ở backend. Theo yêu cầu người dùng, thẻ và chi tiết cá dùng **ảnh chụp cá thật đẹp, khỏe, vây nguyên vẹn** qua `FishArt`; không thay bằng model 3D hoặc ảnh sinh bằng AI. Trang bị và cảnh game vẫn 3D, không thêm SVG/Phaser. Giữ modular monolith; chỉ mở rộng kiến trúc khi task và dữ liệu tải thực tế yêu cầu.
- UI dùng export của [packages/ui](packages/ui/src/index.tsx), semantic tokens trong [tokens.css](packages/ui/src/tokens.css), form behavior trong [forms.tsx](packages/ui/src/forms.tsx). Không dựng control/field/dialog lookalike tại feature khi shared component đã phù hợp.
- UI hướng tới thị trường global: chuỗi mới/sửa phải qua catalog i18n Việt–Anh trong `packages/ui/src/i18n`, dùng `useI18n`/`t`, `localeTag` và `LanguageSelector` dùng chung theo [I18N](docs/I18N.md). Áp dụng cả placeholder, nhãn truy cập, validation, dialog và trạng thái lỗi; dùng tham số cho câu có dữ liệu, không hardcode tiếng Việt hoặc nối các mảnh câu. Cơ chế theo POSORA: typed keys, fallback tiếng Việt, lưu lựa chọn và đồng bộ tab cùng origin; không import repository POSORA.
- Schema/DTO công khai thuộc [packages/contracts](packages/contracts/src/index.ts). `game-config` và `game-core` là server-only; browser không quyết định cá, trọng lượng, tỷ lệ, Gold, XP hoặc phần thưởng.
- Mọi thay đổi ví phải có ledger trong transaction, idempotency và kiểm tra quyền/trạng thái. Snapshot cấu hình của phiên đang chạy không bị thay bằng cấu hình vừa publish. Không sửa/xóa ledger hay audit cũ để che thay đổi.
- MVP Gold-only: không cash-out, betting, giao dịch giữa người chơi hoặc thanh toán/quảng cáo thật ngoài phạm vi đã được người dùng chấp thuận và rà soát pháp lý tương ứng.
- Mật khẩu mới tối thiểu **8**, tối đa **128** ký tự; input không hợp lệ phải có viền đỏ và thông báo tại field. Required mark, màu lỗi và xử lý submit dùng shared layer.
- Kiểm tra phù hợp trước khi báo hoàn tất; nêu file thay đổi, kết quả kiểm tra và giới hạn còn lại. Cập nhật tài liệu/tiêu chí nghiệm thu khi behavior hoặc contract đổi. Không coi source code mới viết là tính năng đã xác minh.
- Giữ các test cốt lõi được yêu cầu trong [master test plan](docs/TEST_PLAN.md). Dọn test/helper một lần, database `_test` và artifact tạm theo skill verification; giữ dữ liệu ứng dụng, audit history và thay đổi không liên quan.
- Trước commit/push, đối chiếu project, remote/SSH và author/committer với chỉ định Git identity hiện hành của người dùng. Dùng cấu hình repository-local, không sửa global identity. Không commit/push nếu task chưa yêu cầu.

## Git identity của dự án

- Fishing World Online thuộc GitHub account **Lastvegac**. Remote `origin` dùng `git@github-lastvegac:Lastvegac/FishingOnline.git` cho fetch/push.
- Git author và committer dùng repository-local identity `Lastvegac <42823160+Lastvegac@users.noreply.github.com>`; không sửa global company identity.
- Trước commit/push, kiểm tra remote, SSH account và cả author/committer theo quy tắc trên. Chỉ commit/push khi người dùng yêu cầu.

## Nguồn triển khai

Đọc [README](README.md) để chạy local, [hợp đồng tích hợp](docs/IMPLEMENTATION_CONTRACT.md) khi nối frontend/backend, [kiến trúc](docs/ARCHITECTURE.md) khi đổi ranh giới, và tài liệu module gần code đang sửa. Cập nhật [PROJECT_STATUS](PROJECT_STATUS.md), [CHANGELOG](CHANGELOG.md) và [TODO](TODO.md) khi phạm vi công việc tác động trạng thái bàn giao.
