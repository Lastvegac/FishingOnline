# Changelog

## 2026-11-07 — Mồi câu, tiến độ cấp và ảnh đại diện

- Hết mồi vẫn bấm Thả câu để mở modal cảnh báo/mua ngay tại hồ; dùng chung form xác nhận mua với tiệm đồ câu, tự chọn mồi vừa mua và giữ nguyên địa điểm/phí cho lượt tiếp theo. Mở/đóng/mua không tạo lượt hay thu thêm phí.
- Nút mồi có chỉ dẫn “Bấm để đổi mồi”, mũi tên và giải thích Việt–Anh về loài cá bị thu hút; giữ cơ chế bait affinity/ecology trên server.
- Header hiện cấp và XP còn thiếu trên mobile/desktop; sảnh/hồ sơ dùng chung thanh tiến độ nhận từ `PlayerDto.levelProgress` do server tính. Sảnh mobile có thẻ tiến độ gọn và nút Đổi ảnh đại diện. Bốn biểu tượng hiện có vẫn xác nhận OTP; avatar đã lưu hiển thị đồng bộ trên header, sảnh, hồ sơ và bảng xếp hạng.
- Gắn khôi phục phiên với ID tài khoản trong tab (không lưu token), chặn cookie/grant thuộc tài khoản khác trước khi nhận danh tính. Cookie lệch đưa về login thay vì tự đổi tài khoản; không rotate cookie của tài khoản khác.

## 2026-11-07 — Cân đối giỏ cá

- Modal giỏ cá tại hồ rộng tối đa 900px qua tùy chọn `wide` của shared Modal. Lưới tự giảm cột theo không gian; ảnh, độ hiếm, tên, trọng lượng và hàng đổi Gold thẳng hàng giữa các thẻ, kể cả tên dài. Nút “Đổi cá” giữ một dòng.

## 2026-11-07 — Giỏ cá tại hồ và biểu mẫu vận hành

- Kết quả câu mở giỏ ngay trong hồ; thêm icon giỏ ở header, giữ hồ qua URL và đóng giỏ để câu tiếp. Xem/đổi cá không tạo lượt/thu thêm phí; hiển thị phí lượt thả câu mới theo chính sách backend hiện có.
- Sửa Escape trong dialog lồng chỉ đóng dialog trên cùng.
- Quản trị thời trang dùng biểu mẫu vật phẩm/bộ sưu tập/sự kiện/pass thay JSON; icon bút sửa góc phải trên, mã/version tự quản lý, lịch giờ thiết bị, validation và nhãn Việt–Anh. Giữ RBAC/audit/idempotency và giá dạng chuỗi chính xác.

## 2026-11-07 — Gọn trang thanh toán và giữ phiên web/admin

- Thu gọn typography và khoảng cách; đưa số liệu tổng quan lên đầu, gom bộ lọc/trạng thái/lịch sử đơn, thêm xóa lọc và empty state đơn/catalog. Số tiền đọc được trên màn hình hẹp; nhãn Việt–Anh và shared components/tokens.
- HMR giữ auth runtime và React root; reload khôi phục cookie-backed session. Retry lỗi mạng/429/5xx khi bootstrap, hiện retry tại URL hiện tại khi API vẫn lỗi; không coi lỗi tạm thời là logout. Phiên bị từ chối vẫn về login và protected fishing context giữ policy cũ.

## 2026-11-07 — Bố cục, bản dịch và chủ ví trong admin

- Thẻ thời trang dịch tên/slot/cách mở khóa, giá hiển thị đúng Gold/Kim cương/miễn phí và nút có hàng riêng; loại trang bị có nhãn Việt–Anh.
- Sổ cái hiển thị tên và ID chủ ví do API trả, tìm theo tên/ID người chơi/ID ví; chi tiết có ID ví và tham chiếu. Giữ quyền đọc SUPER_ADMIN/SUPPORT và lịch sử bất biến.
- Bộ lọc đơn hàng có placeholder ID người chơi (UUID) Việt–Anh.

## 2026-11-07 — Ảnh cá đúng tỷ lệ và bo góc đồng bộ

- `FishArt` hiển thị toàn bộ ảnh theo tỷ lệ gốc, giới hạn trong khung responsive và bo góc trực tiếp trên ảnh. Áp dụng cho bảng/editor admin, sổ cá, giỏ cá, chi tiết, kết quả câu, chat và ảnh upload/HTTPS.
- Bỏ chiều cao ảnh cố định ở thẻ/chi tiết/kết quả; thumbnail admin giữ cỡ gọn. Caption nguồn có hàng riêng và thông báo ảnh thiếu/lỗi vừa khung nhỏ.

## 2026-11-07 — Nút cảnh báo dịu mắt hơn

- Shared `Button` kiểu `danger` (gồm “Ẩn loài cá”) dùng nền hồng nhạt, chữ đỏ trầm và viền nhẹ; hover có nền đậm hơn. Màu lấy từ semantic tokens, tương phản chữ thường/hover đo trên Chromium là 5,54:1/4,80:1.

## 2026-11-07 — Hai tab túi đồ và mở trực tiếp giỏ cá

- Tách **Trang bị** và **Giỏ cá của bạn**, giữ bộ lọc/tủ đồ trong tab Trang bị; nhãn Việt–Anh dùng shared `Tabs`.
- Nút mở giỏ ở kết quả câu đi thẳng tới tab Giỏ cá; URL giữ tab khi tải lại và Back/Forward. Kiểm tra Chromium desktop/mobile với API mock 4/4 PASS; typecheck web/UI, lint phần sửa và build web PASS.

## 2026-11-07 — Tải và cập nhật ảnh cá, dịch nhật ký quản trị

- Thêm/sửa cá chọn ảnh trực tiếp từ máy, xem trước, bỏ lựa chọn; lưu mới thay ảnh hiện tại. Chọn tệp dùng control chung có nhãn Việt–Anh; đường dẫn ảnh chuyển vào tùy chọn nâng cao.
- API nhận `photoUpload` cùng request cá, kiểm file JPEG/PNG/WebP/AVIF ≤5 MB và ≤20 megapixel, chuẩn hóa WebP ≤1600px và bỏ metadata. Ảnh, cấu hình và audit commit cùng transaction; lỗi/version conflict không giữ ảnh dang dở. Ảnh cũ bất biến để snapshot vẫn tải được; không đưa base64 vào config/audit.
- Mã action/đối tượng/lý do hệ thống trong nhật ký gần đây, bảng nhật ký, tìm kiếm và phần chi tiết được dịch Việt–Anh. Nội dung tự nhập và dữ liệu gốc được giữ nguyên.
- Migration `202611070012_fish_photos` thêm kho ảnh PostgreSQL; không thay ledger, catch hoặc cấu hình đã xuất bản.

## 2026-11-07 — Giá mở đầu thu hút người chơi

- Giảm giá đồ câu/mồi và phụ kiện Gold; giữ đồ miễn phí/cấp độ, thêm mức 30–100 Kim cương cho cosmetic chọn lọc. Hai gói 10.000đ/100 và 20.000đ/200 Kim cương cùng tỷ lệ, không bonus nạp lớn.
- CLI preview/apply có transaction/version/audit, seed cài mới và retry no-op; đã áp dụng local v2 → v3 (17 offer, 26 cosmetic, 2 gói). Giữ wallet/ledger, ownership và snapshot; sửa kiểm tham chiếu config để publish được sau đơn Kim cương.
- Catalog hiển thị giá Việt–Anh khi checkout disabled; chưa bật thanh toán thật. Typecheck, ESLint phần sửa, 53 unit, 25 integration, kiểm tra pricing riêng, 20 ca UI và build web/API PASS. Bảng giá/cấp và giới hạn: `docs/LAUNCH_PRICING.md`.

## 2026-11-07 — Độ hiếm đa ngôn ngữ và ảnh cá trong quản trị

- Ô chọn, badge và tìm kiếm độ hiếm dùng cùng nhãn Việt–Anh; giữ mã enum khi gửi API.
- Thêm cá bằng form có ảnh bắt buộc và xem trước; sửa ảnh qua URL HTTPS, đường dẫn ảnh `/fish/` hoặc mã ảnh có sẵn `fish/<slug>`. Danh sách và xác nhận ẩn cá có ảnh; ẩn bằng `active=false` qua cơ chế version/audit hiện có, giữ catch/collection.
- `FishArt.imageKey` dùng ảnh đã lưu từ DTO ở bộ sưu tập, giỏ cá, chat hồ và kết quả câu; ảnh cũ vẫn hỗ trợ slug. Admin dùng lại thư mục ảnh thật qua symlink `public/fish`, giữ favicon riêng. CSP cho phép ảnh HTTPS.

## 2026-11-07 — Ảnh cá nét căng khung, động tác câu và mặt nước chân thật hơn

- Thẻ/chi tiết cá nay phủ kín khung xám (`object-fit: cover`, bỏ padding khung ảnh) và có bản ≤1600px trong `public/fish/hd` kèm `srcSet`/`sizes`, nên màn retina không bị vỡ hạt; ảnh gốc lấy từ Wikimedia/iNaturalist, giữ nguyên bố cục đã crop.
- Vòng câu diễn hoạt thật: vung cần qua vai có nhịp tải–bật, phao bay theo đường vòng từ đầu cần ra điểm rơi rồi tóe nước; chờ cá giữ dáng tĩnh, cắn câu thì chúi theo phao, giật mạnh, lúc đánh cá thì nâng–hạ cần và quay máy (tay kia theo tay quay), thu dây kéo phao về đầu cần khi kết thúc. Cần câu uốn như lò xo giảm chấn, cá mắc câu quẫy sát phao.
- Mặt nước dùng shader dòng chảy (normal động trôi theo dòng, ánh trời Fresnel): suối đổ xuôi có nước trắng; Suối Đá Mây thành suối cạn trong vắt nhìn thấy đáy sỏi, đá cuội và thác bậc đổ về phía người chơi; Bến Sông Đào có bến đò và chiếc đò mui lá với người lái nón lá chống sào qua lại, để lại vệt sóng. Màu vẫn trong token POSORA.

## 2026-11-07 — Admin dễ vận hành hơn, favicon và phiên đăng nhập

- Favicon riêng cho admin (nền tối, cá vàng) để phân biệt với tab game; tiêu đề tab đổi theo trang và ngôn ngữ, ví dụ “Loài cá · Fishing World Quản trị”.
- Menu chia nhóm Tổng quan / Nội dung game / Người chơi & giao dịch / Hệ thống & kiểm soát, lọc theo vai trò; icon riêng cho Thời trang/Phân tích; breadcrumb, chip tài khoản, topbar dính, skip link và cỡ chữ 13–14px dễ đọc. Tổng quan có lối tắt vận hành theo quyền và thời điểm cập nhật dữ liệu.
- Bảng dữ liệu: sắp xếp theo cột (`aria-sort`), tìm kiếm không dấu ở nội dung game, người chơi, sổ cái và nhật ký; đếm số mục, trạng thái “không có kết quả”, header dính, badge độ hiếm/trạng thái và Gold +/− có màu. Mỗi trang có error boundary riêng để một lỗi render không làm trắng toàn admin.
- Sửa sổ cái Gold trước đây hiện “—” vì đọc `amount`/`balanceAfter`/`userId`; nay dùng đúng `deltaGold`/`balanceAfterGold`/`walletId` của API.
- Auth admin tách sang `apps/admin/src/auth.ts`, vẫn dùng transport chung với web (access JWT trong bộ nhớ, refresh cookie HttpOnly xoay vòng, single-flight + Web Locks, tự refresh trước hạn/401). Bổ sung: thông báo khi phiên hết hạn và quay lại đúng trang sau khi đăng nhập lại, deep link chưa đăng nhập, đồng bộ đăng nhập/đăng xuất giữa các tab (BroadcastChannel), kiểm tra lại quyền khi tab quay lại sau ≥ 1 phút, không retry lỗi 4xx.

## 2026-11-07 — Nhân vật Trung Hoa và kinh tế thời trang

- Tạo/lưu nhân vật theo account, năm mẫu, studio 3D xoay/zoom/ngày đêm/chụp ảnh, 12 slot và tùy chỉnh mặt/tóc/tuổi/vóc dáng/màu/họa tiết; dùng chung rig với hồ câu và thumbnail.
- Shop cosmetic thử trước mua, giá server/level/ownership/version, Gold–Kim cương ledger/idempotency; reuse inventory, wallet và payment outbox để cấp Kim cương một lần sau thanh toán hợp lệ.
- Wardrobe 10 bộ, membership 20 khi hiệu lực và giữ bộ đã lưu sau expiry; CRUD/equip/share/like/follow/copy, collection mua phần thiếu, event snapshot/vote/claim và pass nhánh miễn phí/premium.
- Admin item/collection/event/pass với RBAC/audit/version và thống kê nguồn–sink, lượt mua/doanh thu VND/conversion. Appearance/presence xác minh server, action câu lấy từ session.
- Tiếp tục model procedural theo lựa chọn người dùng; chưa có pipeline upload GLB/PBR và một số perk/event nâng cao. Chi tiết phase, kiểm thử và giới hạn ở `docs/CHARACTER_FASHION.md`; migration ứng dụng và merchant thật chưa chạy.

## 2026-11-07 — Mỗi điểm câu một phong cảnh, ánh sáng và âm thanh theo giờ địa phương

- Sáu bộ địa hình 3D: Hồ (sen, lau, rừng thông), Sông (nước phù sa, lũy tre, bãi bồi, xuồng), Suối (nước trong, đá rêu, thác, núi cao, sương gần), Rừng sâu (nước đầm tối, cây cổ thụ, dây leo, khúc gỗ rêu, đom đóm), Nước lợ (bãi bùn, rừng đước rễ chống, cọc đáy, chòi canh có đèn), Biển (ra tới chân trời, ghềnh đá có bọt sóng, dừa, hải đăng). Màu đều lấy từ token POSORA.
- Bầu trời, mặt trời/trăng/sao, màu và cường độ ánh sáng, sương chạy theo giờ thực của người chơi: đêm, bình minh, ban ngày, giờ vàng, hoàng hôn; thời tiết làm trời xám/tối. Thẻ bản đồ hiển thị đúng địa hình theo giờ thiết bị.
- Âm thanh nền tổng hợp theo địa điểm/giờ: sóng biển, suối/sông róc rách, ve sầu rừng, dế/ếch ban đêm, chim ban ngày, hải âu ven biển, cú trong rừng; nhạc nhỏ lại ban đêm.
- Client gửi `X-Time-Zone` (IANA); server tính giờ địa phương (có giờ mùa hè) cho điều kiện nước và hệ số giờ chạng vạng khi chọn cá. Thiếu/sai múi giờ thì dùng giờ Việt Nam như trước.

## 2026-11-07 — Cuộn mượt và chuyển động UI

- “Cách chơi”/“Hành trình” cuộn mượt, chuyển focus đúng section, hỗ trợ hash trực tiếp/Back và hiện liên kết ở mobile. Landing có hiệu ứng hiện nội dung khi cuộn tới, fallback hiển thị khi không có IntersectionObserver.
- Dùng motion tokens chung cho nút/toggle/điều hướng, fade khi đổi route, mở modal/backdrop, toast và trạng thái empty/error/notice; không thêm dependency hoặc chờ animation trước thao tác gameplay.
- “Giảm chuyển động” áp dụng cho DOM toàn web, đồng thời tôn trọng tùy chọn hệ điều hành, bỏ delay/lặp/cuộn mượt và giữ nội dung đọc được.
- Xác minh trên build cố định với API mock: 8 ca Chromium desktop/mobile cho giảm chuyển động, Settings, Việt–Anh/hash và regression shared UI PASS; 2 ca cuộn/bàn phím/Back/reveal/layout 320/1440px PASS bằng Chromium mặc định, tắt WebGL riêng khi lấy mẫu scroll để tránh chi phí shader SwiftShader. Typecheck UI/web/admin, ESLint App, Prettier phần sửa, color lint và build web PASS. Còn cảnh báo chunk/dependency; chưa đo FPS cảnh 3D, Safari hoặc thiết bị thật.

## 2026-11-07 — Giữ đăng nhập, hoàn tất lượt câu trước khi yêu cầu login lại

- Tự refresh JWT trước hạn/401, giữ idempotency key, phối hợp Web Locks giữa tab cùng origin; không logout do mạng/429/5xx hoặc login sai. Xử lý logout 204 và vô hiệu hóa response cũ sau khi đổi auth.
- Cấp quyền cookie HttpOnly giới hạn cho đúng lượt câu đã cast để tiếp tục khi refresh hết hạn, kể cả reload; không gia hạn deadline engine hoặc mở quyền cast/shop/wallet/admin/payment socket. Natural expiry tách khỏi revoke do reuse/logout/reset/khóa tài khoản.
- Giữ màn câu/kết quả cho đến khi người chơi đóng hoặc chủ động rời hồ; thông báo Việt–Anh và nút đăng nhập lại dùng shared UI. Kết quả đã lưu không bị giữ kẹt khi quyền hoàn tất đã hết hạn.
- API và transport được kiểm trên database/test riêng; xem PROJECT_STATUS cho số pass và giới hạn browser thực tế.

## 2026-11-07 — Hiện đầy đủ ảnh mọi loài cá

- Bỏ làm xám/giảm sáng cá chưa khám phá trong sổ cá; cả 37 loài hiển thị ảnh thật rõ màu, giữ trọn thân/vây/đuôi bằng `FishArt` hiện có. Nhãn khám phá và số lần bắt vẫn phản ánh tiến trình.
- Chi tiết kỷ lục, giỏ cá, kết quả câu và cá chia sẻ tại hồ dùng ảnh thật cả khi có chiều dài; bỏ tự chuyển sang model. Cập nhật tiêu chí ảnh trong `docs/ASSETS.md`.
- Xác minh đủ 37 ảnh và nguồn/giấy phép; Chromium API mock kiểm 148 ảnh thẻ + 148 ảnh chi tiết ở 320px/1440px, Việt/Anh và tám ca loading/empty/error/ảnh lỗi qua. Typecheck web, ESLint phần sửa và build web qua; chưa kiểm thiết bị thật.

## 2026-11-07 — Điều hướng và trải nghiệm mobile

- Header mobile dùng logo cá hiện có, gọn một hàng với Gold/avatar; chọn ngôn ngữ đầy đủ chuyển vào menu Thêm và vẫn có trong Settings.
- Màn con có Quay lại (mở trực tiếp thì về sảnh) và Về sảnh; logo trong app về sảnh, menu/điều hướng desktop có Trang chủ dự án. Nhãn bottom navigation Việt–Anh không còn cắt từ câu dài; Thêm đánh dấu khi đang ở mục phụ.
- Thu gọn heading, notice và bố cục nhiệm vụ trên mobile, giữ nút nhận thưởng cao ít nhất 44px và hiện XP. Có gợi ý khám phá hồ/sổ cá ở cuối trang, kể cả khi danh sách rỗng/lỗi. Khi đổi trang, nội dung mở từ đầu.

## 2026-11-07 — Màn câu gọn cho mobile, nhạc nhẹ và phản hồi rung

- Ưu tiên cảnh hồ; chỉ hiện căng dây/tiến độ khi đấu cá. Gom các chỉ số phụ và bộ chỉnh vào bảng mở khi cần; mồi/trang bị dùng Modal chung, cộng đồng chỉ tải khi mở.
- Thêm nhạc ngũ cung stereo, nước bắn/cá đớp/máy câu trong một AudioContext; phát sau thao tác thật, có mute và dừng khi ẩn tab/rời màn. Rung có nút bật/tắt riêng, theo tín hiệu chạm mồi, đớp, sức căng và kết quả trên thiết bị hỗ trợ.
- Nối animation nhân vật trong cảnh, cần cong theo tải server, phao nghiêng/chìm và dây chùng/căng. Giữ luật câu và kết quả ở server.
- Xác minh: typecheck web/UI, ESLint phần sửa, color lint và build web PASS; Playwright 4/4 desktop/mobile gồm UI/âm thanh/rung bằng API mock và luồng câu/đổi cá/lưu dữ liệu thật. Chưa đo cảm giác rung/âm lượng hoặc FPS trên điện thoại thật.

## 2026-11-07 — Sửa bố cục thẻ và rà soát UI web/admin

- Thêm `Card padded` tương thích với các thẻ hiện có; áp dụng cho thời trang, bộ phối/sự kiện/pass, catalog/lịch sử/chi tiết thanh toán và thẻ quản trị thiếu khoảng đệm. Giữ nguyên các thẻ có ảnh/bảng sát mép và các layout đã có padding riêng.
- Lưới thời trang tự chọn số cột theo chiều rộng thực tế; thống nhất khoảng cách badge/tiêu đề/mô tả/action, nhóm nút bộ sưu tập và giữ nội dung dài trong thẻ. Thanh chỉnh ngoại hình dùng `RangeField` chung; tab nhân vật đồng bộ URL và có fallback cho tab không hợp lệ.
- Bổ sung nhãn Việt–Anh còn thiếu cho admin thời trang, nhãn/màu semantic cho độ hiếm Thần thoại và vùng cuộn bảng thống kê. Sửa selector CSS Modules của Gold trong thẻ nhiệm vụ.
- Bổ sung public subpath `@fwo/ui/character-preview` để consumer dùng preview 3D mà không tạo vòng phụ thuộc giữa các chunk; giữ export cũ tương thích.
- Xác minh Chromium với API mock: 144 tổ hợp màn/viewport/locale không có tràn ngang hoặc pageerror; 32 kiểm tra tập trung trên production build (360px/1440px, Việt/Anh, market, dialog, loading/empty/error và catalog thanh toán) PASS; 2 regression shared UI có sẵn PASS ở desktop/320px. Typecheck toàn workspace, ESLint source UI và color lint PASS; build web/admin PASS, hết cảnh báo vòng chunk preview, còn cảnh báo kích thước bundle/dependency. Không nghiệm thu Safari/thiết bị thật hoặc giao dịch thật trong lượt rà soát này.

## 2026-11-07 — Fishing simulator

- Mở rộng engine hiện có với profile loài và điều kiện nước/giờ/thời tiết snapshot; chọn hướng/lực/độ sâu, điểm rơi theo gió/khối lượng/cần, kiểm mồi/từ chối và tín hiệu cắn thật.
- Fight server theo khối lượng, kiểu chống trả, drag, đối hướng cần, tải dây/giãn/mài mòn; đứt/chùng dây, kiệt sức và landing. Phiên legacy giữ luật cũ, giá/thưởng/ledger giữ policy hiện có.
- Shared range controls, 6 chỉ số fight, metadata chiến lợi phẩm/kỷ lục, model theo chiều dài, cảnh nước/ngày đêm/mưa/sương và ambient/reel/cue; chế độ ngắm cảnh/fullscreen và i18n Việt–Anh.
- Thêm chat/khoe cá tại điểm câu và bảng kỷ lục tuần miễn phí, migration bảng chat/index; chỉ dùng catch đã lưu và kiểm sở hữu/idempotency/cooldown.
- Thêm regression engine, mở rộng integration/E2E hiện có, ghi báo cáo 11 phase và các hạng mục chưa làm tại `docs/SIMULATOR.md`. Chưa triển khai bộ công thức/kỹ năng/phụ kiện đầy đủ, giải đấu đăng ký có thưởng hoặc nghiệm thu hiệu năng/thiết bị thật.

## 2026-11-07 — Ảnh chụp cá thật theo yêu cầu người dùng

- `FishArt` hiển thị ảnh chụp thật cho 37 loài trong sổ cá/giỏ cá/kết quả câu; thay nhóm ảnh cá chợ/mẫu vật xấu bằng ảnh cá khỏe, ưu tiên ảnh đang sống. Cá diêu hồng dùng ảnh thân sáng, vây xòe rõ thay ảnh nằm trên sàn.
- Giữ trọn ảnh bằng `object-fit: contain`, ghi công/link nguồn dưới ảnh chi tiết và có trạng thái ảnh lỗi đã dịch Việt–Anh. Cập nhật hướng dẫn để giữ lựa chọn ảnh thật cho các lần sửa UI sau; cảnh gameplay vẫn 3D.

## 2026-11-07 — Thanh toán VND realtime

- Thêm catalog/đơn VND, adapters MoMo/VNPay và ATM/Visa/Mastercard qua VNPay hosted checkout; mặc định disabled, không tự đặt giá bán.
- Xác minh IPN và query phía server, unique receipt/fulfillment, outbox retry và lịch sử bất biến; cấp inventory không phụ thuộc browser/admin xác nhận.
- WebSocket xác thực theo user/family, Redis fan-out và refetch khi reconnect; Shop, lịch sử/trạng thái đơn, popup nhận đồ và admin báo cáo/đối soát có audit.
- Thêm migration, official regression tests, environment configuration và hướng dẫn tại docs/PAYMENTS.md. Chưa có merchant để nghiệm thu kết nối sandbox/production.

## 2026-11-07 — Tên ngôn ngữ đầy đủ và cờ

- `LanguageSelector` chung hiển thị 🇻🇳 Tiếng Việt / 🇬🇧 Tiếng Anh (English khi giao diện Anh) trong cả control và danh sách, theo component thực tế của workspace POSORA. Bỏ chế độ VI/EN và tăng chiều rộng để đọc trọn tên.
- Header web mobile cho phép các control xuống dòng, giữ cờ/tên đầy đủ cùng số Gold và avatar.
- Hàng ngôn ngữ trong Settings tự xuống dòng khi hẹp, tránh ép mô tả thành cột chữ mỏng; 4 kiểm tra bổ sung cho tiếng Việt/Anh ở 320px/1440px qua.
- Xác minh: 12 trường hợp Chromium desktop/320px với API mock qua, gồm tên/cờ, focus, đổi locale/reload và layout; typecheck UI/web, ESLint phần sửa và color lint qua. Typecheck admin còn lỗi khóa `ui.created` ngoài phạm vi; chưa xác minh popup native bằng bàn phím trên headless macOS hoặc thiết bị thật. Dọn script/ảnh/server tạm.

## 2026-11-07 — Hình cá khỏe, mượt và đồng nhất

- `FishArt` dùng cá 3D cho sổ cá/giỏ cá/kết quả câu, thay ảnh cá chợ và mẫu vật có vẻ trầy xước. Làm mịn thân, màu chuyển nhẹ với bụng sáng, vây bo mềm và đuôi có tia vây mảnh; giảm kích thước mắt và nét mang.
- Bổ sung nhóm màu cho 37 loài và căn camera theo kích thước cá. Lưới dùng ảnh render cache từ một WebGL context, chi tiết giữ thao tác xoay và giảm chuyển động; giữ nguồn/giấy phép của ảnh cũ trong hồ sơ asset.

## 2026-11-07 — Bộ chọn ngôn ngữ theo mẫu POSORA

- `LanguageSelector` mặc định dùng VI/EN trên landing, auth, header và Settings của web/admin; nút cao 48px, bo góc, mũi tên xuống, focus viền đậm/vòng xám và tooltip tên đầy đủ. Giữ tùy chọn `compact={false}`.
- Qua typecheck UI/web/admin, ESLint component, color lint và 8 ca Chromium ở 1440px/320px: kích thước/focus, đổi ngôn ngữ, reload và đồng bộ hai tab. Các ca dùng mock API trên landing/login/register web và login admin; chưa kiểm trình duyệt/thiết bị thật khác. Script, ảnh và server kiểm thử tạm đã dọn.

## 2026-11-07 — Xác thực OTP, đăng ký bằng số điện thoại/Google, email bất biến

- Đăng ký bằng email (OTP qua email), số di động Việt Nam (OTP qua SMS webhook) hoặc Google; tài khoản chỉ được tạo sau khi xác thực. OTP 6 số, 10 phút, khoá sau 5 lần sai, gửi lại có cooldown, chỉ lưu HMAC.
- Đổi tên cần thủ/avatar phải nhập OTP gửi tới email (hoặc SMS); email không thể thay đổi ở API, UI và database trigger. Hồ sơ hiển thị avatar đã chọn, email/số điện thoại khoá.
- Đăng nhập/quên mật khẩu bằng email hoặc số điện thoại; migration `202611070003_otp_identity` (phone, identities, otp_challenges, email/password nullable có ràng buộc).
- PWA manifest/icon, viewport-fit cho mobile; docs/BUSINESS_PLAN.md: lộ trình hợp thức hoá, giá thấp, nguồn B2B, kịch bản 50.000 MAU.
- Kiểm tra: contracts 4, API unit 8, integration (4 ca auth mới) qua; E2E OTP đăng ký phone/email + đổi hồ sơ qua trên mobile và admin flow; xem PROJECT_STATUS cho ca Chromium không ổn định.

## 2026-11-07 — Điểm câu theo địa hình, 37 loài cá và tiệm địa phương

- 6 điểm câu: Hồ Sen (hồ, cấp 1, miễn phí), Bến Sông Đào (sông, cấp 2), Suối Đá Mây (suối, cấp 3), Đầm Rừng Sâu (rừng sâu, cấp 4), Cửa Sông Nước Lợ (nước lợ, cấp 5), Ghềnh Biển Gió (bờ biển, cấp 6); phí vào 0–25 Gold.
- 37 loài (thêm 27) với tên khoa học, loại nước chịu được (ngọt/lợ/mặn) và nơi sống thật. Schema cấu hình từ chối đặt cá vào điểm câu sai loại nước (ví dụ cá chép ở biển, cá nục ở hồ) và yêu cầu mỗi điểm có ít nhất một loài dễ.
- Ảnh chụp thật cho mọi loài (Wikimedia Commons, PD/CC BY/CC BY-SA) thay hình 3D trong bộ sưu tập, kết quả câu và giỏ cá; ghi công hiển thị ở chi tiết và trong docs/ASSETS.md.
- Mồi mới (ốc, dế, cá mồi, tôm, mực) và trang bị địa hình (4 cần, 2 dây, 2 lưỡi). Chỉ số dây/lưỡi giờ cộng vào cần cho cả bộ (đồ cũ có 0 nên không đổi cân bằng).
- Tiệm theo điểm câu: offer có `locationIds`; hàng địa phương chỉ mua/bán tại điểm câu đã mở khóa. Bán lại mồi/trang bị với `sellPriceGold` luôn thấp hơn giá mua; giun starter không thu mua để mồi cứu trợ không thành nguồn Gold. Ledger `ITEM_SALE`, idempotency, không bán khi đang câu hoặc đang trang bị.
- `pnpm db:seed` trên database đã có cấu hình: publish version mới chỉ bổ sung nội dung/trường còn thiếu, giữ giá trị admin và không hồi sinh điểm câu/offer/nhiệm vụ admin đã gỡ. Phiên đang chạy giữ snapshot.
- Kiểm tra: game-core 21, contracts 4, api unit 8, integration 16 (thêm ca tiệm địa phương/bán lại) đều qua; typecheck toàn repo và lint màu qua. Chưa chạy E2E Playwright. Số cân bằng (giá, phí, tỷ lệ) là giả thuyết cần đo theo cohort.

## 2026-11-07 — Password icons và nền tảng i18n

- Shared PasswordInput có placeholder mặc định và icon Eye/EyeOff, nhãn truy cập Việt–Anh.
- Chuyển chuỗi giao diện web/admin và shared validation sang catalog Việt–Anh có kiểu; selector dùng chung, lưu lựa chọn, đồng bộ tab cùng origin và format số/ngày theo locale.
- Bổ sung quy ước i18n bắt buộc cho UI tiếp theo theo cơ chế POSORA; nội dung game từ API và thông báo server chưa có catalog giữ nguyên nguồn.
- Kiểm tra UI tập trung: 10 ca Chromium desktop/mobile qua, gồm regression form có trước; không dùng database ứng dụng.

## 2026-11-07 — Đổi cá sang Gold trong game

- Cá của phiên mới vào giỏ trong Túi đồ; XP, bộ sưu tập và nhiệm vụ ghi nhận ngay, Gold chỉ cộng sau xác nhận đổi cá.
- Giá thử nghiệm: 10% Gold cơ sở đã tính theo trọng lượng, làm tròn xuống, tối thiểu 1/tối đa 100 Gold/con; hạn mức đổi cá 100 Gold/ngày Việt Nam. Giá được snapshot từ lúc bắt đầu phiên và giữ khi cá nằm trong giỏ.
- Đổi cá có kiểm tra chủ sở hữu/giá, transaction, khóa người chơi, ledger và idempotency. Cá/phiên cũ đã hoặc sẽ nhận Gold tự động không được đổi thêm; migration không sửa số dư hay lịch sử.
- Dùng Gold tại tiệm hiện có để mua vật phẩm trong game. Quà ngoài đời là hướng mở rộng sau; chưa có quy đổi tiền/quà thật hoặc nguồn thu thật.

## 2026-11-07 — Rà soát UI cơ bản

- Thu gọn focus ring; thống nhất select, disabled fields và focus lỗi qua shared UI.
- Sửa icon avatar bị co nhỏ, nút tự submit form, className của IconButton và lỗi hồ sơ hiển thị lặp.
- Modal cuộn phần nội dung, giữ action footer trong viewport và trả focus đúng khi đóng dialog lồng nhau.
- Bổ sung dạng VI/EN gọn cho bộ chọn ngôn ngữ ở header; giữ đủ chỗ cho số Gold và avatar tại 320px.
- Bổ sung menu mobile, accessible names cho điều hướng dạng icon, giữ cột dữ liệu qua vùng bảng cuộn ngang và sửa header/thống kê ở 320px.
- Phân biệt màu cảnh báo căng dây, loại progressbar lồng nhau; thêm regression cho shared controls và mở rộng rà soát các màn web/admin.

## 2026-11-07 — Đồ họa 3D

- Thay toàn bộ đồ họa 2D (cảnh Phaser, SVG hồ/cá/trang bị) bằng 3D Three.js procedural trong `packages/ui/src/three`: cảnh Hồ Sen thời gian thực (mặt nước động, sen, rặng cây, đồi, cầu gỗ, cần thủ, phao/dây/ripple, cá bơi dưới nước), 10 model cá theo đặc điểm loài và 4 model trang bị.
- Màn câu cá ánh xạ snapshot server sang cảnh 3D (phao rung khi cá cắn, cần cong và phao bị kéo theo tiến độ khi đấu cá); chạm mặt hồ vẫn điều khiển như trước. Gỡ dependency Phaser.
- Lưới sổ tay/túi đồ/tiệm dùng ảnh render từ một WebGL context chung; view chi tiết và kết quả bắt cá dùng turntable 3D kéo xoay được. Tôn trọng tùy chọn giảm chuyển động, dừng render khi khuất màn hình, fallback gradient khi không có WebGL.
- Màu 3D đi qua semantic tokens (thêm `--color-scene-light`, `-lotus*`, `-stone` alias palette); Playwright bật WebGL phần mềm (SwiftShader) để E2E render cảnh thật.

## 2026-11-07 — Shared UI và hướng dẫn bảo trì

- Đồng bộ mật khẩu 8–128 ký tự ở web/admin/API; shared form hiển thị viền đỏ và lỗi inline, gồm lỗi server theo field.
- Dùng palette POSORA được cung cấp làm nguồn màu chung cho CSS/SVG/Phaser; thêm semantic aliases và color lint trong lệnh lint.
- Thêm AGENTS.md và sáu skill local cho component, màu, form, module boundaries, economy và verification.
- Xác minh 29 unit, 11 integration và 6 E2E desktop/mobile; build web/admin/API thành công.

## 2026-11-07 — MVP local0.1.0

- Triển khai workspace thực: React/Vite web+admin, shared UI/contracts/config/engine và Fastify/Prisma/PostgreSQL API.
- Hoàn thiện vòng câu side-view Hồ Sen với10 loài, server-authoritative hold/release, animation/sound và tiến trình lưu thật.
- Thêm auth/reset/session/profile, inventory/equip/upgrade/shop/Gold/XP/collection/missions/achievements/leaderboard.
- Thêm admin RBAC/content/config draft+publish/users/ledger/audit/analytics, idempotency/locks/SQL history invariants.
- Thêm migrations/seed, Docker/CI/Nginx/backup/runtimeDBrole, unit/integration và Playwright desktop/mobile.
- Kiểm SMTP/backuprestore/Node bundle và audit dependency; cập nhật README/API/DB/deployment/status. Chưa triển khai public hoặc bật monetization.

## 2026-11-07 — Discovery v0.1

- Tạo bộ tài liệu triển khai Fishing World Online từ master prompt: sản phẩm, nghiên cứu đối thủ, gameplay, UI/UX, kiến trúc, database/API, bảo mật, QA, hạ tầng, backlog/roadmap, kinh doanh/marketing, pháp lý/rủi ro và agent workflow.
- Thêm Prisma schema design và validate bằng CLI 7.10.1; chưa có migrations/seed/runtime.
- Đồng bộ đề xuất side-view/Hồ Sen, starter 200 Gold/20 giun, tick 50ms/input 4Hz, mission grace/daily rescue, immutable ledger/idempotency, config snapshots và role publish.
- Ghi nhận 20 giờ/tuần đã xác nhận; effort/phạm vi/ngân sách còn là giả định để review.
- Thêm README, PROJECT_STATUS và TODO; không tạo ứng dụng hoặc deploy trong lần bàn giao trước code này.
