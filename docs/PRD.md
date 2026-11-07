# Product Requirements — Fishing World Online

Phiên bản 0.1 · 07/11/2026 · Chủ sản phẩm: người yêu cầu dự án · Trạng thái: đề xuất Discovery, chưa nghiệm thu phần mềm.

## 1. Tầm nhìn và vấn đề

Game câu cá 2D trên trình duyệt, tiếng Việt trước, cho người muốn thư giãn vài phút nhưng vẫn có kỹ năng và tiến trình lâu dài. Mở đường dẫn, vào hồ quen thuộc, đọc tín hiệu cá, kéo/nhả đúng nhịp, khám phá cá và cải thiện trang bị. Không cần đầu tư đồ họa 3D hay xây một thế giới multiplayer để kiểm chứng vòng lặp này.

Giả thuyết: người chơi Việt quan tâm cảnh quan/loài cá quen thuộc, chơi một tay và phiên ngắn 5–10 phút. Chưa có phỏng vấn, dữ liệu thị trường hoặc retention chứng minh. Khác biệt phải được kiểm chứng bằng prototype và cohort, không chỉ bằng so sánh tính năng.

| Persona             | Nhu cầu / hoàn cảnh                                      | Điều cần kiểm chứng                                |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Người thích câu cá  | Muốn giải trí khi không thể đi câu; điện thoại phổ thông | Cơ chế kéo/nhả có đủ cảm giác câu cá không?        |
| Người chơi casual   | Có 5–10 phút, không muốn tải ứng dụng                    | Có hiểu hook/tension trong 3 lượt đầu không?       |
| Người thích sưu tập | Muốn kỷ lục, loài mới, mục tiêu dài                      | Một hồ/10 loài có tạo lý do quay lại 7 ngày không? |

Mục tiêu đầu: chứng minh người mới bắt được cá, hiểu nâng cấp và quay lại. Mốc1.000 người đã đăng ký và có catch đầu tiên là mục tiêu tuyển dụng cộng đồng, không phải1.000 CCU hoặc cam kết đạt được trong30 ngày.

## 2. Phạm vi và ranh giới phát hành

**Bản nội bộ:** email/password, một Hồ Sen, 10 loài, đầy đủ vòng câu, Gold/XP, túi đồ, collection, shop, 3 nhiệm vụ ngày, leaderboard bất đồng bộ, cấu hình và thống kê admin. Starter duy nhất: 200 Gold, 20 giun và bộ cần gỗ/dây/lưỡi cơ bản.

**Beta bên ngoài:** tất cả tính năng trên cộng các yêu cầu tài khoản/độ tuổi/người giám hộ/thời gian chơi được kết luận qua rà soát pháp lý. Không mặc định beta miễn phí được miễn thủ tục. Xem [LEGAL.md](LEGAL.md).

**Ngoài MVP:** thanh toán, premium currency, quảng cáo SDK, VIP thật, chat, guild, người chơi tương tác trực tiếp, marketplace, trading, giải đấu tiền thật, cash-out, NPC AI, nhiều hồ, durability/repair, social login. Schema/kiến trúc chừa đường mở rộng; không xây tính năng trước khi có nhu cầu.

## 3. User stories và tiêu chí nghiệm thu

| ID       | Nhu cầu người dùng         | Tiêu chí nghiệm thu có thể kiểm tra                                                                                                      |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01  | Tạo/đăng nhập tài khoản    | Email chuẩn hóa duy nhất; mật khẩu hash; lỗi chung không lộ tài khoản; refresh rotation và logout được kiểm thử                          |
| AUTH-02  | Lấy lại tài khoản          | Forgot trả chung; reset token hash/expiry/một lần; mật khẩu mới thu hồi sessions; phát triển dùng mail catcher, release có mail provider |
| PROF-01  | Biết tiến trình            | Profile có username/avatar preset/level/XP/Gold/ngày tham gia/tổng cá/cá lớn nhất/danh hiệu; dữ liệu từ server                           |
| FISH-01  | Chọn hồ và loadout         | Hồ Sen cấp 1 miễn phí; 10 loài có asset key, ảnh được cấp phép và dữ liệu hợp lệ trước beta                                              |
| FISH-02  | Chơi trọn một lượt         | Đủ 10 state; cast tiêu một mồi; hook kiểm thời gian server; fight hold/release; catch/escape có lý do rõ                                 |
| FISH-03  | Không mất hoặc nhân thưởng | Catch/ledger/XP/collection/mission update nguyên tử; duplicate complete/concurrent action không nhân thưởng; reload lấy được kết quả     |
| INV-01   | Quản lý trang bị/mồi       | Xem quantity, equip/unequip slot hợp lệ; không đổi đồ đang khóa trong phiên; không bỏ starter cuối cùng khiến kẹt                        |
| SHOP-01  | Mua và nâng cấp bằng Gold  | Server tính giá/level/stats; không âm ví; receipt/idempotency; cần tre/composite và nâng +1/+2 có cap                                    |
| COLL-01  | Sưu tập                    | Đủ 10 loài; loài chưa bắt được giấu hợp lý; count/max gram/first-last catch/hồ và kỷ lục đúng catch đã commit                            |
| MIS-01   | Có mục tiêu ngày           | Ba nhiệm vụ từ catch server; ngày Việt Nam; claim một lần/occurrence; xử lý chuyển ngày và grace rõ                                      |
| RANK-01  | So kỷ lục                  | Bảng cân nặng lớn nhất từ catch đã commit; tie-break ổn định, pagination; không lộ email                                                 |
| ADMIN-01 | Vận hành không deploy      | CRUD nội dung cấu hình theo role; preview phân phối; publish version có audit; phiên đang chơi giữ snapshot                              |
| OPS-01   | Tìm và xử lý lỗi           | Logs có request ID, redact secrets; health/readiness; backup/restore rehearsal; alert lỗi reward/auth                                    |
| ANA-01   | Đo vòng lặp                | Event có schema/version/dedupe; dashboard funnel và cohort; không dùng số người online giả                                               |
| UX-01    | Chơi được trên điện thoại  | 360px không tràn ngang; touch/keyboard/blur/reconnect; loading/empty/error; âm mute và reduced motion                                    |

Ảnh avatar chỉ preset trong MVP; upload file và kiểm duyệt nội dung là backlog riêng. Achievement MVP là 3 mốc server: cá đầu tiên, 10 cá, 5 loài; trao danh hiệu, không thêm Gold, tránh mở thêm nguồn phát tiền không cần thiết.

## 4. Quy tắc nghiệp vụ nền

- Server là nguồn kết quả: client chỉ gửi cast/hook/hold/release/complete. Không nhận fish/reward/weight/progress do client quyết định.
- Một active fishing session/player. Mỗi session gắn config version, loadout snapshot, server timestamps, sequence và thời hạn. Hủy/timeout không hoàn mồi đã cast, không đền thưởng từ lỗi client.
- Gold integer, không quy đổi ra tiền/vật thật. Starter, catch, shop và mission đều có ledger append-only và unique source. Cá tự chuyển thành thưởng; không bán cùng cá lần thứ hai.
- XP tích lũy, `level = 1 + floor(sqrt(totalXP/100))`. Không trao thưởng level lặp qua render. Trọng lượng lưu integer gram.
- Ngày nhiệm vụ theo `Asia/Ho_Chi_Minh`, timestamps UTC. Grace claim đến 12:00 ngày sau cho occurrence đã hoàn thành trước 00:00; không kéo dài thời gian kiếm progress.
- Cứu trợ mồi: tối đa5 giun/ngày, chỉ khi không còn mồi sử dụng được và Gold<30. Là grant nguyên tử, không bán/đổi lại Gold. Mục tiêu tránh hard-lock; theo dõi abuse trước mở rộng.
- Cấu hình admin validate range/cross-field/pool hợp lệ và version; soft delete không phá lịch sử catches/orders.

## 5. Chỉ số và định nghĩa

| Chỉ số              | Định nghĩa triển khai / mục tiêu thử nghiệm                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Signup              | Tài khoản tạo thành công; tách tài khoản test/bot khỏi báo cáo                                                                 |
| Activation          | Người đăng ký có catch đầu tiên trong 24 giờ / signup hợp lệ; >50%                                                             |
| Tutorial completion | Người bắt đầu tutorial hoàn tất hướng dẫn / tutorial_started; >70%                                                             |
| D1/D7/D30           | Cohort signup quay lại gameplay vào đúng ngày +1/+7/+30 ở múi giờ VN; mục tiêu D1 25–30%, D7 10–15%; D30 đo trước đặt mục tiêu |
| DAU/WAU/MAU         | Unique player có hành động gameplay hợp lệ trong ngày / rolling 7 / rolling 30 ngày, không chỉ mở landing                      |
| Session duration    | Từ session_started đến last foreground heartbeat; hết hạn idle 5 phút; không tính tab treo                                     |
| Crash-free          | Phiên frontend không gặp fatal exception / phiên đo được; mục tiêu >99%, công bố cỡ mẫu                                        |
| Economy             | Gold phát/sink/người hoạt động, tồn kho mồi, balance p50/p95, tỷ lệ không đủ mồi, thời gian mua cần đầu                        |
| Acquisition         | Visit → signup → first_catch theo UTM; CAC theo activated player; xem [MARKETING.md](MARKETING.md)                             |

Event bắt buộc: signup, login, tutorial_started/completed, first_cast, first_catch, fish_caught, item_purchased/equipped, mission_completed, daily_login, session_started/ended. Milestone một lần dùng unique key; analytics không chứa password, token, full email hoặc tên thật.

Cohort ít nhất 100 activated players, ít nhất hai cohort quan sát đủ D7 trước quyết định tăng quảng cáo; báo confidence interval, nguồn traffic và thiết bị. Đây là gate quyết định, không phải bảo đảm thống kê. Nếu D1<20% hoặc first-catch<50%, sửa onboarding/gameplay trước tăng chi.

## 6. Phi chức năng và nghiệm thu

TypeScript strict, stack đúng yêu cầu, pnpm xuyên suốt; React không render mỗi frame. UI tiếng Việt tách message keys và locale formatting. Mục tiêu 30FPS mobile, first-playable ≤5s theo profile mạng được công bố; API/read p95<300ms, mutation p95<500ms tại origin trong tải beta đã đo. Không lấy một lần build pass thay cho performance/security audit.

Nghiệm thu nội bộ cần unit/integration PostgreSQL thật/E2E cho đường chơi chính, lỗi transaction/replay/race không gây nhân Gold, kiểm thử thiết bị thật, logs và restore backup. Beta bên ngoài còn yêu cầu rà soát pháp lý. Public release có manual approval, monitoring, hỗ trợ người dùng và kế hoạch rollback. Chi tiết [TEST_PLAN.md](TEST_PLAN.md), [SECURITY.md](SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md).

## 7. Phụ thuộc và quyết định

20 giờ/tuần đã được người dùng xác nhận. Side-view, phong cách minh họa 2D tiết kiệm, mô hình Gold-only và quy mô thử tải 100 CCU là đề xuất mặc định. Chưa có ngân sách phát triển/asset/pháp lý, doanh nghiệp phát hành, nhà cung cấp hosting/mail hoặc lịch ra mắt cứng. Không tự đặt ngày production khi các phụ thuộc này chưa có.
