---
name: fwo-feature-boundaries
description: Keep Fishing World Online modules and package imports isolated when adding features, moving logic or changing contracts, while preserving the existing modular monolith and avoiding unnecessary abstractions.
---

# Ranh giới theo trách nhiệm, không theo số lượng thư mục

Đối chiếu [kiến trúc](../../../docs/ARCHITECTURE.md), [hợp đồng tích hợp](../../../docs/IMPLEMENTATION_CONTRACT.md) và code hiện tại trước khi đổi cấu trúc. Giữ modular monolith; không tự tách microservice, thêm event bus hoặc dựng layer mới chỉ để khớp sơ đồ lý thuyết.

| Vị trí                                                             | Sở hữu                                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| [apps/web](../../../apps/web/src)                                  | Giao diện người chơi, query orchestration, adapter snapshot → cảnh 3D/input                                                |
| [apps/admin](../../../apps/admin/src)                              | Giao diện vận hành và editor theo quyền, không tự cấp quyền                                                                |
| [apps/api/src/modules](../../../apps/api/src/modules)              | Module backend; `players` hiện gom profile/inventory/wallet/shop/missions, không bắt buộc tách mỗi route thành một package |
| [packages/ui](../../../packages/ui/src)                            | Primitives, tokens, form behavior, artwork/cảnh 3D (Three.js) và transport không chứa luật game                            |
| [packages/contracts](../../../packages/contracts/src/index.ts)     | DTO/schema công khai dùng chung; chỉ xuất dữ liệu browser được phép thấy                                                   |
| [packages/game-core](../../../packages/game-core/src/index.ts)     | Engine/rules thuần, server-only                                                                                            |
| [packages/game-config](../../../packages/game-config/src/index.ts) | Spawn/reward/equipment/config chuẩn, server-only                                                                           |
| [apps/api/prisma](../../../apps/api/prisma)                        | Schema và migration thực thi; schema trong docs chỉ là tài liệu                                                            |

- Browser không import API internals, Prisma, `game-core` hoặc `game-config`. Không import component từ app khác; chuyển tương tác dùng chung phù hợp vào `packages/ui`.
- Khi DTO đổi, sửa canonical contract và các producer/consumer cần thiết trong cùng task; cập nhật tài liệu và test liên quan. Không copy interface rồi để hai bản trôi khác nhau.
- Giữ business rules trong service/engine, query validation tại boundary và DB invariant trong transaction/schema. React không cộng reward hoặc suy trạng thái authoritative.
- Reuse module helper có sẵn, nhưng không biến shared package thành nơi chứa mọi tiện ích. Thêm abstraction khi có trách nhiệm rõ hoặc lặp thật, không dự đoán nhu cầu hàng chục feature.
- Khi nhiều người/agent cùng sửa, xác định ownership, báo contract đổi và không revert thay đổi ngoài phạm vi. Không coi skill là quyền sửa file liên quan xa hoặc đổi kiến trúc đã chốt.

Chạy typecheck/build đúng producer và consumer; thêm integration test khi behavior xuyên ranh giới thay đổi. Chỉ cập nhật status/docs phản ánh behavior đã xác minh.
