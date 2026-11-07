# Kế hoạch tìm 1.000 người chơi đầu tiên

Discovery — 07/11/2026. Mục tiêu là **1.000 tài khoản người thật đã bắt được cá đầu tiên**, không dùng impression, email chờ hoặc tài khoản staff thay thế. Ngân sách thử nghiệm 5.000.000 VNĐ là giới hạn tiền mặt; không cam kết 1.000 người hoặc một CAC cố định. Kế hoạch 30 ngày bắt đầu khi private beta đủ chơi và đường pháp lý cho nhóm thử nghiệm đã được rà soát; không có ngày phát hành được mặc định.

## 1. Đối tượng và thông điệp

- Nhóm A: người thích câu thật, thích nhận ra cá/hồ quen thuộc; kỳ vọng cảm giác cá có sức kéo.
- Nhóm B: casual mobile, có 5–10 phút nghỉ; kỳ vọng thao tác ít và được thưởng rõ.
- Nhóm C: người chơi sưu tập/nâng cấp, thích kỷ lục và album; kỳ vọng mục tiêu nhiều ngày.

Thông điệp thử nghiệm: **“Một góc hồ Việt Nam ngay trên trình duyệt. Thả câu, đấu cá, thêm một kỷ lục.”** Chưa quảng cáo “không lag”, “cá hiếm dễ bắt”, “thu nhập”, “đổi thưởng” hay “game hot nhất”. Landing nêu rõ bản thử nghiệm, thiết bị hỗ trợ đã kiểm tra, cách gửi feedback, chính sách dữ liệu và tình trạng reset dữ liệu beta trước đăng ký.

## 2. Ngân sách đúng 5 triệu VNĐ

| Khoản                                  |      Trần VNĐ | Mục đích/điều kiện chi                                                                    | Số đo                                                |
| -------------------------------------- | ------------: | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Nội dung và dựng trailer/gameplay      |     1.200.000 | 1 trailer 20–30s, 6–8 short từ footage thật; có giấy phép asset/nhạc                      | Landing sessions và first-catch conversion theo clip |
| Micro creator câu cá/casual            |     1.300.000 | 2–3 đợt nhỏ, có disclosure tài trợ; không mua lượt tải/bình luận                          | Activated có UTM, D1/D7 cùng cohort                  |
| Community/closed-beta facilitation     |       600.000 | Tài liệu hướng dẫn, tổ chức buổi chơi/ghi nhận feedback; không trả thưởng theo thắng/thua | Buổi thử hoàn thành, lỗi tìm được, D1                |
| Công cụ landing, form, attribution     |       400.000 | Chỉ phần thêm ngoài hosting baseline; ưu tiên first-party tối thiểu                       | Funnel đủ dữ liệu, attribution không có PII          |
| Nội dung referral và chống abuse pilot |       300.000 | Thiết kế lời mời và QA; phần thưởng dự kiến cosmetic phi tiền mặt chỉ sau review          | Invites → activated hợp lệ, duplicate/bot rate       |
| Paid creative test có điều kiện        |       700.000 | Chia 2–3 đợt, chỉ khi retention gate và pháp lý đạt; không đạt thì giữ tiền               | CAC activated, cohort retention, chi thực tế         |
| Dự phòng                               |       500.000 | Sửa creative, accessibility/mobile hoặc hoàn tác test không hiệu quả                      | Ghi nhật ký lý do chi                                |
| **Tổng trần**                          | **5.000.000** | Tiền chưa chi vẫn giữ, không bắt buộc tiêu hết                                            | Báo spent/committed/remaining                        |

Thời gian founder là chi phí cơ hội riêng. Không cộng domain/hosting đã tính vào hạ tầng một lần nữa. Ngân sách creator là giả định đàm phán, chưa có báo giá hoặc cam kết placement. Không gửi liên hệ creator, đăng bài, chạy ads hay gửi email tự động trong Discovery này.

## 3. Kế hoạch 30 ngày theo đầu ra

| Ngày  | Công việc                                                                           | Đầu ra và tiêu chí nghiệm thu                                                                |
| ----- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1–3   | Chốt segment; 12–15 phỏng vấn; chuẩn bị landing/waitlist và chính sách beta         | 3 giả thuyết thông điệp; biên bản ẩn danh, nguồn đồng ý; landing rõ CTA                      |
| 4–5   | Quay gameplay build thật, dựng trailer; test UTM và analytics                       | 1 trailer 20–30s có phụ đề; event register/first_cast/first_catch đúng và không trùng        |
| 6–7   | Mời 20–30 người qua quan hệ/nhóm cho phép; chơi có quan sát                         | 10 phiên quan sát đủ mobile/desktop; backlog xếp severity, vá lỗi chặn first catch           |
| 8–10  | Batch beta tiếp theo 30–50; đăng clip qua kênh được phép                            | 2 short: thao tác đấu cá, cá Việt; dashboard cohort và device segmentation                   |
| 11–14 | Nhìn D1 và cohort D7 đầu; QA feedback; xuất nội dung FAQ                            | Báo activation/tutorial/retention với tử số, mẫu số; sửa 3 nguyên nhân bỏ lớn nhất           |
| 15    | Review gate acquisition                                                             | Có quyết định go/hold bằng dữ liệu; không tự mở public khi legal chưa đạt                    |
| 16–18 | Nếu đạt: một micro creator đợt nhỏ, thêm 2 short; nếu hold: playtest lỗi onboarding | Mỗi placement có UTM riêng và disclosure; không giả số đăng ký                               |
| 19–21 | Đo cohort kênh; thử referral trong nhóm nếu đã review; feedback hằng tuần           | Một lời mời không spam, không thu danh bạ; reward có hạn/chống self-referral                 |
| 22–24 | Nếu đạt: test paid 200–300k/lần, dừng creative xấu; nếu hold: giữ ngân sách         | CAC activated và D1 từng kênh; ghi chi thực, khoảng bất định                                 |
| 25–27 | Clip câu chuyện hồ/cá; bài hướng dẫn SEO; buổi hỏi đáp beta                         | 1 bài có metadata/indexing chỉ khi public được phép, 2 clip phụ đề, phản hồi được gắn issue  |
| 28–30 | Tổng kết dữ liệu, phỏng vấn người rời; kế hoạch vòng tiếp                           | Báo số người thật activated, retention trưởng thành, chi phí và quyết định ưu tiên tháng sau |

D30 retention của người mới vào ngày 28 không thể biết ở ngày 30. Báo “chưa đủ thời gian” và lên lịch đọc ngày 58; không điền 0% hoặc suy từ D1. D7 chỉ tính người đã đủ bảy ngày quan sát.

## 4. Retention gate và cách đo

1. Trước nhận beta: core loop đã nghiệm thu, không lỗi P0/P1, có khôi phục session, Gold/claim không nhân đôi, thiết bị tối thiểu chạy được và review pháp lý cho hình thức thử nghiệm hoàn tất.
2. Gate paid nhỏ: tutorial >70%, activation >50%, D1 ≥25%, D7 ≥10%, crash-free >99% là **mục tiêu thử nghiệm**. Thu ít nhất 100 người activated cohort đủ tuổi để giảm nhiễu; mẫu này vẫn có sai số lớn, không chứng minh product-market fit.
3. Nếu một gate không đạt: giữ khoản paid 700k và ngân sách placement chưa cam kết, sửa onboarding/cast/fight/performance, đo lại một cohort mới; không dùng event thưởng Gold lớn che vấn đề.
4. Scale vượt test budget cần retention ổn định và LTV/CAC/operational capacity có bằng chứng, không chỉ đạt tỷ lệ mục tiêu một tuần.

Định nghĩa activation = một tài khoản bắt cá đầu tiên được server chốt trong24 giờ đăng ký. First-catch conversion = activated / registered hợp lệ trong cohort. Tutorial completion = tutorial_completed / tutorial_started. Dn retention chính = người có gameplay vào đúng ngày lịch thứn sau signup / registered cohort, theo Asia/Ho_Chi_Minh, thống nhất PRD. Có thể báo thêm retention sau activation nhưng phải gắn nhãn riêng, không dùng thay mẫu số signup để làm đẹp KPI. DAU/WAU/MAU dựa gameplay, không dựa pageview. Đăng nhập ngày thứ hai nhưng không chơi không tính quay lại gameplay.

## 5. Đánh giá từng kênh

| Kênh                           | Nội dung/CTA                                                 | Attribution tối thiểu                                                | Khi nào dừng/đổi                                                   |
| ------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Facebook group câu cá          | Clip cá quen, hỏi cảm giác gameplay; xin phép quản trị nhóm  | UTM từng nhóm/bài; câu hỏi nguồn tự nguyện, không scrape member      | Bị coi spam, sai đối tượng, đăng ký không ra first catch           |
| TikTok / YouTube Shorts        | Hook 2s cá vùng vẫy, thao tác và kết quả; CTA link beta      | Link chiến dịch, referral source; ghi cả giới hạn attribution mobile | View cao nhưng landing/activation thấp thì sửa CTA/funnel          |
| Facebook Gaming/game community | Một buổi chơi beta, challenge kỷ lục không tiền thưởng       | UTM placement + activated + retention                                | Không tăng ngân sách vì chỉ có click rẻ                            |
| Micro creator                  | Clip trải nghiệm có disclosure, cho phép phê bình            | Cost/activated, D1/D7 theo nguồn; ghi overlap organic                | Người chơi không đúng segment, feedback kém hoặc bot               |
| SEO                            | “Cách chơi Fishing World Online”, cá/hồ và devlog            | Search Console sau khi có domain/public hợp pháp                     | Không kỳ vọng traffic đáng kể sau vài ngày; rà nội dung sai intent |
| Referral                       | Link mời bạn, cosmetic dự kiến sau review; không thưởng tiền | Server referral code, referrer/invitee đủ điều kiện, one claim       | Self-referral/abuse; giữ hoặc tắt thưởng trong beta                |

Thu thập feedback trong app qua biểu mẫu có category, session/request ID, thiết bị và mô tả tự nguyện; không đính token, password, email vào URL. Bug bảo mật gửi kênh riêng, không khuyến khích đăng công khai payload. Đặt mục tiêu phản hồi beta trong hai ngày làm việc theo khả năng một người, không hứa support 24/7.

## 6. Từ 5 triệu tới 1.000 người: bài toán thay vì cam kết

1.000 activated với toàn bộ 5 triệu tương ứng **blended CAC 5.000 VNĐ**, chưa gồm công founder. Ví dụ giả định 4.000 landing sessions × 50% register × 50% first catch = 1.000; không có bằng chứng hiện tại đạt được 4.000 sessions hay tỷ lệ này. Nếu register 25% và first catch 40%, cần 10.000 sessions. Bởi vậy ưu tiên community và chất lượng sản phẩm; không hứa một ngân sách cố định đủ 1.000 người.

Tháng đầu có thể chỉ đạt 100–300 activated nhưng tìm được lỗi retention; đây vẫn là học hỏi hữu ích nếu báo đúng số thực. Không gọi chiến dịch hoàn tất mục tiêu 1.000 khi chưa có số server chứng minh. Dữ liệu economics và kịch bản CAC/LTV nằm trong [MONETIZATION.md](MONETIZATION.md).

## 7. Mẫu nội dung có thể bàn giao

- Trailer 25s: 0–3s Hồ Sen + “Một góc hồ quen”; 3–8s chọn mồi/thả câu; 8–15s cá cắn và giữ/thả; 15–21s record mới/album; 21–25s “Thử bản beta trong trình duyệt”. Chỉ quay build thật; chưa có build thì dùng storyboard và ghi rõ concept.
- TikTok 1: “Dây căng quá thì sao?” minh họa giữ/thả; TikTok 2: “Bạn nhận ra cá nào ở hồ này?”; TikTok 3: kỷ lục cá thường, không khoe odds chưa đo.
- Facebook: một devlog tuần, một yêu cầu feedback cụ thể, một lịch bảo trì; không dùng “hot”, “kiếm tiền” hoặc số online giả.
- Closed beta invitation: nói build có thể lỗi, thời lượng dự kiến, yêu cầu thiết bị đã test, reset/no-reset, dữ liệu thu, cách rút khỏi danh sách; chỉ gửi sau khi được người có trách nhiệm cho phép.

Các nội dung trên là kế hoạch, chưa tạo trailer video hay đăng ra bên ngoài. Sử dụng ảnh/nhạc có quyền, phụ đề đầy đủ, không lấy footage của đối thủ làm gameplay sản phẩm.
