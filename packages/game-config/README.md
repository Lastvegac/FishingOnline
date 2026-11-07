# @fwo/game-config

Danh mục server-only: 10 loài cá, Hồ Sen, 3 cần + dây/lưỡi, 3 mồi, 5 shop listings, 3 daily missions, 3 thành tích. UUID cố định cho seed/idempotent upsert. `DEFAULT_CONFIG` là bootstrap; API lưu và publish phiên bản trong DB, snapshot khi tạo phiên. Không sửa phiên đang chạy theo config mới.

`gameConfigSchema` kiểm tra bounds, uniqueness, FK dữ liệu, pool hồ khác rỗng và kind/slot. `toPublicFish`/`toPublicLocation` xuất whitelist; browser chỉ import `@fwo/contracts`, không import package này. Economy dùng gram/int và Gold string; giá trị là balance thử nghiệm trong GDD.

Publish phải giữ bộ ROD/LINE/HOOK cấp1, worm cấp1, ít nhất một hồ miễn phí cấp1 có cá Common difficulty≤25 và gói10giun giá30Gold cấp1. Giá gói giun hiện là invariant của chính sách cứu trợ `<30Gold`; muốn đổi giá phải đổi đồng bộ policy/rescue/UI/test trước, không chỉ sửa riêng shop.

Từ thư mục `/Users/hanguyen/Downloads/fishing-world-online`: `rtk pnpm --filter @fwo/game-config typecheck`. Test config nằm cùng server game-core suite để kiểm tra selection và public projection.
