# Nhân vật và kinh tế thời trang

Cập nhật 07/11/2026. Triển khai nối trực tiếp tài khoản, inventory, ví và game đang có. Người dùng đã chọn tiếp tục bộ model dựng bằng code hiện tại; không yêu cầu chờ bộ GLB bên ngoài trong đợt này. Chất lượng hình ảnh hiện là 3D cách điệu, chưa phải asset điện ảnh/PBR do nghệ sĩ dựng.

## Phạm vi và file theo phase

| Phase                 | Hành vi và source chính                                                                                                                                                                                                          | Nghiệm thu                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit/data model      | `packages/contracts/src/characters.ts`, `apps/api/prisma/schema.prisma`, migrations 006/007/009/010/011. Một nhân vật chính/account; cosmetic bổ sung vào `user_inventory` hiện có.                                              | Giữ email, Gold, XP và dữ liệu tài khoản khi tạo nhân vật; migrate DB kiểm thử riêng.                                                                |
| Tạo/tùy biến          | `apps/web/src/CharacterPage.tsx`, `character-data.ts`, `character.module.css`, `apps/api/src/modules/characters/service.ts`/`index.ts`. Năm mẫu, giới tính/tuổi, mặt/tóc/râu/da, vóc dáng, dáng câu; lưu có version.             | Tạo thật, reload, validation tên, từ chối món chưa sở hữu, sai slot và stale save.                                                                   |
| Studio                | `packages/ui/src/CharacterPreview.tsx`, `CharacterThumbnail.tsx`, `three/character-studio.ts`, `character-portraits.ts`. Xoay/zoom/góc mặt/toàn thân, ngày/đêm, animation, xuất PNG; sân đình, trúc, đèn lồng và hồ sen 3D.      | Chromium desktop/mobile; thumbnail render từ rig bằng renderer chung có cache.                                                                       |
| Modular outfit        | `packages/ui/src/three/character.ts`. Rig 14 bone, SkinnedMesh cho thân/vạt áo, attachment theo bone; tóc/áo/quần/giày/phụ kiện độc lập.                                                                                         | Model dùng chung trong studio, thumbnail và hồ; hợp nhất các mesh cùng parent/material, giữ riêng bone/đạo cụ.                                       |
| Gameplay/đồng bộ      | `apps/web/src/game/LakeCharacters.tsx`, `LakeScene.ts`, `FishingPage.tsx`, `packages/ui/src/three/lake.ts`. Hiển thị nhân vật đã lưu, tên và thông tin/kỷ lục; pose lấy từ session server.                                       | Hai account nhìn thấy equipment đã lưu; từ chối giả CATCH, lease sai, sequence cũ và di chuyển quá nhanh.                                            |
| Shop/Gold             | `apps/api/src/modules/characters/index.ts`, UI market; entry từ Shop/Inventory. Thử đồ trước mua, lọc slot/rarity/tiền/sở hữu, sort giá/mới nhất/lượt mua thật.                                                                  | Đồng thời/replay tạo đúng một inventory và ledger; sai giá/version bị từ chối.                                                                       |
| Màu/họa tiết          | Appearance có màu từng slot, màu tóc/viền, chất liệu và 8 pattern. Màu wine/lilac/blush và pattern phải sở hữu qua catalog.                                                                                                      | Backend kiểm entitlement cho cả tóc, viền và dye từng slot; không nhận URL texture tùy ý.                                                            |
| Wardrobe/community    | `apps/api/src/modules/characters/fashion.ts`. Lưu/đổi tên/nhân bản/xóa/trang bị/chia sẻ, public/private, like/unlike, follow/unfollow và copy để thử.                                                                            | 10 bộ mặc định; kiểm quyền sở hữu/visibility và stale equip; copy không mua hàng.                                                                    |
| Collection            | Sáu collection seed, từng món mua riêng hoặc mua phần thiếu bằng Gold/Kim cương theo discount server.                                                                                                                            | Khóa collection và cosmetic theo thứ tự, chỉ tính món chưa sở hữu, ledger một lần khi đồng thời mua.                                                 |
| Kim cương/payment     | `service.ts`, `packages/contracts/src/payments.ts`, `apps/api/src/modules/payments/service.ts`, `apps/web/src/payments.tsx`. Ví hiện có thêm balance Kim cương và ledger riêng bất biến; gói DIAMOND qua payment/outbox hiện có. | Signed IPN hợp lệ cấp Kim cương đúng một lần; client return URL không có quyền cấp. Giao dịch mua cosmetic Kim cương/replay được kiểm thử.           |
| Event/pass/membership | `fashion.ts`, `passes.ts`, `apps/web/src/FashionPasses.tsx`. Event snapshot bài dự thi, vote, quà tham gia; season/pass có nhánh miễn phí/premium và tiến độ cá đã lưu. Membership hiệu lực có 20 chỗ wardrobe.                  | Claim một lần; không sửa điều khoản event/pass đã bắt đầu; expiry giữ bộ phối đã lưu, ngăn thêm khi quá capacity.                                    |
| Admin/metrics         | `apps/admin/src/FashionAdminPage.tsx`, route trong `main.tsx`. Tạo/sửa item/collection/event/pass bằng shared JSON editor có validation, reason/audit/version/RBAC; đóng/mở bán, thay giá và tên/mô tả Việt–Anh.                 | API phân quyền và stale version; UI editor/JSON lỗi; Gold/Kim cương nguồn–sink, lượt mua, doanh thu ngày/tháng và paying conversion từ dữ liệu thật. |

Shared component/form/color/i18n được tái sử dụng trong mọi flow. `App.tsx` chuyển account chưa có character sang studio; hủy creation về trang chủ. Các thay đổi simulator, thanh toán, ảnh cá và UI từ phiên làm việc khác được giữ lại.

## Hợp đồng vận hành

- Public DTO/schema canonical nằm trong `packages/contracts/src/characters.ts`, export qua index. Browser không import Prisma/game-config/game-core và không thay đổi tỷ lệ/Gold/XP/cá.
- `GET/PUT /characters/me`; GET `/characters/catalog`, `/inventory/cosmetics`, `/shop/cosmetics`; POST `/shop/cosmetics/orders` nhận ID, currency, expectedPrice và expectedVersion. Các URL trong tài liệu có tiền tố `/api/v1` khi gọi HTTP.
- `/fashion/outfits` và `/:id`, `/:id/equip`, `/:id/like`; `/fashion/players/:id/follow`; `/fashion/collections` và `/order`; `/fashion/events`, `/:id/enter|vote|claim`; `/fashion/passes`, `/:id/enroll|purchase|claim`; `/fashion/wallet`.
- Equip outfit chỉ dành cho chủ bộ phối và yêu cầu `expectedCharacterVersion`. Copy một outfit công khai chỉ sửa bản nháp; save/equip phải qua entitlement server. Mua đồ không tự lưu thay đổi ngoại hình.
- PUT/POST/DELETE economy dùng `Idempotency-Key` UUID, khóa account và ledger/inventory trong transaction hiện có. Admin thay item/collection/event/pass có role, optimistic version và audit before/after. Collection khóa tất cả món trước khi đọc giá.
- Presence: join `/characters/presence`, PATCH cùng lease + sequence tăng, DELETE để rời; GET `/locations/:id/characters`. Lease 15 giây, tối đa 12 account/hồ, heartbeat/poll 2 giây, vận tốc tối đa 3 đơn vị/giây và vùng bờ giới hạn. Animation câu lấy từ session thật; không truyền binary model qua heartbeat. Đây là HTTP presence có nội suy, chưa phải mô phỏng không gian/vật lý nhiều người theo tick mạng.
- Cosmetic chỉ có giá trị ngoại hình. Không gán power/control, không đổi fish/XP/Gold, không ảnh hưởng loot hay độ khó. Khi đang có phiên câu active, save/equip ngoại hình bị chặn để giữ phiên nhất quán.
- Món đã mua và bundle không bị thu hồi khi hết cửa sổ bán. `active=false` ngăn dùng mới; không xóa inventory/ledger/audit cũ. Quà event là quà tham gia công khai sau khi event kết thúc, không phải giải xếp hạng chưa được định nghĩa. Một account một bài và một vote/event, không vote chính mình.
- Pass bắt đầu tính số cá mới sau khi enroll. Nhánh premium chỉ mở sau debit Kim cương; reward cosmetic có grant duy nhất. Có 7 ngày nhận quà sau khi mùa kết thúc. Membership có thời hạn operator công bố; không tự gia hạn. Bộ phối vượt capacity sau hết hạn vẫn đọc/trang bị/sửa/xóa được; chỉ không tạo thêm.
- Bundle tính giá phần còn thiếu theo một loại tiền được hiển thị rõ trên nút mua; bundle trộn loại tiền cần mua từng món. Không tự đổi Gold thành Kim cương hoặc mở checkout khi thiếu tiền.
- Catalog VND có hai gói giá mở đầu đã duyệt: 10.000đ/100 Kim cương và 20.000đ/200 Kim cương; cài mới seed, dữ liệu cũ dùng CLI version/audit. Không seed đơn thanh toán, event hoặc pass giả. Operator tiếp tục quản lý bằng admin có audit. ID tiền Kim cương là `d1a00000-0000-4000-8000-000000000001`, kind `DIAMOND`, quantity là số Kim cương. Payment mặc định disabled; xem [PAYMENTS](PAYMENTS.md) cho merchant/secret/signed IPN.
- Metrics thời trang lấy tổng giá các đơn PAID có dòng DIAMOND: cửa sổ 30 ngày cho total/conversion, 12 tháng UTC cho biểu đồ tháng. Gói trộn Kim cương và trang bị được tính toàn bộ giá gói vào nhóm này; không tách giá doanh thu từng dòng vì order không có phân bổ giá dòng. Gold/Kim cương ledger không phải doanh thu tiền thật; không cộng doanh thu khi chỉ tạo đơn hoặc callback chưa fulfillment.

## Migration và chạy local

Chạy tại thư mục gốc repository:

```sh
rtk proxy pnpm db:generate
rtk proxy pnpm db:migrate
rtk proxy pnpm dev
```

Đợt kiểm thử này chỉ chạy migrate trên database riêng. Đã kiểm tra `prisma migrate status` trên database ứng dụng local: 11 migrations đều up to date; không chạy reset, seed tài khoản hoặc chỉnh dữ liệu ứng dụng trong bước kiểm tra này. 006 thêm nhân vật/cosmetic/equipment/presence, 007 thêm fashion/diamond/outfit/event/collection, 009 nối diamond payment và invariant đối soát, 010 thêm passes, 011 bổ sung metadata và mở rộng period key cho UUID pass. Migration 008 thuộc simulator đang làm đồng thời, không sửa lại migration đó hoặc lịch sử đã áp dụng. Đây là thay đổi bổ sung; không reset/seed lại tài khoản hay sửa ledger cũ.

## Giá và cân bằng

Giá mở đầu là giả thuyết cho local/playtest: màu/họa tiết 10 Gold, phụ kiện 20–40 Gold, kiếm nghi lễ 30 Kim cương, từng phần lễ hội/mùa đông/hoàng gia 50/60/100 Kim cương. Giữ đồ miễn phí cấp 1 và áo/quần đạo sĩ cấp 3; collection theo cấu hình hiện có. [Bảng giá đầy đủ](LAUNCH_PRICING.md) gồm đồ câu, địa điểm và gói nạp. Không chuyển tự động sang thanh toán khi thiếu Gold. Cần đo thời gian mua món đầu, số dư, sink/source, retention/shop revisit và tỷ lệ mua thực theo cohort trước chốt giá. Chưa có dữ liệu để kết luận khả năng sinh lời; client đọc giá server, không hardcode tỷ giá.

## Giới hạn còn lại

- Theo lựa chọn hiện tại, tiếp tục model procedural. Chưa có pipeline upload/quản lý file GLB/PBR, texture vải/tóc/da nghệ thuật, motion capture, facial expression rig, cloth collision hoặc đầy đủ LOD authored. Admin đang tái sử dụng các asset ID đã hỗ trợ; thumbnail/ảnh outfit được render và chụp từ scene. Không có nút upload giả.
- Animation là 16 pose/state có blending trên rig chung; chưa thay thế bằng clip authored cho từng nghề/vũ khí. Chưa chứng minh mọi tổ hợp trang phục trong mọi tư thế không clipping; đặc biệt áo dài khi ngồi/đấu cá cần tiếp tục nghiệm thu trực quan.
- Membership có nhánh cosmetic và capacity 20; chưa có khung tên, discount riêng, quà login hay billing định kỳ. Pass dùng mục tiêu cá mới, chưa có bộ nhiệm vụ mùa độc lập. Event chưa có jury/ranking reward, title/avatar-frame hoặc moderation/report.
- Chưa có bán lại/trade cosmetic; catalog đang dùng trang phục unisex. Chưa có upload ảnh người dùng hoặc feed ảnh lưu trên máy chủ.
- Chưa đo FPS/mobile thật, draw-call budget theo thiết bị, load 12 người, p95 mạng hoặc Redis multi-instance cho presence. Chromium dùng SwiftShader chỉ xác minh flow và render được, không chứng minh hiệu năng GPU.
- Chưa gọi merchant sandbox thật, chưa phát sinh tiền thật, chưa bật production/public release. Các gate pháp lý, merchant và bảo mật hiện có vẫn áp dụng theo cấu hình triển khai.

## Kết quả xác minh

- PostgreSQL: 36/36 integration qua trong lần chạy cuối tuần tự, gồm 11 ca nhân vật/fashion tạm và 25 regression tài khoản/gameplay/payment hiện có. Ca thời trang bao gồm quick equip, version/ownership, Gold/diamond debit/replay, signed payment, event/pass claim, collection Gold/Kim cương đồng thời, rollback thiếu tiền và membership expiry giữ outfit.
- Build web/admin/API thành công. Web/admin còn cảnh báo chunk lớn và annotation từ dependency; không suy ra đạt performance từ build.
- Unit 53/53 (contracts 4, game-core 31, API 18), typecheck toàn workspace, ESLint phạm vi nhân vật/fashion và semantic color lint qua.
- Playwright 4/4 trên Chromium desktop/mobile với production build cố định, API và PostgreSQL riêng: tạo/lưu/reload nhân vật, validation tên và đồ chưa sở hữu, thử/mua đồ, lưu/trang bị outfit, studio ngày/đêm, xem thông tin và hai tài khoản cùng hồ với model/tên hiển thị; admin đăng nhập, JSON lỗi tại field, lưu metadata và xem metrics. Không có pageerror hoặc lỗi THREE trong các ca này. Chưa nghiệm thu Safari/thiết bị thật hoặc hiệu năng GPU.
- Ca test/task-only, ảnh/trace/build preview và database `_test` của đợt này được dọn sau xác minh; giữ test suite đã có và artifact/DB của công việc khác.
