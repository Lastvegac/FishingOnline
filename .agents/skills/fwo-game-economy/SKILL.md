---
name: fwo-game-economy
description: Safely change Fishing World Online fishing rules, rewards, Gold, inventory, shop, missions or published configuration while preserving server authority, immutable ledgers, idempotency and session snapshots.
---

# Gameplay và economy có thẩm quyền ở server

Đọc code liên quan: [engine](../../../packages/game-core/src/index.ts), [server config](../../../packages/game-config/src/index.ts), [fishing orchestration](../../../apps/api/src/modules/fishing/index.ts), [transaction/ledger](../../../apps/api/src/lib/transaction.ts) và [Prisma schema](../../../apps/api/prisma/schema.prisma). [GDD](../../../docs/GAME_DESIGN.md) chứa mục tiêu cân bằng; constants/schema thực thi là nguồn behavior hiện tại.

- Client gửi cast/hook/hold/release/complete với expectedVersion và idempotency key. Server quyết định cá, trọng lượng, xác suất, Gold, XP và điều kiện claim. Public DTO không lộ seed, hidden bite time, pool weights hoặc reward bí mật trước kết quả hợp lệ.
- Giữ một phiên câu active/player, state transition hợp lệ, server clock, reel spacing và hold TTL theo engine. Không dùng frame count hoặc client timestamp để tính thưởng. `complete` là xác nhận kết thúc, không được trả thưởng thêm lần nữa.
- Reward settlement, inventory, XP/collection/mission progression và ledger liên quan phải commit nhất quán trong transaction. Dùng locking/idempotency helpers có sẵn để chống replay và concurrent duplicate claim/order/catch; không chỉ kiểm tra trước rồi update ngoài transaction.
- Gold dùng số nguyên/BigInt ở server và decimal string trong DTO; không dùng floating-point để ghi số dư. Mọi nguồn/sink có ledger bất biến cùng lý do/source/idempotency; không sửa số dư trực tiếp để bỏ qua lịch sử.
- Phiên giữ config snapshot/version tại lúc bắt đầu. Publish hoặc patch không viết lại phiên cũ. Admin writes cần role check, schema validation, optimistic version và audit; giữ các định nghĩa đã được catch/inventory tham chiếu.
- Giữ starter/free-lake và đường cứu trợ hợp lệ để người mới không mắc kẹt vì hết mồi. Không đổi giá/tỷ lệ/nội dung ngoài yêu cầu chỉ để làm test dễ pass. Các số cân bằng mới phải được ghi là giả thuyết và đo theo cohort.
- MVP chỉ Gold. Không thêm tiền thật, betting, trade/cash-out, premium hoặc ad SDK khi task không cho phép. Không diễn giải không thanh toán thành miễn nghĩa vụ pháp lý.

Kiểm tra invariants bằng [unit engine](../../../packages/game-core/src/index.test.ts), [API integration](../../../apps/api/test/integration.test.ts) và E2E khi luồng người chơi đổi. Ca kiểm tra cần bao gồm replay/concurrent duplicate, reward/ledger một lần và config snapshot khi chúng bị ảnh hưởng; giữ test cốt lõi này theo yêu cầu sản phẩm.
