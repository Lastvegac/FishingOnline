# TODO

## UI thanh toán và giữ phiên — 07/11/2026

- [x] Thu gọn trang thanh toán, responsive số tiền/bộ lọc/trạng thái, xóa lọc và empty state Việt–Anh.
- [x] Giữ auth runtime qua HMR và khôi phục phiên qua cookie khi reload cho cả admin/web; retry lỗi API tạm thời thay vì đá về login. Kiểm 4 ca auth, 4 ca thanh toán và 4 regression UI/form trên Chromium; chưa xác minh Safari/thiết bị thật hoặc auth API thật trong đợt này.

## UI quản trị — 07/11/2026

- [x] Sửa thẻ thời trang chồng giá/nút, dịch tên/loại/cách mở khóa và hiển thị đúng loại giá; dịch loại trang bị.
- [x] Sổ cái nhận tên/ID chủ ví từ API, tìm kiếm và xem chi tiết; placeholder UUID Việt–Anh cho lọc đơn hàng.
- [x] Kiểm Chromium Việt–Anh 320/390/1440px và PostgreSQL riêng cho dữ liệu/quyền sổ cái.

## Scale ảnh cá — 07/11/2026

- [x] Đồng bộ tỷ lệ responsive và bo góc ảnh cá qua shared FishArt; kiểm 37 ảnh thư viện, thumbnail/editor admin và các khung web ở 320/390/1440px, gồm preview/HTTPS/ảnh lỗi.

## Màu nút cảnh báo — 07/11/2026

- [x] Giảm độ chói của “Ẩn loài cá” qua shared Button danger; kiểm tương phản chữ thường/hover ≥4,5:1, focus và loading/disabled trên Chromium.

## Hai tab túi đồ — 07/11/2026

- [x] Tách Trang bị/Giỏ cá của bạn và mở thẳng tab giỏ từ kết quả câu; giữ tab qua reload/Back/Forward.
- [x] Kiểm tra Việt–Anh, keyboard, bộ lọc, trạng thái hai tab và dialog trên Chromium 1440px/320px với API mock.

## Giá mở đầu — 07/11/2026

- [x] Công bố giá Gold cho đồ câu/mồi và Gold/Kim cương cho cosmetic; giữ đường miễn phí, đồ sở hữu và lịch sử. Local đã áp dụng cấu hình v3 và audit.
- [x] Niêm yết gói 10.000đ/100 và 20.000đ/200 Kim cương; giữ checkout disabled khi chưa có merchant; xác minh replay, snapshot, responsive và Việt–Anh.
- [ ] Nghiệm thu merchant sandbox thật trước mở bán; đo D1/D7, tỷ lệ mua, net revenue/chi phí và cân bằng Gold theo cohort trước điều chỉnh giá.

Bảng đầy đủ và vận hành: [LAUNCH_PRICING](docs/LAUNCH_PRICING.md).

## Ảnh cá và độ hiếm trong admin — 07/11/2026

- [x] Nhãn độ hiếm theo ngôn ngữ ở ô chọn, badge và tìm kiếm.
- [x] Form thêm/sửa ảnh cá có validation, xem trước; danh sách/xác nhận ẩn có ảnh, giữ lịch sử và audit.
- [x] Người chơi hiển thị ảnh `imageKey` đã lưu qua `FishArt`.
- [x] Chọn/thay ảnh từ máy trong form thêm/sửa; chuẩn hóa WebP, lưu PostgreSQL cùng transaction cấu hình và audit. Đường dẫn ảnh là tùy chọn nâng cao.

## Nhân vật và thời trang — 07/11/2026

- [x] Nhân vật lưu account, onboarding, năm mẫu, 12 slot, studio 3D ngày/đêm, animation và ảnh outfit render thật.
- [x] Cosmetic Gold/Kim cương với inventory/ledger/idempotency hiện có, backend ownership/slot/level/variant/version; signed payment fulfillment cấp Kim cương một lần.
- [x] Wardrobe 10 bộ, CRUD/equip/share/like/follow/copy; membership hiệu lực 20 bộ và giữ dữ liệu sau expiry; sáu collection mua phần thiếu.
- [x] Event snapshot/vote/quà tham gia một lần, pass miễn phí/premium theo tiến độ cá sau enroll; admin có audit/version/RBAC và metrics ngày/tháng.
- [x] Nhân vật/remote presence trong hồ, lease/movement bounds/speed/sequence và action câu từ session server.
- [ ] Tiếp tục trau chuốt model procedural đã chọn: biểu cảm mặt, collision áo dài khi ngồi, chi tiết vải/tóc và kiểm mọi tổ hợp. Pipeline upload GLB/PBR chỉ bổ sung khi có nhu cầu/asset phù hợp.
- [ ] Membership khung tên/discount/quà login, nhiệm vụ mùa riêng; event jury/ranking reward/title/frame và moderation/report.
- [ ] Đo draw calls/FPS/12 người trên thiết bị thật; tối ưu LOD authored/texture khi có asset, kiểm Safari/iOS và mạng chậm.
- [ ] Playtest giá cosmetic/Gold sink/source/cohort; nghiệm thu merchant sandbox và cấu hình sản phẩm VND thật trước mở bán.

File và kết quả nghiệm thu: [CHARACTER_FASHION](docs/CHARACTER_FASHION.md). Trạng thái migration local đã kiểm tra: 11 migrations up to date; đợt kiểm thử dùng DB riêng.

## Chuyển động UI — 07/11/2026

- [x] Cuộn mượt Cách chơi/Hành trình, bàn phím/hash/Back, liên kết mobile và reveal; motion tokens cho shared controls, đổi màn, mở dialog và thông báo/trạng thái.
- [x] Giảm chuyển động áp dụng cho UI web và theo hệ điều hành; kiểm tra Chromium desktop/mobile Việt–Anh cùng regression shared UI.
- [ ] Playtest chuyển động trên Safari/iOS/Android thật và đo FPS cảnh 3D; hiệu ứng DOM đã kiểm tra chưa chứng minh hiệu năng scene.

## Trải nghiệm mobile và điều hướng — 07/11/2026

- [x] Logo trong header mobile, Quay lại/Về sảnh, đường tới trang chủ dự án, menu Thêm chỉ rõ mục đang xem và giữ bộ chọn ngôn ngữ đầy đủ.
- [x] Bố cục nhiệm vụ hẹp, nút nhận thưởng ≥44px, hiện Gold/XP và gợi ý khám phá hồ/sổ cá; đổi trang mở từ đầu.
- [ ] Playtest với người mới trên iOS/Android thật: khả năng tìm đường, chọn hoạt động tiếp theo và thời gian tới lần câu đầu. Chưa có dữ liệu để kết luận thay đổi giúp tăng retention.

## Fishing simulator — 07/11/2026

- [x] Profile 37 loài, điều kiện nước/thời tiết/ngày đêm theo 6 địa hình; snapshot phiên và tương thích legacy.
- [x] Casting hướng/lực/tầng nước có điểm rơi/gió/khối lượng/vật cản, kiểm mồi/cắn thật/giật sớm/lỡ hook.
- [x] Physics theo mass/species/drag/hướng cần/gear, đứt/chùng/mài mòn, exhaustion và landing; UI 6 chỉ số.
- [x] Metadata chiều dài/địa điểm/ngày/mồi/cần, model theo kích thước, ambient/cue, fullscreen/ngắm cảnh.
- [x] Chat/khoe cá đã bắt và bảng tuần tại điểm câu trên dữ liệu thật; regression legacy/unit/integration và browser controls.
- [ ] Playtest cân bằng đứt dây, thời gian chờ/fight, hook quality và đường tiến cấp miễn phí; đo FPS/mobile/network/load.
- [ ] Reel/phao/phụ kiện độc lập, lure retrieval, phối mồi/công thức và kỹ năng nhân vật riêng.
- [ ] Sáu map thủ công, thuyền/sonar/xa bờ, biến thể loài/rig/animation chuyên biệt.
- [ ] Xuất ảnh chiến lợi phẩm, bộ sưu tập công khai, moderation/report chat, thách đấu và giải đấu đăng ký có thưởng.

File, nghiệm thu và giới hạn theo 11 phase: [SIMULATOR](docs/SIMULATOR.md).

Cập nhật07/11/2026. [Backlog thiết kế](docs/BACKLOG.md) và [roadmap20giờ/tuần](docs/ROADMAP.md) giữ estimate ban đầu; trạng thái source thực tế ở [PROJECT_STATUS](PROJECT_STATUS.md).

## MVP local

- [x] Giữ đăng nhập bằng refresh cookie; tự refresh JWT, bảo vệ lượt câu đang chạy/reload khi refresh hết hạn và chỉ yêu cầu login sau khi đóng kết quả. Quyền hoàn tất giới hạn session/deadline/CSRF, giữ revocation và idempotency.

- [x] Thu gọn HUD màn câu, bộ chỉnh mở khi cần và Modal mồi/trang bị; thêm nhạc nhẹ, tiếng nước/máy câu, rung độc lập và chuyển động cần/phao theo snapshot.

- [x] Sửa padding thẻ thời trang/thanh toán/admin, lưới theo chiều rộng, nhãn admin Việt–Anh/Thần thoại và vòng chunk preview 3D; kiểm tra Chromium responsive, các trạng thái/dialog và regression shared UI. Thiết bị thật/Safari vẫn thuộc nghiệm thu trước beta.

- [x] `FishArt` hiển thị ảnh chụp cá thật đẹp, khỏe, vây nguyên vẹn theo yêu cầu người dùng; thay nhóm ảnh cá chợ/mẫu vật xấu, giữ trọn ảnh và ghi công nguồn ở chi tiết.
- [x] Hiện ảnh đủ màu/độ sáng cho cả 37 loài, kể cả chưa khám phá; chi tiết kỷ lục, giỏ cá, kết quả câu và cá chia sẻ có số đo vẫn dùng ảnh thật.

- [x] Đổi cá mới sang Gold qua giỏ cá, xác nhận giá, ledger/idempotency, snapshot và trần 100 Gold/ngày Việt Nam; mua vật phẩm trong game qua tiệm hiện có.

- [x] Chốt side-view/Hồ Sen/Gold-only và hoàn thành tài liệu trước source.
- [x] pnpm workspace/Node22/TS/sharedUI/contracts, lint/typecheck/build và qualityCI.
- [x] PostgreSQL schema/migrations/seed/constraints/immutableledger/idempotency.
- [x] Auth/refresh/CSRF/resetSMTP/session và profile/avatar.
- [x]10cá/Hồ Sen/gear/bait/inventory/equipment/shop/upgrade/rescue.
- [x] Server engine/Three.js animation+sound/hold-release/reconnect/atomic reward; simulator bổ sung ở mục trên.
- [x] XP/level/collection/mission/achievement/leaderboard.
- [x] Admin/RBAC/content/configversions/audit/analytics.
- [x] Admin: favicon, tiêu đề tab theo trang, menu nhóm theo vai trò, lối tắt Tổng quan, bảng sắp xếp/tìm kiếm, error boundary theo trang, sửa cột sổ cái Gold; phiên admin hết hạn có thông báo/quay lại trang cũ và đồng bộ đăng xuất giữa tab.
- [ ] Admin: tách `@fwo/ui` để bundle admin không kéo Three.js (hiện ~607 kB/191 kB gzip); phân trang/tìm kiếm phía server khi vượt 100 bản ghi.
- [x] Unit/integration suite; browser desktop/mobile, backuprestore/runtimeDBrole/SMTP checks.
- [x] Hoàn tất E2E desktop/mobile (6 PASS), gồm validation inline và password8 ký tự.
- [x] Shared palette POSORA/semantic tokens cho CSS/SVG/Phaser, color lint và shared form validation web/admin/API.
- [x] Thêm AGENTS.md cùng sáu skill local phục vụ reuse, bảo trì và mở rộng module.
- [x] Dọn server/database/artifact kiểm thử; giữ database ứng dụng và test suite chính thức.

- [x] Rà soát shared controls, modal/focus, navigation mobile, header 320px và trạng thái rỗng/lỗi web/admin; giữ regression UI.

## Trước beta bên ngoài

- [ ] Playtest màn câu trên điện thoại thật: mức nhạc/tiếng nước, Vibration API và nhịp rung, giữ/nhả cảm ứng, nhiệt máy/FPS và giảm chuyển động.

- [ ] Playtest tỷ lệ đổi cá 10% (1–100 Gold/con), trần đổi 100 Gold/ngày; đo số dư, thời gian tới nâng cấp và tỷ lệ hết mồi. Không coi giới hạn Gold là bảo đảm lợi nhuận.

- [ ] Phỏng vấn12–15người, playtest10người; điều chỉnh onboarding/difficulty/economy từ dữ liệu.
- [ ] Load100CCU, đo p95/p99/DBlocks/CPU, kiểm mạng VN và Safari/iOS/Android thật.
- [ ] Provision staging/domain/TLS/Cloudflare; chạy Dockerimages và CI thực, security/secret/container scan.
- [ ] Redis/authenticatedSMTP/runtimeDBrole ở môi trường vận hành; adminMFA/step-up/roleUI.
- [ ] Backup mã hóa/offsite/WAL, restore drill theo RPO/RTO, alert/incident/support runbook và budgetalerts.
- [ ] Đối chiếu luật hiện hành/chủ thể/phân loại/thủ tục; thiết kế định danh/tuổi/guardian/thời gian chơi/retention/privacy trước khi thu dữ liệu thật.
- [ ] Nghiệm thu sản phẩm/bảo mật/pháp lý rồi mới bật cờ release và deploy.

## Xác thực & kinh doanh (07/11/2026)

- [x] OTP email/SMS cho đăng ký và đổi hồ sơ; đăng ký phone/Google; email bất biến.
- [ ] Chọn nhà cung cấp SMS brandname VN, viết adapter webhook, đo chi phí/tỷ lệ nhận OTP; cấu hình GOOGLE_CLIENT_ID production.
- [ ] Nếu tư vấn xác nhận NĐ 147 yêu cầu số di động VN cho mọi tài khoản: bắt liên kết số (OTP) với tài khoản email/Google trước khi chơi public.
- [ ] Job dọn otp_challenges hết hạn; liên kết Google vào tài khoản email có sẵn sau khi xác thực OTP.
- [ ] Avatar tải ảnh lên (cần R2 + kiểm duyệt nội dung); hiện chỉ 4 avatar có sẵn.
- [ ] Thực hiện lộ trình pháp lý trong [BUSINESS_PLAN](docs/BUSINESS_PLAN.md) trước khi bật thanh toán/quảng cáo.

## Toàn cầu hoá cảnh câu

- [x] Cảnh/âm thanh riêng từng địa hình; trời và ánh sáng theo giờ địa phương; server dùng múi giờ IANA.
- [ ] Giờ mặt trời mọc/lặn theo vĩ độ và mùa (vị trí opt-in hoặc ước lượng theo múi giờ), mùa theo bán cầu.
- [ ] Lưu múi giờ theo tài khoản, giới hạn tần suất đổi để chống chọn giờ chạng vạng.
- [ ] Gộp nhiều thẻ bản đồ vào một WebGL context (hoặc ảnh tĩnh) để nhẹ hơn trên điện thoại yếu; nghe thử âm thanh trên iOS/Android thật.

## Mở rộng sau MVP

- [ ] Quà/vật phẩm ngoài đời: mô hình doanh thu thực, giá vốn/vận chuyển, ngân sách tổng/tồn kho, chống lạm dụng và rà soát điều kiện vận hành/pháp lý; chưa gán giá trị quà thật cho Gold hiện tại.

- [x] Nền tảng i18n Việt–Anh theo cơ chế POSORA, chuyển ngôn ngữ web/admin và shared placeholder/icon mật khẩu.
- [x] Bộ chọn ngôn ngữ có cờ 🇻🇳/🇬🇧 và tên đầy đủ Tiếng Việt/Tiếng Anh (English ở giao diện Anh) theo mẫu POSORA, dùng chung web/admin; header mobile cho phép xuống dòng để giữ trọn tên.
- [ ] Bản dịch nội dung game theo ID/slug trong API/editor, đầy đủ mã lỗi server và các locale tiếp theo; nghiệm thu plural/RTL theo thị trường.

- [ ] Thêm hồ/nội dung/eventengine sau playtest; translations và assetproduction nếu cần.
- [ ] Analytics exportworker/retentionjobs/leaderboardcache sau khi có nhu cầu đo được.
- [ ] Cosmetic/VIP/rewardedads chỉ sau legal approval và thiết kế fairplay; chưa bật paymentSDK.
- [ ] Guild và multiplayer đồng bộ sâu hơn; moderation/report cho chat hiện có; không cash-out/betting/trading.

Giữ test suite chính thức cho core logic; xóa chỉ các fixture/testscript/server/DB tạm sau kiểm thử. Không xóa data ứng dụng/audit thật.

## Điểm câu theo địa hình (07/11/2026)

- [x] 6 điểm câu, 37 loài đúng môi trường nước, ảnh chụp cá thật theo loài có nguồn/ghi công, tiệm địa phương mua/bán lại.
- [ ] E2E Playwright cho chọn tiệm theo điểm câu và bán lại vật phẩm.
- [ ] Cảnh gameplay/thẻ bản đồ riêng cho sông/suối/rừng/nước lợ/biển (hiện dùng chung cảnh hồ 3D).
- [ ] Admin UI chỉnh `locationIds`/`sellPriceGold` (API PATCH đã nhận) và trường sinh thái của cá.
- [ ] Đo cân bằng phí vào, giá hàng địa phương và tỷ lệ bán lại theo cohort.

## Thanh toán realtime (07/11/2026)

- [x] Module payments + catalog VND + MoMo/VNPay/thẻ qua VNPay hosted checkout, mặc định tắt.
- [x] IPN signature/amount/identity, receipt bền vững, fulfillment/outbox retry và unique grant; WebSocket auth + Redis fan-out, UI Shop/đơn/admin.
- [x] Migration, environment example và tài liệu merchant/API/events/triển khai tại [PAYMENTS](docs/PAYMENTS.md).
- [x] Regression payment: 9 unit adapters/contracts, 9 integration DB/WebSocket và browser desktop/mobile; thêm loading/error-retry/empty/disabled. Kết quả và giới hạn tại [PROJECT_STATUS](PROJECT_STATUS.md).
- [ ] Đăng ký merchant sandbox MoMo/VNPay; xác nhận ATM/INTCARD được bật và nghiệm thu callback/query bằng credentials thật của môi trường thử.
- [ ] Đo latency/tải và fan-out Redis nhiều instance, cấu hình alert fulfillment backlog/đối soát, diễn tập backup/restore trước mở bán.
- [ ] Hoàn thành certification/production credentials và các gate phát hành hiện có; chưa bật thanh toán thật.
