---
name: fwo-ui-colors
description: Apply the approved Fishing World Online color palette and semantic tokens to CSS, React and the Three.js 3D scenes/models, and verify that no feature introduces raw or undefined colors.
---

# Một nguồn màu cho DOM và đồ họa 3D

[tokens.css](../../../packages/ui/src/tokens.css) chứa đầy đủ palette do người dùng cung cấp và alias semantic của dự án. Đây là nguồn local duy nhất; không import/copy từ project POSORA hoặc thêm dependency tới repository khác.

- Feature/shared styles dùng `var(--color-…)` theo vai trò: text, muted, surface, page, border, primary/on-primary, error/error-text, success hoặc rarity/scene/art. Không dùng tên palette chỉ vì hiện tại trùng màu mong muốn.
- Màu nền/nút chính dùng `--color-primary`; chữ trên nền chính dùng `--color-on-primary`. Chữ/icon nhấn trên nền sáng dùng `--color-primary-text`, tránh chữ vàng khó đọc.
- Lỗi validation, required mark và invalid border dùng các token `--color-error*`; giữ vai trò chữ lỗi đọc được qua `--color-error-text`. Không tạo màu đỏ riêng cho từng form.
- Token semantic còn thiếu được thêm tại `tokens.css` bằng alias tới palette đã chốt, không thêm hex/RGB mới hoặc định nghĩa lại palette tại feature. Dùng `transparent`, `currentColor`, opacity hoặc `color-mix` khi phù hợp.
- Đồ họa game là 3D (Three.js trong [packages/ui/src/three](../../../packages/ui/src/three)). Material/light lấy màu qua [colors.ts](../../../packages/ui/src/colors.ts) (`getCanvasPalette`, `readCanvasColor`) hoặc `tokenColor`/`cssVarColor` trong `three/core.ts`; không đặt literal màu hoặc số màu tại scene/model. Icon UI (lucide) vẫn dùng `currentColor`.
- Asset SVG/HTML tĩnh không thể nhận CSS phải dùng đúng cơ chế annotated palette copy mà [color linter](../../../infrastructure/scripts/lint-colors.mjs) hỗ trợ. Không thêm ngoại lệ linter để bỏ qua màu tùy ý.

Từ thư mục gốc, chạy `rtk proxy pnpm lint:colors` nếu script đã có trong [package.json](../../../package.json); lệnh trực tiếp tương đương là `rtk proxy node infrastructure/scripts/lint-colors.mjs`. Linter kiểm tra raw/named colors, token thiếu và màu canvas, nhưng không chứng minh contrast hoặc sự dễ đọc. Xem trực tiếp trạng thái lỗi/disabled, cảnh game và màn nhỏ khi các vai trò đó bị sửa.
