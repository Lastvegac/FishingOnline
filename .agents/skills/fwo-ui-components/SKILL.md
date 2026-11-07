---
name: fwo-ui-components
description: Build or change Fishing World Online web/admin UI by reusing shared components, interactions and layout primitives, including loading, empty, error and modal states.
---

# Tái sử dụng UI của Fishing World Online

Trước khi chọn control, đọc [shared exports](../../../packages/ui/src/index.tsx), [shared styles](../../../packages/ui/src/styles.css) và một màn gần nhất có cùng tương tác trong [web](../../../apps/web/src) hoặc [admin](../../../apps/admin/src). Không dùng nội dung kế hoạch cũ để đoán API component hiện tại.

- Dùng `Button`/`IconButton` cho action; `FormField`, `Input`, `PasswordInput`, `Select`, `Textarea`, `Checkbox` cho field; `Modal` cho dialog; `BottomActions` cho nhóm action cuối. Dùng `LoadingState`, `EmptyState`, `ErrorState`, `Notice` và toast đúng mục đích, kể cả nested flow.
- Một field gồm label, giá trị, help/error, trạng thái và tương tác phải được tái sử dụng trọn vẹn. Nếu thiếu option, mở rộng shared component tương thích; chỉ tạo component mới sau khi kiểm tra lựa chọn có sẵn. Không tách từng div thành abstraction không có ích.
- Business/API/permission logic ở app feature. Shared presentation không import ngược web/admin hoặc business module của API. TanStack Query giữ server data; Zustand chỉ giữ UI/auth; không tạo dữ liệu game giả trong component.
- Giữ `Modal` focus/restore/Escape và action loading/disabled. Một action quan trọng không được chỉ tồn tại trong tooltip. Dùng một `BottomActions` để không nhân đôi safe-area/padding.
- Mobile/tablet có icon-only navigation phải giữ accessible name. Chọn layout cho text dài, keyboard/zoom và vùng chạm; không che control bởi canvas hoặc footer.
- Chuỗi UI, placeholder, accessible name và lỗi mới/sửa dùng catalog i18n Việt–Anh và `useI18n`/`t` của `@fwo/ui`; format qua `localeTag`, chọn ngôn ngữ bằng `LanguageSelector`. Không nối câu dịch từ nhiều mảnh; xem [quy ước i18n](../../../docs/I18N.md).
- Cá, trang bị và hồ là model 3D qua `FishArt`, `EquipmentArt`, `LakeArt` (web bọc trong `apps/web/src/art.tsx` để theo tùy chọn giảm chuyển động). Lưới dùng ảnh render từ một WebGL context chung; chỉ view chi tiết dùng `live` (turntable). Cảnh câu (`createLakeWorld`) render từng frame ngoài React; React chỉ đẩy snapshot/trạng thái công khai.

Khi task có màu hoặc input, áp dụng thêm [màu semantic](../fwo-ui-colors/SKILL.md) hoặc [validation](../fwo-form-validation/SKILL.md). Kiểm tra màn được sửa ở loading/empty/error/populated và dialog phát sinh; không mở rộng kiểm thử sang flow không bị ảnh hưởng khi đã có đủ bằng chứng.

Từ thư mục gốc repository, chạy typecheck của app bị ảnh hưởng, ví dụ `rtk proxy pnpm --filter @fwo/web typecheck`; chọn kiểm tra tương tác theo [verification](../fwo-verification/SKILL.md).
