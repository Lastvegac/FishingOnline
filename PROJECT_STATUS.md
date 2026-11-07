# Project status

## Mồi câu, cấp/XP/avatar và danh tính khi reload — 07/11/2026

- Thả câu khi hết mồi mở modal mua ngay từ shop đúng hồ; tái sử dụng `ShopPurchaseModal` ở tiệm và tại hồ, giữ validation/idempotency/giá/config/ledger backend. Thành công chọn mồi vừa mua, không tự tạo/cast lượt. Phí vào hồ và điểm thu phí hiện có được giữ nguyên; mở/đóng/mua không tạo thêm lượt hay phí.
- Chỉ dẫn đổi mồi Việt–Anh ngay trên nút và giải thích ở selector. Gameplay đã có bait affinity và ecology authoritative, không sửa phân bố/giá để làm UI. Header/sảnh/hồ sơ hiển thị cấp/XP còn thiếu; canonical `PlayerDto.levelProgress` do server tính bằng engine. Sảnh mobile hiển thị thẻ tiến độ gọn. Lối vào Đổi ảnh đại diện rõ ràng, preview bốn biểu tượng, lưu qua OTP và đồng bộ renderer trên header/sảnh/hồ sơ/bảng xếp hạng.
- Auth lưu ID kỳ vọng theo tab trong sessionStorage, bearer vẫn chỉ trong memory. Refresh/grant sai danh tính bị từ chối; mismatch không rotate/xóa cookie của người khác, đăng nhập chủ động cập nhật ID. Đã tái hiện thiếu guard bằng cookie lệch; chưa xác định tác nhân đã thay cookie trong trình duyệt của người dùng. Lần đầu chưa có hint hoặc storage bị chặn vẫn có giới hạn nhận diện qua reload.
- PASS: typecheck toàn workspace, ESLint/Prettier phần sửa, color lint, build web; **31/31** engine unit, **25/25** PostgreSQL integration, **18/18** Chromium desktop/mobile (14 ca theo task và 4 regression UI/form có sẵn). Auth/OTP/avatar dùng API/PostgreSQL thật, UI mua mồi và layout dùng API mock; kiểm Việt–Anh ở 320/390/768/1440px, đã xem ảnh desktop/mobile. Sửa selector regression theo nhãn avatar được dịch; giữ test gốc.
- Chưa kiểm Safari/thiết bị thật hoặc E2E mua mồi với API thật trong đợt này; integration shop/ledger có sẵn đã qua. Avatar hiện là bốn biểu tượng, chưa upload ảnh cá nhân. Build còn cảnh báo chunk lớn/annotation dependency; pg có cảnh báo deprecation hiện có. Script/test/ảnh/build/server và hai database kiểm thử riêng được dọn; không sửa dữ liệu ứng dụng hoặc lịch sử audit/ledger.

## Cân đối giỏ cá — 07/11/2026

- Giỏ tại hồ dùng shared Modal rộng tối đa 900px; lưới responsive dùng subgrid để đồng bộ các hàng nội dung giữa thẻ, nhãn độ hiếm và nút đổi giữ một dòng. Bố cục thẻ áp dụng cả tab giỏ trong túi đồ.
- PASS: typecheck web/UI, build web, ESLint phần sửa, color lint; Chromium với API mock ở 320/390/768/1440px Việt–Anh (8 tổ hợp: căn hàng với tên dài, nút/nhãn một dòng, không tràn ngang, xác nhận lồng/Escape/khôi phục focus) và loading/empty/error. Đã xem ảnh desktop/mobile. Build còn cảnh báo dependency/chunk lớn có sẵn. Đã dọn script/ảnh/build/server tạm. Không kiểm Safari/thiết bị thật hoặc giao dịch API thật trong đợt sửa bố cục này.

## Giỏ cá tại hồ và biểu mẫu vận hành — 07/11/2026

- Giỏ cá mở ngay tại hồ từ kết quả hoặc icon header; đóng giỏ để câu tiếp, giữ hồ qua query `location` thay vì rơi về hồ mặc định. Complete lỗi giữ kết quả; chỉ mở giỏ sau complete thành công. Xem/đổi/đóng giỏ không tạo session/cast hoặc thu phí; phí cho lượt mới được ghi rõ, chính sách backend không đổi. Shared Modal chặn cancel lan lên dialog cha.
- Bốn nhóm thời trang dùng biểu mẫu có nhãn thay JSON, icon bút sửa góc phải trên; mẫu có sẵn, lịch theo múi giờ thiết bị, giá chuỗi, mốc quà thêm/xóa, mã/version tự quản lý. Giữ validation server, RBAC/audit và idempotency.
- PASS: typecheck web/admin/UI, ESLint phần sửa, build web/admin. Chromium API mock: **4/4** ca editor ở 320/390/768/1440px Việt–Anh (bốn nhóm, required/lịch/lỗi server, precision, UTC/milliseconds, version/idempotency, create, focus/layout); **3/3** ca giỏ ở 320/390/1440px (hồ thu phí, complete lỗi/retry, không tạo lượt khi xem/đổi, dialog/focus/Space, loading/empty/error/retry và chỉ cast rõ ràng mới tạo lượt đúng hồ); **4/4** regression controls/forms có sẵn. Đã xem ảnh desktop/mobile.
- Không đổi backend/schema/dữ liệu ứng dụng; chưa kiểm API/PostgreSQL thật, Safari/thiết bị thật hoặc E2E gameplay toàn bộ trong lượt này. Color lint, Prettier và diff whitespace PASS; build còn cảnh báo dependency/chunk lớn. Đã dọn script/config/ảnh/build/output và preview server tạm. Giữ suite có trước, cập nhật kỳ vọng giỏ tại hồ trong game regression.

## UI thanh toán và giữ phiên khi sửa code — 07/11/2026

- Trang thanh toán có tiêu đề gọn, ba chỉ số tổng quan, khu vực lịch sử đơn gom bộ lọc/trạng thái/bảng, xóa lọc và empty state đơn/catalog phù hợp. Dùng shared components/tokens và catalog Việt–Anh; số tiền có đủ chiều rộng trên tablet/mobile. Native reset xóa lỗi validation phía trình duyệt.
- Web/admin giữ client/auth/query cache và React root khi HMR, bootstrap singleflight; reload khôi phục bằng refresh cookie. Network/429/5xx khi khôi phục được thử lại tối đa ba lần; lỗi kéo dài hiện retry tại URL cũ thay vì đá về login. Bearer giữ trong memory; phiên bị từ chối vẫn về login, context lượt câu đang được bảo vệ được giữ.
- PASS: typecheck UI/web/admin, ESLint phần sửa, color lint, build web/admin; browser API mock **4/4** ca UI thanh toán ở 320/390/768/1440px Việt–Anh (loading/empty/error/populated, bộ lọc/reset/validation, dialog/focus), **4/4** ca auth web/admin desktop/mobile (reload, tái đánh giá module, Vite reload thật, retry refresh/identity, outage/retry, hết phiên; web giữ protected cast state), **4/4** regression shared UI/form có sẵn. Đã xem ảnh desktop/tablet/mobile.
- Không thay backend hoặc dữ liệu ứng dụng; chưa chạy lại auth với PostgreSQL thật, Safari/thiết bị thật hoặc gateway thanh toán. Build còn cảnh báo chunk/dependency có sẵn. Script/config/ảnh/build/output/server kiểm chứng tạm được dọn; giữ suite có trước.

## UI quản trị: bản dịch, giá và chủ ví — 07/11/2026

- Thời trang dùng tên/cách mở khóa/slot Việt–Anh, giữ mã để tra cấu hình; tách giá và BottomActions để không chèn chữ, hiển thị đúng Gold/Kim cương/miễn phí/cấp. Bảng trang bị dịch loại ROD/LINE/HOOK/BAIT. Bộ lọc đơn hàng có placeholder UUID theo locale.
- Sổ cái dùng `AdminWalletTransactionDto` kèm tên hiện tại/ID người chơi từ quan hệ ví; hiển thị, tìm kiếm và chi tiết có đủ chủ ví/ID ví/tham chiếu. Chọn giới hạn dữ liệu profile, giữ role và ledger.
- PASS: typecheck admin/API/UI, build admin/API, color lint. 6/6 Chromium với API mock ở 320/390/1440px, Việt–Anh: bố cục giá/nút, bản dịch loại, tên/ID chủ ví, tìm kiếm/không kết quả, chi tiết, placeholder và loading/empty/error thời trang, không tràn trang/pageerror. Đã xem ảnh mobile thời trang và desktop sổ cái.
- PostgreSQL riêng: 1/1 kiểm tra join chủ ví, SUPER_ADMIN/SUPPORT được đọc, PLAYER/GAME_ADMIN/ANALYST bị chặn, không lộ contact/hash và số dư/ledger không đổi; 16 ca có trước không chạy trong lượt kiểm tra này. Đã xóa database test riêng, test/script/ảnh/server tạm; không sửa dữ liệu ứng dụng.
- ESLint các file sửa PASS (lỗi biến Login trong thay đổi đồng thời đã được xử lý và kiểm lại). Build có cảnh báo dependency annotation/chunk lớn hiện có. Chưa kiểm Safari/thiết bị thật hoặc E2E toàn bộ với API thật.

## Scale và bo góc ảnh cá — 07/11/2026

- Sửa shared `FishArt` CSS: khung responsive 3:2, giữ toàn bộ tỷ lệ ảnh, bo góc khung/ảnh bằng token; thumbnail admin 104px tỷ lệ 13:9. Cập nhật chiều cao ở thẻ, chi tiết, kết quả câu và chat; ảnh preview/upload/HTTPS theo cùng quy tắc. Fallback dùng shared EmptyState với chữ vừa thumbnail.
- PASS: typecheck UI/web/admin, color lint; Chromium ở 320/390/1440px kiểm bảng/editor admin thật bằng API mock và 37 ảnh thư viện trong các wrapper web thật, thêm detail/result/chat/blob preview/HTTPS/muted/missing/error. Ảnh không méo, không vượt khung, có radius; caption/fallback hiển thị, không tràn trang hoặc pageerror. Đã xem ảnh admin/web mobile. Chưa kiểm Safari/thiết bị thật hoặc chạy lại luồng ghi dữ liệu API. Script/ảnh kiểm chứng tạm được dọn, không sửa dữ liệu ứng dụng.

## Màu nút cảnh báo — 07/11/2026

- Đổi shared `Button` danger sang nền hồng nhạt/chữ đỏ trầm/viền nhẹ, áp dụng cho “Ẩn loài cá” và các nút danger hiện có. Typecheck UI/admin/web và color lint PASS. Kiểm riêng component thật trên Chromium ở 320/390/1440px: không tràn, focus bàn phím rõ, loading/disabled giữ nguyên; tương phản thường 5,54:1, hover 4,80:1. Đã xem ảnh mobile và dọn ảnh tạm; không chạy lại luồng ẩn cá qua API hoặc Safari/thiết bị thật cho thay đổi CSS này.

## Túi đồ: Trang bị và Giỏ cá — 07/11/2026

- Tách hai tab **Trang bị** và **Giỏ cá của bạn** bằng shared `Tabs`; bộ lọc và tủ đồ chỉ ở Trang bị. Nút **Mở giỏ cá** sau khi câu đi thẳng tới `?tab=catches`; reload/Back/Forward giữ đúng tab, đổi tab giữ query khác và bộ lọc trong lần xem. Nhãn Việt–Anh; `/play/equipment` giữ màn trang bị riêng.
- Xác minh: typecheck web/UI, ESLint phần sửa, Prettier và build web PASS. 4/4 ca Chromium API mock tại 1440px/320px, Việt–Anh PASS: chuyển tab/keyboard, deep link/reload/Back/Forward, bộ lọc, loading/empty/error/retry cả hai tab, dialog vật phẩm/khôi phục focus, đổi cá và kết quả câu → mở đúng giỏ. Đã xem ảnh desktop/mobile; cập nhật URL kỳ vọng trong regression game có trước.
- Chưa chạy lại luồng câu với API thật hoặc Safari/thiết bị thật; build còn cảnh báo chunk/dependency có sẵn. Không dùng database; test/config/ảnh/build/output tạm đã dọn, giữ suite có trước và thay đổi đồng thời.

## Upload ảnh cá và dịch nhật ký hệ thống — 07/11/2026

- Thêm/sửa cá chọn ảnh từ máy, xem trước và bỏ chọn; commit ảnh cùng cấu hình/audit. Dùng shared `FileInput` có nhãn Việt–Anh, native keyboard/validation và border lỗi semantic; đường dẫn ảnh nằm trong tùy chọn nâng cao. API chuẩn hóa JPEG/PNG/WebP/AVIF ≤5 MiB, ≤20 megapixel sang WebP ≤1600px, giữ ảnh cũ bất biến, dedupe và không nhúng base64 vào snapshot/audit.
- Dashboard/operations/search/chi tiết dùng nhãn action, đối tượng và lý do hệ thống Việt–Anh; lý do tự nhập và dữ liệu gốc giữ nguyên. Regression admin có trước được cập nhật kỳ vọng bản dịch và selector/auth setup theo UI hiện tại, không bỏ ca kiểm tra.
- PASS: typecheck admin/web/API/UI, ESLint phạm vi, color lint, build admin/web/API, unit API 18/18. Browser **4/4** Chromium desktop/mobile (hai ca regression admin, hai ca upload): quyền player, file SVG/quá byte/corrupt, chọn/bỏ/thay ảnh/lưu/reload, URL cũ còn tải được, dedupe, stale version và rollback cấu hình sai không giữ asset mới, bản dịch Việt–Anh, reason tự nhập/raw audit. Kiểm trực tiếp service: 4 định dạng hợp lệ chuẩn hóa và 4 loại input lỗi bị từ chối (SVG, corrupt, >20MP, >5MiB). Đã xem ảnh desktop/mobile với nhãn chọn tệp được dịch.
- Migration `202611070012_fish_photos` đã qua trên PostgreSQL test riêng, sau đó áp dụng thành công trên database ứng dụng local đã xác nhận `127.0.0.1/fishing_world`; không seed/sửa dữ liệu ứng dụng. Generate Prisma đã chạy. Test/scripts/ảnh/build tạm, process và database kiểm thử riêng được dọn; giữ regression gốc cùng sửa kỳ vọng cần thiết.
- Chưa chạy Docker/nginx thực, Safari hoặc thiết bị thật; build còn cảnh báo chunk lớn/annotation dependency. Ảnh lưu trong PostgreSQL, chưa có CDN/object storage. Hợp đồng/giới hạn tại IMPLEMENTATION_CONTRACT.

## Giá mở đầu thu hút người chơi — 07/11/2026

- Đã áp dụng vào database ứng dụng local: cấu hình v2 → v3, 17 offer tiệm và 26 cosmetic đổi giá, tạo hai gói 10.000đ/100 Kim cương, 20.000đ/200 Kim cương. Read-back xác nhận không còn chênh lệch, audit `APPLY_LAUNCH_PRICING` tồn tại. Gold kiếm trong game; đồ câu/cosmetic có giá dễ tiếp cận và đường miễn phí. Bảng đầy đủ theo cấp: [LAUNCH_PRICING](docs/LAUNCH_PRICING.md).
- Thao tác publish có transaction, khóa/version, preview và retry no-op; giữ nội dung tùy chỉnh/cấp/chỉ số, FREE/LEVEL, đồ sở hữu, wallet/ledger và snapshot phiên/đơn cũ. Cài mới seed giá được duyệt; seed trên cấu hình đã có không tự ghi đè giá admin. Catalog Việt–Anh niêm yết hai gói khi payment disabled, CTA vô hiệu hóa và server từ chối tạo đơn.
- Xác minh: typecheck toàn workspace, ESLint phần sửa, 53 unit và 25 PostgreSQL integration có sẵn PASS; kiểm tra riêng preview/conflict/publish/retry, tài sản/snapshot, IPN/mua cosmetic đồng thời và publish sau đơn DIAMOND PASS. 20 ca Chromium API mock ở 320px/1440px Việt–Anh (disabled/empty/loading/error/dialog sandbox) PASS, đã xem ảnh mobile. Build web/API PASS, còn cảnh báo bundle/dependency hiện có. Hai assertion giá trong regression hiện có được cập nhật theo bảng mới.
- Thanh toán thật vẫn disabled, chưa có merchant credentials hoặc nghiệm thu provider sandbox thật; không có doanh thu được chứng minh. Chưa kiểm Safari/thiết bị thật hoặc chứng minh retention/lợi nhuận. Test DB/script/ảnh/server tạm được dọn sau xác minh; không reset dữ liệu ứng dụng.

## Ảnh cá trong quản trị và bản dịch độ hiếm — 07/11/2026

- Form thêm/sửa cá có trường ảnh bắt buộc, xem trước và validation; danh sách cùng xác nhận ẩn có ảnh. Ẩn qua PATCH/version/audit giữ lịch sử. Độ hiếm dùng nhãn Việt–Anh chung ở selector/badge/tìm kiếm; payload vẫn là enum.
- `FishArt.imageKey` hiển thị ảnh đã lưu ở admin, collection, giỏ cá, chat và kết quả câu; thư viện ảnh cũ giữ credit/srcSet. Admin chia sẻ ảnh bằng symlink `public/fish` và giữ favicon riêng. Không cần migration DB.
- Xác minh: typecheck admin/web/API/UI/contracts/game-config, ESLint phần sửa, color lint và build admin/web qua; 18/18 unit API qua. Playwright nghiệm thu tạm **2/2** Chromium desktop/mobile qua với PostgreSQL riêng `fishing_world_fish_admin_test`: Việt–Anh, required/URL không hợp lệ, sửa/lưu/đọc lại URL ảnh, ảnh có tải thật, thêm cá từ form, ẩn/reload và audit. Kịch bản sao từ regression admin được điều chỉnh ở bản kiểm chứng tạm theo auth tự khôi phục hiện tại; suite có trước được giữ nguyên.
- Đợt ảnh qua URL ban đầu đã được bổ sung upload từ máy ở cập nhật bên trên; URL HTTPS/đường dẫn `/fish/`/mã `fish/<slug>` vẫn được hỗ trợ. URL bên ngoài trong test được trả bằng ảnh thật local để không phụ thuộc mạng; chưa xác minh CDN thực hay Safari/thiết bị thật. Build còn cảnh báo chunk lớn và annotation từ dependency. Test/ảnh/build tạm và database riêng đã dọn sau kiểm tra.

## Admin: điều hướng, bảng dữ liệu, favicon và phiên đăng nhập — 07/11/2026

- Admin có favicon riêng, tiêu đề tab theo trang/ngôn ngữ, menu nhóm theo vai trò, lối tắt ở Tổng quan, bảng sắp xếp/tìm kiếm không dấu và error boundary theo trang. Sửa sổ cái Gold hiển thị đúng `deltaGold`/`balanceAfterGold`/`walletId`.
- Phiên admin ([auth.ts](apps/admin/src/auth.ts)) giữ transport chung với web; thêm thông báo hết hạn + quay lại trang cũ, deep link, đồng bộ đăng nhập/đăng xuất giữa tab, kiểm tra lại role khi tab quay lại.
- Xác minh trên dev server local (API thật, database ứng dụng, tài khoản Super Admin local; chỉ đăng nhập/đăng xuất, không sửa nội dung): Chromium 17/17 ca PASS — deep link, hết hạn (giả lập bằng xoá refresh cookie + 401 qua route mock), quay lại trang, hai tab đăng xuất/đăng nhập, reload, sắp xếp + `aria-sort`, tìm kiếm không dấu, không có kết quả, không tràn ngang 390px, tiêu đề tab tiếng Anh; 8 trang admin không có pageerror. Typecheck admin/web/ui, ESLint admin, Prettier, color lint và build admin PASS.
- Giới hạn: bundle admin ~607 kB (191 kB gzip) do `@fwo/ui` kéo Three.js; tìm kiếm/sắp xếp chỉ trên ≤100 bản ghi đã tải; chưa chạy Playwright E2E chính thức (`tests/e2e/admin.spec.ts`), Safari/thiết bị thật. Trong lúc làm, một phiên khác đồng thời thêm ảnh/ẩn loài cá vào `main.tsx` — phần đó không thuộc lượt kiểm tra này.

## Nhân vật Trung Hoa và kinh tế thời trang — 07/11/2026

Đã nối nhân vật lưu theo account với studio 3D, 12 slot, thử/mua đồ Gold–Kim cương, màu/họa tiết, 10 bộ phối (20 khi membership hiệu lực), collection, chia sẻ/like/follow, event/pass và admin có audit/version. Nhân vật đã lưu hiện trong hồ; presence có lease, giới hạn di chuyển và animation câu từ server. Inventory và wallet hiện có được mở rộng, không tạo kho trùng hoặc thay reward gameplay.

Theo lựa chọn mới nhất của người dùng, tiếp tục bộ model procedural dùng chung, 14 bone và SkinnedMesh; có các tóc/phụ kiện/dáng tuổi, 16 animation state, render thumbnail có cache và gộp mesh cùng material/parent. Chưa có upload/model GLB/PBR, facial rig, cloth collision hoặc chất lượng cinematic. Membership hiện có cosmetic tier/capacity; chưa có billing định kỳ, khung tên/discount/login gifts. Event trả quà tham gia, chưa có jury/ranking reward. Các mục này được ghi rõ, không đánh dấu toàn bộ tầm nhìn master đã hoàn tất.

PostgreSQL integration 36/36 (11 ca nhân vật/fashion một lần + 25 regression hiện có), unit 53/53, typecheck toàn workspace, ESLint phạm vi và color lint qua. Build web/admin/API qua, còn cảnh báo chunk lớn/dependency. Playwright 4/4 Chromium desktop/mobile qua trên production build cố định: tạo/lưu/reload, thử/mua đồ, wardrobe/equip, studio ngày/đêm, hai tài khoản cùng hồ với model/tên hiển thị và admin validation/edit/metrics. API và PostgreSQL dùng môi trường riêng; không có pageerror/lỗi THREE trong các ca này. Chưa đo FPS hoặc nghiệm thu Safari/thiết bị thật.

Đợt này migrate DB kiểm thử riêng. Kiểm tra read-only `prisma migrate status` xác nhận DB ứng dụng local đã có đủ 11 migrations; không reset/seed hoặc chỉnh dữ liệu account trong bước đó. Chạy `rtk proxy pnpm db:generate` và `rtk proxy pnpm db:migrate` tại root khi cập nhật local. Payment vẫn disabled, chưa giao dịch thật/merchant sandbox thật; không seed đơn VND, event hoặc pass giả trong production. Hợp đồng, file theo phase, giá giả thuyết và giới hạn: [CHARACTER_FASHION](docs/CHARACTER_FASHION.md).

## Màn câu gọn cho mobile, nhạc nhẹ và rung — 07/11/2026

- Cảnh hồ chiếm vùng chính, tiêu đề/toolbar gọn; không hiện chỉ số 0% khi chưa đấu cá. Căng dây/tiến độ ở HUD nhỏ trong cảnh, các chỉ số phụ và bộ chỉnh mở khi cần; mồi/trang bị dùng Modal chung, cộng đồng chỉ tải khi mở. Giữ nút chính và vùng chạm 44–52px, hint Space ẩn trên thiết bị cảm ứng.
- Thêm nhạc ngũ cung stereo loop và tiếng nước/gió/máy câu trong một AudioContext. Bật âm mặc định nhưng chỉ phát sau thao tác thật; mute/ẩn tab suspend, rời màn đóng context. Rung có toggle riêng và không phụ thuộc loa, theo tín hiệu cá chạm/đớp, kéo dây và kết quả khi thiết bị hỗ trợ.
- Nhân vật được animate trong vòng render; cần chia đoạn cong theo tải server, phao nghiêng/chìm và dây chùng/căng. Dialog chiến lợi phẩm dùng chế độ model của FishArt chung. Luật/phiên/Gold không đổi.
- Typecheck web/UI, ESLint phần sửa, color lint và build web PASS. Playwright PASS 4/4 trên Chromium desktop/mobile: 2 ca UI với API mock (320/390/1440px, Việt–Anh, hết mồi/lỗi/reconnect, âm thanh/rung/focus) và 2 ca luồng thật đăng ký → câu cá → đổi cá → reload. Dùng build cố định, cổng và database riêng; đã dọn test/script/screenshot/build tạm và database kiểm thử, giữ regression có trước.
- Chưa nghiệm thu âm lượng/cảm giác rung, FPS/nhiệt máy trên thiết bị thật hoặc Safari. Vibration API là khả năng tùy thiết bị; vẫn có phao/cần và cảnh báo thị giác khi không hỗ trợ rung.

## Cuộn mượt và chuyển động UI — 07/11/2026

- Đã thêm smooth scroll/focus/hash/Back cho “Cách chơi” và “Hành trình”, liên kết mobile và reveal khi section vào viewport. Shared CSS có motion tokens, phản hồi nút/toggle/điều hướng, fade đổi route, mở dialog/backdrop, toast và trạng thái; Settings giảm chuyển động điều khiển DOM và giữ hỗ trợ hệ điều hành.
- Build cố định/API mock: 8 ca chức năng/regression desktop/mobile PASS; 2 ca đo cuộn có vị trí trung gian, bàn phím, Back, reveal và layout PASS ở 320/1440px. Ca lấy mẫu cuộn dùng fallback không WebGL và Chromium mặc định: SwiftShader gây lỡ frame trong môi trường headless, không dùng kết quả đó để khẳng định FPS hoặc độ mượt cảnh game trên thiết bị thật. Typecheck UI/web/admin, ESLint App, Prettier phần sửa, color lint và build web PASS; còn cảnh báo bundle/dependency.
- Đã cập nhật quy ước/nghiệm thu tại `docs/UI_UX.md`; kiểm thử không dùng database ứng dụng. Script, ảnh, output/build và server tạm riêng của lượt này được dọn; giữ suite có sẵn và công việc đồng thời.

## Giữ phiên đăng nhập và bảo vệ lượt câu — 07/11/2026

- Shared HTTP client tự refresh trước hạn JWT 60 giây/401, single-flight và serialize rotation bằng Web Locks cùng origin; giữ mutation key khi retry. Network/429/5xx không logout, login sai không ảnh hưởng phiên, xử lý logout 204 và request/refresh cũ sau đổi tài khoản.
- Khi refresh hết hạn tự nhiên, cookie HttpOnly riêng cho phép hoàn tất đúng lượt đã cast; bind user/family/session, deadline cố định `session.expiresAt + 2 phút`, CSRF HMAC + Origin và recheck dưới player lock. Không cho cast/tạo lượt mới, shop/wallet/admin/payment socket; reuse/logout/reset/revoke/khóa account vẫn chặn. Không đổi timeout engine, config snapshot hoặc settlement.
- Web giữ màn câu/kết quả và khôi phục reload trực tiếp `/play/fishing` qua cookie; chỉ yêu cầu login sau khi đóng kết quả hoặc chủ động rời hồ. Kết quả đã lưu vẫn đóng được khi quyền xác nhận đã hết hạn.
- Nghiệm thu API: 28/28 PostgreSQL integration (25 regression + 3 ca tạm auth, gồm rolling/absolute expiry trong actual catch, cookie-only context, replay một catch, phạm vi/CSRF/revocation/suspension/logout). Transport 13/13 ca tạm; API unit 17/17 và engine 30/30. Typecheck API/UI/web/admin và ESLint source thay đổi qua; web production build qua, còn cảnh báo bundle lớn/dependency. Browser auth production build riêng **8/8 desktop/mobile** qua: WAITING/BITE/FIGHTING, reload giữ lượt, đóng kết quả mới login và vẫn thoát được màn kết quả khi grant đã hết hạn. API browser được mock; actual catch/settlement kiểm bằng PostgreSQL integration.
- Không dùng database ứng dụng; đã dọn test/helper một lần, preview/build/trace tạm và database auth `_test`, giữ nguyên test suite có trước. Chưa xác minh Safari/thiết bị thật hoặc lock giữa web/admin khác origin; browser không hỗ trợ Web Locks chỉ có single-flight trong tab.

## Hiện đầy đủ ảnh mọi loài cá — 07/11/2026

- Sổ cá hiển thị ảnh thật đủ màu/độ sáng cho cả 37 loài, kể cả chưa khám phá; giữ nhãn và số lần bắt. Chi tiết kỷ lục, giỏ cá, kết quả câu và cá chia sẻ có chiều dài vẫn dùng ảnh thật, giữ trọn khung bằng shared `FishArt`.
- Kiểm tra đủ 37 slug cấu hình có metadata/nguồn/giấy phép và file ảnh. Chromium với API mock: 148 ảnh thẻ + 148 ảnh chi tiết qua ở 320px/1440px, Việt/Anh, gồm cá chưa bắt và kỷ lục có chiều dài; ảnh decode, không filter/giảm opacity, `contain`, nguồn ghi công, Escape/trả focus và không tràn ngang. Tám ca loading/empty/error/ảnh lỗi trên hai chiều rộng qua, không pageerror. Đã xem ảnh màn hình desktop/mobile; chưa kiểm thiết bị thật hoặc luồng câu/đổi cá với API thật trong lượt này.
- Typecheck web, ESLint bốn file UI sửa và build web PASS; build còn cảnh báo kích thước bundle/annotation dependency. Prettier ghi nhận một đoạn nút ngoài phạm vi ảnh trong `pages.tsx` chưa đúng format; không sửa phần đó. Không dùng database hoặc thay dữ liệu ứng dụng; dọn script/ảnh/server kiểm thử riêng.

## Fishing simulator — 07/11/2026

Đã triển khai trực tiếp trên engine/API/UI hiện có: ecology cho 37 loài, 6 water profile, điều kiện giờ/thời tiết snapshot, ném hướng/lực/tầng nước, kiểm mồi/cắn thật, giật sớm/lỡ hook và fight theo mass/species/drag/hướng cần/gear. Dây có thể đứt/chùng/mài mòn; phải kiệt sức và về bờ mới tạo catch. Phiên legacy giữ engine cũ; Gold/XP/exchange và ledger giữ transaction/idempotency.

Chiến lợi phẩm simulator có gram, chiều dài xấp xỉ, ngày/địa điểm/mồi/cần; collection đọc kỷ lục đã lưu. Theo yêu cầu ảnh cá hiện hành, `FishArt` dùng ảnh thật cho sổ cá (kể cả loài chưa khám phá), chi tiết kỷ lục, giỏ cá, kết quả câu và cá chia sẻ tại hồ; có số đo vẫn giữ ảnh. Cảnh gameplay tiếp tục dùng cá 3D, có sóng, gió, mưa/sương/ngày đêm; controls Việt–Anh, range bàn phím/touch, ngắm cảnh/fullscreen và ambient/cue. Nhân vật/âm nhạc/haptics đang được các phần việc khác mở rộng đồng thời, không ghi đè chúng.

Chat tại điểm câu và share chỉ nhận cá đã lưu của chính user tại điểm đó, cooldown 3s, idempotency; bảng tuần top cá lớn từ thứ Hai 00:00 Việt Nam. Đây là nền tảng cộng đồng với dữ liệu thật; chưa có giải đấu đăng ký có thưởng. Migration `202611070008_lake_community` thêm bảng/index. Task simulator chỉ migrate/seed database test; kiểm tra read-only cuối bằng `prisma migrate status` cho thấy database ứng dụng local đã đủ 11 migration và schema up to date. Với môi trường khác, chạy `rtk proxy pnpm db:generate` và `rtk proxy pnpm db:migrate` khi cập nhật.

Nghiệm thu: 51 unit (4 contracts + 30 engine + 17 API), 28 PostgreSQL integration qua, gồm metadata/kỷ lục/chat replay/ownership/cooldown/week. Kiểm tra deterministic bổ sung bắt được 37/37 loài với bộ gear phù hợp, một mẫu khối lượng và điều kiện thuận lợi; chưa chứng minh cân bằng chung. Typecheck toàn workspace và build web/admin/API qua, còn cảnh báo chunk lớn. ESLint phần simulator qua; lint toàn workspace tại lần chạy cuối còn lỗi trong các file kiểm tra tạm do phần việc khác tạo (`playwright.fishing-check.config.ts`, `tests/e2e/fishing-feedback.temporary.spec.ts`), không xóa/sửa artifact của họ.

Playwright trên bản sao source cố định đã qua luồng thật desktop và mobile: OTP → tạo nhân vật → duyệt màn → range controls → cast/hook khi GET đang chạy → fight bằng Space → canvas cá 3D/chiều dài → đổi cá → reload đúng một catch. Bản sao tránh HMR do workspace đang được sửa đồng thời; không dùng API ép thắng hoặc nới deadline để che lỗi. Shared UI desktop/mobile đã qua riêng sau khi bổ sung CSRF cookie vào fixture theo contract refresh hiện hành. Hai lượt kiểm tra browser bổ sung (desktop/mobile) đã qua cho cộng đồng loading/empty/error/populated và tỷ lệ kích thước model: cùng loài, model 80cm có vùng pixel cá lớn hơn model 20cm. Đây là kiểm tra UI trên fixture, không coi dữ liệu mock là kiểm chứng gameplay/economy. Tổng 4 E2E chính thức (2 gameplay + 2 shared UI) qua trong các lượt chạy cuối tương ứng.

Chưa hoàn thành toàn bộ tầm nhìn master: phối mồi/công thức, kỹ năng độc lập, reel/phao/phụ kiện riêng, thuyền/sonar/xa bờ, bản đồ thủ công, xuất ảnh/bộ sưu tập công khai, moderation chat và thách đấu/giải có thưởng. Chưa đo FPS/tải/thiết bị thật hoặc nghiệm thu chất lượng âm. Báo cáo file/11 phase và giới hạn: [SIMULATOR](docs/SIMULATOR.md). Các số kiểm tra trong các đợt nghiệm thu cũ bên dưới là lịch sử.

## Rà soát UI web/admin — 07/11/2026

- Đã sửa nguyên nhân chữ/nút dính viền thẻ thời trang qua tùy chọn `Card padded` dùng chung; áp dụng cho các màn có cùng lỗi trong studio, sự kiện/pass, thanh toán và admin. Lưới tự co số cột, tên dài xuống dòng, action bộ sưu tập được nhóm; form ngoại hình dùng shared range, tab theo URL và nhãn admin/Thần thoại có Việt–Anh.
- Chromium API mock: 144 tổ hợp màn/kích thước 360/390/768/1440px/locale không tràn ngang hoặc pageerror; 32 ca tập trung trên production build PASS cho trạng thái market, loading/empty/error, dialog thời trang và catalog/dialog thanh toán. Regression shared controls có sẵn PASS 2/2 ở desktop và mobile 320px, gồm focus/select/dialog lồng/menu/validation admin.
- Typecheck toàn workspace, ESLint source UI, color lint và build web/admin PASS tại lần kiểm tra; build không còn vòng chunk `CharacterPreview`, còn cảnh báo bundle lớn và annotation từ dependency. Workspace có các thay đổi khác diễn ra đồng thời; kết quả browser là bản build cố định của lượt kiểm tra. Chưa xác minh Safari/thiết bị thật, hiệu năng hoặc giao dịch thật; không thay dữ liệu ứng dụng khi rà soát UI. Script/ảnh/server tạm riêng của lượt này đã dọn, giữ các tài nguyên của lượt khác.

Cập nhật07/11/2026 · MVP local0.1.0 · Side-view/Hồ Sen/Gold-only đã được người dùng đồng ý. Capacity kế hoạch:20giờ/tuần; không suy ra effort thực tế từ tốc độ sinh source.

## Thanh toán và cấp vật phẩm realtime — 07/11/2026

- Đã tích hợp module thanh toán VND độc lập: MoMo, VNPay và ATM/Visa/Mastercard qua VNPay hosted checkout theo lựa chọn của người dùng. Backend lấy giá từ catalog, ký request và xác minh IPN/query; redirect không xác nhận thanh toán. Mặc định `PAYMENT_ENVIRONMENT=disabled`, không seed sản phẩm trả tiền hoặc merchant keys.
- Receipt hợp lệ được lưu bền vững trước khi ack; fulfillment transaction cấp toàn bộ vật phẩm, ghi lịch sử bất biến và notification outbox. Khóa/unique/idempotency chống cấp trùng; lỗi cấp đồ giữ quyền lợi và được worker retry. Không cần admin duyệt. WebSocket xác thực theo user/session, tự reconnect và đồng bộ inventory/order từ API; popup chỉ xuất hiện sau khi cấp đồ đã commit.
- Shop có catalog VND, chọn số lượng/phương thức, xác nhận mã đơn/tổng tiền và lịch sử. Admin có lọc đơn/gateway/trạng thái/ngày/user, doanh thu, chi tiết receipt/IPN/fulfillment, đối soát có audit và editor catalog cho Super Admin; không có nút tự đánh dấu đã trả tiền.
- Source chính: `apps/api/src/modules/payments`, `packages/contracts/src/payments.ts`, migration `202611070005_payments`, `apps/web/src/payments.tsx`, phần payment trong `apps/admin/src/main.tsx`; kèm env mẫu, WebSocket proxy Nginx/Vite, runtime DB grants và test chính thức. Sơ đồ, API/events, merchant onboarding, hướng dẫn sandbox/production và checkpoints từng phase: [PAYMENTS](docs/PAYMENTS.md).
- Xác minh: PostgreSQL integration **25/25** (16 regression hiện có + 9 payment), gồm 10 IPN đồng thời, signature/amount/request mismatch, retry fulfillment, late success, owner isolation và WebSocket reconnect. Playwright bản build riêng **2/2 desktop/mobile**: catalog loading/error-retry/empty/disabled → admin tạo gói → tạo đơn → reload pending → signed IPN → nhận popup/kho ngay → duplicate không cấp thêm → admin xem lịch sử. Gateway transport trong test được giả lập và chặn gọi ra ngoài.
- Unit **51/51** (contracts 4 + engine 30 + API 17), typecheck toàn workspace, ESLint phạm vi payment và color lint qua; build web/admin/API qua. Vẫn có cảnh báo kích thước chunk và dependency. Lint toàn repository ở lượt cuối còn 19 lỗi `no-explicit-any` trong `playwright.fishing-check.config.ts` và `tests/e2e/fishing-feedback.temporary.spec.ts` của công việc khác đang chạy; không sửa/xóa các file đó trong task payment.
- Chưa có tài khoản merchant: **chưa nghiệm thu trực tiếp sandbox MoMo/VNPay/thẻ**, chưa phát sinh giao dịch tiền thật. Chưa đo tải/latency hoặc kiểm Redis fan-out nhiều instance. Migration của task chỉ chạy trên database kiểm thử riêng; chưa áp dụng vào database ứng dụng. Cần điền secret backend và hoàn tất merchant sandbox/certification trước khi bật mở bán.
- Đã dọn hai database payment `_test`, build preview/trace/tài liệu tải tạm và xác nhận các cổng test 3012/4183/4184 không còn server. Giữ test suite chính thức, dữ liệu ứng dụng, audit và thay đổi/artifact của công việc khác; không commit/push/deploy.

## Điều hướng và trải nghiệm mobile — 07/11/2026

- Header mobile hiển thị logo cá từ `public/icon.svg`, Gold và avatar trên một hàng. Logo trong app về sảnh; có Quay lại/Về sảnh trên màn con, fallback về sảnh khi mở URL trực tiếp. Trang chủ giới thiệu dự án có lối vào riêng trong menu Thêm và sidebar desktop.
- Bottom navigation dùng nhãn ngắn Việt–Anh có chủ ý; menu Thêm đánh dấu khu vực đang xem, có LanguageSelector đầy đủ và giữ đóng/Escape/trả focus. Chuyển trang mở nội dung từ đầu.
- Màn nhiệm vụ dùng heading/notice gọn, card không ép chiều rộng, Gold/XP và nút ≥44px; gợi ý khám phá hồ/sổ cá sau danh sách, kể cả loading/empty/error.
- Typecheck web, ESLint phần sửa, color lint và build web PASS. Chromium với API mock PASS 35 tình huống: 320/390/768/1440px, Việt–Anh, loading/empty/error/populated; logo, nhãn dài, số Gold lớn, back trực tiếp/qua history, sảnh/trang chủ, khám phá, menu/focus/ngôn ngữ, vị trí cuộn và liên kết trang chủ trong sidebar desktop. Chưa xác minh iOS/Android thật hoặc đo retention; build còn cảnh báo chunk >500KB.

## Ảnh cá thật đẹp và khỏe — 07/11/2026

- Người dùng chốt ảnh chụp cá thật cho thẻ/chi tiết cá. `FishArt` trong sổ cá, giỏ cá và kết quả câu dùng lại ảnh thật cho cả 37 loài; thay nhóm ảnh cá chợ/mẫu vật không đẹp bằng ảnh cá khỏe, ưu tiên cá đang sống. Cảnh gameplay và cá trong cảnh vẫn 3D.
- Ảnh giữ trọn khung bằng `object-fit: contain`; chi tiết hiển thị ghi công/link nguồn bên dưới ảnh. Thiếu ảnh hoặc lỗi tải có `EmptyState` Việt–Anh, không hiện ảnh hỏng hoặc tự đổi sang cá 3D. Asset mới trong `/fish/live/`; metadata và hồ sơ phép biến đổi ở `fish-photos.ts`/`docs/ASSETS.md`.
- Đã thay 16 ảnh; 37 file ảnh decode thành công. ESLint phần sửa, color lint, typecheck package UI và build web PASS tại lần kiểm tra. Chromium 1440px/390px với API mock PASS cho loading/empty/error/populated/ảnh lỗi, nguồn ảnh, fallback Việt–Anh và đóng modal/trả focus; không có pageerror, không tải lại ảnh cá diêu hồng cũ. Typecheck web cuối lượt bị chặn bởi lỗi Promise lồng ở `packages/ui/src/http.ts:117`, thuộc phần đang sửa đồng thời; không sửa phần đó trong task ảnh. Chưa nghiệm thu trên thiết bị thật.

## Đổi cá trong game — 07/11/2026

- Giỏ cá trong Túi đồ, confirm đổi và đồng bộ ví/lịch sử/shop. Catch mới ghi XP/collection/mission ngay, Gold nhận khi đổi; cá đã trả Gold và phiên legacy không phát lại.
- Giá thử nghiệm 10% Gold cơ sở theo trọng lượng, floor, 1–100 Gold/con; tối đa 100 Gold từ đổi cá/ngày Việt Nam. Giá snapshot theo phiên và giữ trong giỏ. Migration fish exchange đã áp dụng local; không đổi số dư/ledger cũ.
- Đã qua lint/color lint, typecheck, build web/admin/API và 33 unit tại lần kiểm tra. PostgreSQL integration PASS 16 (gồm ca tạm quota/concurrency/midnight/snapshot/legacy); kiểm tra UI với API mock PASS 10 trên desktop/mobile cho loading/empty/error/populated/limited và dialog. Test tạm được dọn; test gameplay sẵn có được cập nhật cho bước đổi cá.
- Vòng thật Playwright PASS desktop và mobile: OTP đăng ký → câu cá → mở giỏ → xác nhận đổi → profile/reload, totalFish = 1 và Gold tăng đúng sau đổi. Helper OTP dùng cùng origin của môi trường test; helper điều hướng chờ URL/dialog đóng trước màn kế tiếp để tránh race trên mobile. Database và cổng kiểm thử riêng, giữ nguyên môi trường người dùng đang chạy.
- Hiện đổi vật phẩm trong game; quà ngoài đời để giai đoạn sau. Tỷ lệ thấp chưa chứng minh lợi nhuận; xem MONETIZATION để phân biệt Gold, doanh thu thực và ngân sách quà. Cần playtest khả năng mua mồi/nâng cấp với mức mới.

## Đã triển khai

| Phần sản phẩm       | Source và hành vi                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web game            | apps/web: landing/auth/lobby/map/game 3D/profile/inventory/equipment/collection/shop/missions/leaderboard/settings; responsive desktop/mobile                    |
| Gameplay            | packages/game-core: simulator + legacy, tick 50ms, casting/hook/drag/steering, server RNG/trọng lượng/thưởng, snapshot và phục hồi phiên; tutorial cho người mới |
| Nội dung            | packages/game-config: 37 loài cá, 6 điểm câu/water profile, gear/mồi/shop theo địa hình, 3 daily missions, 3 achievements                                        |
| Tài khoản           | Argon2id, access10phút, cookie refresh xoay vòng/CSRF/reuse revoke, SMTP password reset, danh sách/thu hồi phiên                                                 |
| Economy/progression | Starter200Gold/20giun, mua/nâng cấp/cứu trợ mồi, XP/level, collection/kỷ lục, missions theo ngày Việt Nam và thời hạn nhận thưởng                                |
| Admin               | apps/admin:RBAC, dashboard/analytics, nội dung và config draft/publish, users/status/session, ledger và audit; API đổi role có xác nhận mật khẩu                 |
| Dữ liệu             | Prisma7 runtime schema, additive migrations, seed idempotent, locks/idempotency, append-only histories và đối soát ví khi commit                                 |
| Foundation          | pnpm workspace, shared UI/tokens/contracts, build thật, Docker/Compose/Nginx, qualityCI, script backup/localPG/runtimeDBrole                                     |

Web/admin dùng palette POSORA được cung cấp qua shared semantic tokens, áp dụng cho CSS và đồ họa 3D Three.js và được kiểm bằng color lint. Shared form hiển thị lỗi inline/viền đỏ, nhận lỗi server theo field; mật khẩu 8–128 ký tự đồng bộ frontend/backend. [AGENTS.md](AGENTS.md) điều hướng sáu skill local cho các lần phát triển tiếp theo.

## Bằng chứng xác minh

Settings: hàng ngôn ngữ tự xuống dòng ở màn hẹp để giữ mô tả dễ đọc; 4 kiểm tra bổ sung Việt/Anh ở 320px/1440px qua cho chiều rộng mô tả, vị trí selector và không tràn ngang. Đã xem ảnh hàng Settings mobile.

Rà soát UI cơ bản: sửa focus/select/disabled, icon avatar, hành vi nút trong form, modal cuộn và trả focus, menu mobile, bảng dữ liệu và header 320px. Lint/color lint và typecheck toàn workspace, build web/admin/API đã qua; 4 ca form/shared UI desktop/mobile qua trên mock API. Rà 32 trường hợp rỗng/lỗi ở 320px và 768px không phát hiện tràn ngang hoặc JavaScript pageerror. Các kết quả UI này không xác minh luồng OTP/SMTP và gameplay tích hợp đang được thay đổi đồng thời; các số E2E cũ bên dưới là bằng chứng của lần nghiệm thu trước.

Cập nhật i18n: web/admin dùng catalog Việt–Anh có kiểu, chọn/lưu ngôn ngữ, đồng bộ tab cùng origin và format số/ngày theo locale; PasswordInput dùng placeholder và icon Eye/EyeOff. 10 ca UI Chromium desktop/mobile đã qua với mock API, gồm regression shared form và shell 360px. Đây là xác minh UI; không thay thế các kiểm tra API/gameplay ở bảng dưới. Dữ liệu nội dung game và thông báo server chưa có catalog vẫn giữ nguồn; xem [I18N](docs/I18N.md).

Bộ chọn ngôn ngữ theo component thực tế của workspace POSORA: cờ 🇻🇳/🇬🇧 và tên đầy đủ Tiếng Việt/Tiếng Anh (English khi giao diện Anh), trong cả control và danh sách; bỏ VI/EN và giới hạn 84px ở header mobile. Qua typecheck UI/web, ESLint phần sửa, color lint và 12 trường hợp Chromium ở 1440px/320px trên landing/login/register, Settings web và login/header admin với API mock: focus, đổi locale, reload, tên không bị cắt và không tràn ngang, kể cả ví 999.999.999 Gold. Đã xem ảnh control/mobile. Typecheck admin còn lỗi khóa `ui.created` ở `apps/admin/src/main.tsx`, ngoài phạm vi lần sửa này. Popup native bằng bàn phím chưa xác minh được trên Chromium headless macOS; chưa kiểm thiết bị thật/trình duyệt khác. Script/ảnh/server tạm được dọn, không dùng database.

| Kiểm tra               | Kết quả thực tế                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint / typecheck       | PASS toàn bộ workspace                                                                                                                                                                              |
| Unit                   | PASS29: contracts3 + engine18 + API8                                                                                                                                                                |
| PostgreSQL integration | PASS11: auth/validation/CSRF/reuse/reset/equip/upgrade/rescue, catch+wallet+XP+collection+mission, idempotency/concurrency/stock, RBAC/archive và immutable ledger                                  |
| Browser gameplay       | PASS6 E2E Chromium/mobile: register với password8 ký tự/reload/responsive/catch/persist, inline validation/server fields và admin edit/audit; có regression làm chậm GET300ms rồi giật cần đúng1lần |
| Browser admin          | PASS desktop/mobile:login/users/edit/readback/restore/audit                                                                                                                                         |
| Production builds      | PASS web/admin/API; API bundle đã chạy Node22 và /ready200                                                                                                                                          |
| Migration/seed         | PASS PostgreSQL15.18 native; chạy lại seed giữ cấu hình đang active                                                                                                                                 |
| SMTP thực              | PASS localTCP mail delivery → reset204 → oldpassword401/newpassword200 → oldaccess401 → replaytoken400; fixture/server/DB tạm đã dọn                                                                |
| Runtime DB role        | PASS register201/shop201 và ví170Gold với role không superuser/createdb/createrole; migration role tách biệt                                                                                        |
| Backup/restore         | PASS pg_dump custom → pg_restore database riêng;10cá,1user,0ví lệch ledger                                                                                                                          |
| Dependency audit       | PASS production277dependencies:0 lỗ hổng ở mọi severity tại thời điểm kiểm                                                                                                                          |
| Compose                | PASS validate local/production; chưa build/run image vì Docker daemon máy này không hoạt động                                                                                                       |
| Visual QA              | Đã xem landing/lobby/collection/game desktop/mobile, không JS pageerror/overflow trong kiểm thử; sửa iconSVG/nútgiật/mobilesceneheader và race giật cần/polling                                     |

Test core/integration/E2E được giữ làm test suite chính thức theo yêu cầu master prompt. Không tạo endpoint force-win hoặc để browser quyết định thưởng. Môi trường test dùng DB tên riêng `_test`, không dùng data ứng dụng. Không commit/push/deploy; thư mục ban đầu chưa là Git repository.

## Xác thực OTP và tài khoản (07/11/2026)

Đăng ký 2 bước qua OTP email/SMS, Google sign-in, đăng nhập/quên mật khẩu bằng email hoặc số điện thoại; đổi tên/avatar cần OTP; email bất biến (API strict + trigger DB). Kiểm tra: contracts 4/4, API unit 8/8; integration thêm 4 ca (OTP sai/khoá/gửi lại/hết hạn/một lần, phone, hồ sơ cần OTP + trigger email, Google không tự liên kết) đều qua. E2E: `account.spec` (phone OTP + đổi hồ sơ qua modal OTP) và luồng đăng ký trong `game.spec`/`admin.spec` qua trên mobile; ca Chromium đầu tiên mỗi lượt chạy bị reload trang giữa chừng (form bị xoá trắng) khi Vite dev server/phiên khác đang sửa file, chưa tái hiện ổn định nên chưa kết luận. Gửi email OTP qua SMTP thật và SMS gateway thật chưa xác minh (test dùng outbox).

## Phong cảnh theo địa điểm và giờ địa phương (07/11/2026)

Mỗi loại địa hình có bộ cảnh, màu nước, sương, sóng và đạo cụ riêng; trời/ánh sáng/âm thanh theo giờ thực của người chơi (múi giờ thiết bị gửi lên server, có giờ mùa hè). Kiểm tra: unit API 18, game-core 31 (thêm ca múi giờ), typecheck toàn repo, color lint, build web; chụp headless 6 địa hình ở 06:00/08:00/12:00/17:30/20:00–22:00 và trời mưa, không lỗi console. Chưa nghe thử âm thanh trên thiết bị thật; giờ mặt trời mọc/lặn cố định khoảng 06:00/18:00, chưa theo vĩ độ/mùa. Người chơi có thể đổi múi giờ thiết bị để rơi vào giờ chạng vạng (hệ số ×1,15 cho cá khỏe); cân nhắc khóa múi giờ theo tài khoản nếu đo thấy lạm dụng.

## Giới hạn còn lại trước phát hành

- Chưa có playtest người thật, cân bằng dài hạn, số liệu retention hoặc tải100CCU; chưa xác minh Safari/iOS/Android thiết bị thật. Mobile hiện kiểm bằng Chromium viewport/touch emulation.
- Three.js lazy chunk khoảng137KB gzip (Phaser cũ ~341KB); build vẫn có cảnh báo chunk>500KB trước nén. Cảnh 3D chưa đo FPS/nhiệt trên thiết bị di động thật. PostgreSQL adapter/pg8 có cảnh báo deprecation khi hàng đợi query trong transaction; các ca concurrency đã qua, cần theo dõi khi nâng pg9.
- Chưa provision/staging/deploy/VPS/domain/TLS/Cloudflare/R2 hoặc chạy GitHub Actions trên remote. Redis production/SMTP thật, runtimeDBcredentials, backup mã hóa/offsite/WAL/monitoring phải do môi trường vận hành cấu hình.
- Pháp lý/định danh/tuổi/guardian/giới hạn thời gian chơi, privacy/retention/support cần hoàn tất trước beta bên ngoài. Đăng ký email/phone/Google có OTP đã có, nhưng SMS provider thật, GOOGLE_CLIENT_ID production và yêu cầu liên kết số di động cho mọi tài khoản (nếu NĐ 147 áp dụng) chưa chốt; PUBLIC_RELEASE_APPROVED mặc địnhfalse. Lộ trình kinh doanh/pháp lý: [BUSINESS_PLAN](docs/BUSINESS_PLAN.md).
- Chưa có MFA/step-up cho mọi hành động quản trị, UI cấp role nâng cao hoặc worker xuất analytics ngoàiDB. Eventengine/multiplayer/chat/guild/trading/premium/ads ở backlog; thanh toán đã có source và kiểm thử local, còn merchant sandbox/certification như phần trên.

Tài liệu Discovery vẫn giữ làm hồ sơ đề xuất; [IMPLEMENTATION_CONTRACT](docs/IMPLEMENTATION_CONTRACT.md), source runtime và phần cập nhật đầu API/DATABASE/ARCHITECTURE/DEPLOYMENT mô tả hành vi hiện tại. Xem [README](README.md) để chạy và [TODO](TODO.md) cho phần tiếp theo.

## Cleanup sau nghiệm thu

Lần nghiệm thu ban đầu đã dọn database restore/mail, role thử quyền và SMTP tạm. Lần cập nhật shared UI/skills dọn database E2E/integration và artifact kiểm thử riêng; giữ nguyên PostgreSQL/API/web/admin đang được người dùng chạy cùng dữ liệu ứng dụng. Giữ source, test suite chính thức và build.
