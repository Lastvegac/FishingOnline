# @fwo/web

React 19 + TypeScript + Vite, Zustand cho auth/UI trong bộ nhớ, TanStack Query cho dữ liệu API, Three.js (qua `@fwo/ui`) cho cảnh hồ 3D, model cá/trang bị và animation. CSS Modules của màn hình dùng semantic CSS variables từ `@fwo/ui/styles`. Không import `@fwo/game-config` hoặc `@fwo/game-core` vào browser.

Từ thư mục `/Users/hanguyen/Downloads/fishing-world-online`:

```sh
rtk proxy pnpm --filter @fwo/web dev
rtk proxy pnpm --filter @fwo/web typecheck
rtk proxy pnpm --filter @fwo/web build
```

Web tại `http://localhost:5173`. Vite proxy `/api` tới `http://127.0.0.1:3001`; dùng `VITE_API_TARGET` để đổi target khi kiểm thử. Cần API, PostgreSQL, Redis, migration và seed theo README gốc. Không có chế độ giả lập cộng Gold trong browser.

## Màn hình và dữ liệu

Landing/auth/reset/policy là public. `/play` có sảnh, map, fishing, inventory/equipment, collection, shop, missions, leaderboard, profile, settings và ledger. Auth bootstrap refresh cookie; access token chỉ trong memory, request gửi credentials và CSRF header. API client singleflight refresh và giữ cùng idempotency key khi retry 401. Shop xác nhận tổng giá trước giao dịch; không optimistic reward.

`src/game/FishingPage.tsx` là bridge hành động công khai. `LakeScene.ts` vẽ từng frame ngoài React. GET snapshot và POST hold/release tuần tự; TTL hold do server kiểm soát. Result chỉ xuất hiện từ `SessionDto.catch` sau server commit. Mất mạng giữ request idempotency để retry, không suy kết quả ở client. Pointercancel/blur/keyup nhả cần; Space/click hỗ trợ cast/hook, giữ Space hoặc nút để kéo.

`@fwo/ui` cung cấp Button, field/password/checkbox/select, modal native focus-trap, empty/loading/error, notices/toasts, tokens, artwork và bottom action. Các trang tái sử dụng những export này. Artwork SVG và Phaser Graphics do dự án tự tạo; không dùng emoji làm hình cá hoặc phụ thuộc asset thương mại.

## Tiêu chí nghiệm thu

Reload khôi phục phiên qua refresh cookie; HMR giữ client/auth/query cache trong memory. Lỗi mạng/429/5xx khi bootstrap được thử lại tối đa ba lần; lỗi kéo dài hiện nút thử lại, giữ URL hiện tại. Chỉ phiên bị từ chối mới về login; không lưu bearer trong browser storage. Bootstrap lại trong HMR giữ nguyên context lượt câu đang được bảo vệ sau khi auth thường hết hạn.

- Register/login/reload refresh/logout hoạt động với API thật; không lưu token ở localStorage.
- Cast → bite → hook → fight → result có state/DOM controls truy cập được và không gọi API song song.
- Gold/XP/collection/inventory/missions đồng bộ sau reward/claim/purchase.
- Shop hết Gold, hết mồi, API lỗi, loading, data rỗng có trạng thái rõ.
- Responsive 360px tới desktop, keyboard focus, reduced motion và sound mặc định tắt.
- Typecheck/build và E2E của workspace phải qua trước release. Accessibility là mục tiêu cần tiếp tục audit, không khẳng định chỉ từ build pass.

Âm thanh WebAudio chỉ bật sau tương tác người dùng. Font hệ thống/Georgia đảm bảo không phụ thuộc Google Fonts; CSP production có thể chỉ cho font local. Tùy chọn âm/chuyển động ở memory, không coi là dữ liệu tiến trình.
