---
name: fwo-verification
description: Select and run focused Fishing World Online checks, preserve required regression tests, isolate test databases and clean one-off verification artifacts without touching application records or unrelated changes.
---

# Xác minh đúng thay đổi và dọn đúng tài nguyên

Lệnh dưới đây chạy từ thư mục gốc repository. Đọc [package.json](../../../package.json), [test plan](../../../docs/TEST_PLAN.md) và module README để dùng script hiện hành; không tự suy tính năng đã hoàn tất từ build pass.

| Thay đổi                                 | Kiểm tra phù hợp                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| UI/types                                 | `rtk proxy pnpm --filter @fwo/web typecheck` hoặc `@fwo/admin`, build app khi bundle/runtime bị ảnh hưởng                         |
| Màu/đồ họa 3D                            | `rtk proxy pnpm lint:colors` hoặc `rtk proxy node infrastructure/scripts/lint-colors.mjs`, xem trực tiếp state/viewport liên quan |
| Luật/schema/engine                       | Test package tương ứng, ví dụ `rtk proxy pnpm --filter @fwo/game-core test`                                                       |
| Auth/economy/DB/concurrency              | `rtk proxy pnpm test:integration` với database integration riêng                                                                  |
| Luồng người dùng hoặc shared interaction | `rtk proxy pnpm test:e2e`; có thể lọc file/project khi xác minh hẹp                                                               |
| Trước bàn giao rộng                      | Lint/typecheck/tests/build cần thiết cho phạm vi; không lặp lại toàn bộ nếu không có thay đổi hoặc vấn đề mới                     |

- Test logic quan trọng/regression được yêu cầu trong master prompt là sản phẩm và được giữ lại, gồm [engine tests](../../../packages/game-core/src/index.test.ts), [API tests](../../../apps/api/test) và [Playwright tests](../../../tests/e2e). Không xóa chúng theo quy tắc dọn test tạm.
- Test/helper một lần, trace, screenshot, log, output và process dựng chỉ để kiểm chứng phải dọn sau khi đọc kết quả. Không xóa screenshot/artifact người dùng yêu cầu giữ. Trước sửa test có sẵn, phân biệt nội dung/staging ban đầu và sửa ngoài phạm vi.
- Database kiểm thử phải tách riêng và có tên kết thúc `_test`. Dùng [test-database helper](../../../infrastructure/scripts/test-database.mjs) và [E2E environment](../../../infrastructure/scripts/e2e-environment.mjs); kiểm tra guard trước create/migrate/drop/bootstrap quyền. Không chạy fixture/promote/cleanup trên application DB.
- Dùng `rtk proxy pnpm test:db:cleanup` khi kết thúc kiểm chứng và không còn run khác dùng database đó. Dừng đúng process do task tạo; giữ DB/process người dùng đang dùng. Cleanup không bao gồm application records, ledger hoặc audit history.
- Playwright dùng API/web/admin test ports theo [config](../../../playwright.config.ts). Không chạy hai suite tranh cùng port/database. Không vô hiệu hóa rate limit, deadline, server authority hoặc dùng force/repeated click để che lỗi người chơi thật.
- Khi đọc trace/network, chỉ xuất thông tin cần thiết như method/path/status/timing; không in cookie, bearer token, password, URL có token hoặc toàn bộ request headers.
- Thất bại phải được phân biệt là bug, môi trường hoặc thiếu điều kiện. Sửa nguyên nhân, chạy lại ca liên quan, rồi báo chính xác số pass/fail và phần chưa được xác minh. Không tăng kiểm thử chỉ để tạo thêm activity khi bằng chứng đã đủ.

Tài liệu test và kết quả bàn giao phải nhất quán với code thực thi; không viết production-ready, đạt accessibility hoặc đủ tải khi chưa đo tương ứng.
