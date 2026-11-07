# @fwo/ui

Shared presentation primitives và design tokens cho web/admin. Export TypeScript trực tiếp, consumers Vite biên dịch. [src/tokens.css](src/tokens.css) chứa palette POSORA đã được người dùng cung cấp và alias semantic; [src/styles.css](src/styles.css) chứa styles, spacing/radius. Màn hình dùng CSS Modules và tái sử dụng export trước khi thêm component.

Button/IconButton, Card, Badge/RarityBadge, Form/FormError/FormField/Input/PasswordInput/Checkbox/Select/Textarea, Modal/BottomActions, Notice/ToastProvider, EmptyState/LoadingState/ErrorState, Tabs/Toggle, Progress, CurrencyAmount, FishArt/EquipmentArt/LakeArt. Modal dùng native dialog với focus-trap, Escape và khôi phục focus. CSS có focus-visible, reduced-motion và safe-area.

[src/forms.tsx](src/forms.tsx) kiểm tra native constraints khi submit/blur, focus ô lỗi đầu tiên và hiển thị viền đỏ cùng lỗi inline. Đặt `name` trùng request key; `Form` nhận mutation error và `FormError` hiển thị lỗi form-wide. `ApiError.fields` giữ lỗi từ server theo field, kể cả nested path; sửa input sẽ xóa lỗi server của field đó. Nút footer ngoài form dùng `type="submit" form={formId}`.

`createApiClient` là transport không chứa business rule: bearer trong closure, credentials, CSRF, refresh singleflight, typed API errors và giữ idempotency key cho retry. Từng app tự quản query/auth lifecycle. Không có database/game config imports.

`restoreSession<T>(path)` khôi phục cookie-backed session rồi đọc identity; tái sử dụng access token trong memory khi có. Retry tối đa ba lần cho lỗi mạng/429/5xx, không retry phiên bị từ chối. Web/admin phân biệt lỗi khôi phục tạm thời với hết phiên; Vite HMR giữ client/store/cache trong `hot.data`, không ghi bearer vào localStorage/sessionStorage. `EmptyState.icon` cho phép chọn icon phù hợp, mặc định giữ icon cá. Native form reset xóa lỗi validation phía trình duyệt của field.

`FishArt` dùng ảnh chụp cá thật theo slug từ `src/fish-photos.ts`, phục vụ tại `/fish/`; ưu tiên cá khỏe, vây nguyên vẹn, ảnh rõ và không có vết trầy loang. Prop `live` giữ tương thích với các màn chi tiết nhưng hiển thị ảnh cùng ghi công/link nguồn; ảnh không bị cắt thân/vây/đuôi. Ảnh thiếu hoặc tải lỗi dùng `EmptyState` đã dịch Việt–Anh. Nguồn/giấy phép và các phép crop/resize nằm trong `docs/ASSETS.md`.

Khung ảnh cá mặc định có tỷ lệ 3:2, chiều cao theo chiều rộng và giới hạn trong container; thumbnail admin dùng 104px, tỷ lệ 13:9. Ảnh giữ tỷ lệ gốc bằng `contain`, giới hạn cả hai chiều và bo góc trực tiếp theo `--radius-sm`, kể cả khi có khoảng trống quanh ảnh. Thẻ, chi tiết, kết quả câu, chat và preview dùng cùng quy tắc; caption nguồn có hàng riêng, fallback chữ gọn để vừa khung nhỏ.

Trang bị và cảnh game dùng 3D procedural (Three.js, `src/three/`) do dự án viết. `EquipmentArt` render model qua một WebGL context chung thành ảnh cache (prop `live` cho turntable); `LakeArt` và `@fwo/ui/lake-3d` (`createLakeWorld`) là cảnh 3D thời gian thực. three.js nằm trong lazy chunk; không có WebGL thì cảnh giữ nền gradient từ token. Màu lấy từ semantic CSS tokens qua `@fwo/ui/colors`. Chạy `rtk proxy pnpm lint:colors` tại root để phát hiện màu raw hoặc token thiếu. Có fallback font hệ thống, không tải font từ third party.

Từ thư mục `/Users/hanguyen/Downloads/fishing-world-online`:

```sh
rtk proxy pnpm --filter @fwo/ui typecheck
```

Kiểm tra shared interactions qua E2E của workspace; tiếp tục audit keyboard/screenreader/zoom trước release.

`LanguageSelector compact` dùng nhãn VI/EN cho header hẹp, giữ tên ngôn ngữ đầy đủ trong title và accessible label.

`Select` giữ native keyboard/option behavior với mũi tên dùng chung. Input/select/textarea dùng focus border và halo nhẹ, giữ viền đỏ khi có lỗi. `Button` mặc định `type="button"`; khai báo `type="submit"` cho action gửi form. Icon không bị flex co nhỏ; nút icon tròn cần padding phù hợp kích thước.

Modal cuộn riêng phần nội dung, giữ header/footer trong viewport, hỗ trợ Escape và trả focus về trigger còn tồn tại. `tests/e2e/ui.spec.ts` kiểm shared controls bằng API mock để tách khỏi thay đổi ở auth provider; suite gameplay/admin vẫn xác minh tích hợp thật.
