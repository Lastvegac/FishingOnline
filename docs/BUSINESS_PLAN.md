# Kế hoạch kinh doanh: phí thấp, thị trường rộng, mobile trước

Cập nhật 07/11/2026. Tài liệu chiến lược cho chủ sản phẩm; **không phải ý kiến pháp lý hay dự báo chắc chắn**. Mọi con số là giả định để tính độ nhạy, dùng cùng công thức với [MONETIZATION](MONETIZATION.md). Các bước pháp lý phải được luật sư/kế toán xác nhận theo [LEGAL](LEGAL.md) trước khi thu tiền thật. Code hiện tại vẫn **Gold-only**, chưa có checkout, quảng cáo hay tiền thật.

## 1. Nguyên tắc

1. **Miễn phí trọn vòng chơi cốt lõi.** Không bán tỷ lệ cá hiếm, lực kéo hay XP; không loot box, cash-out, đổi Gold ra tiền/quà, giao dịch giữa người chơi.
2. **Giá thấp, nhiều người trả.** Mỗi gói từ 5.000 đến 49.000 VNĐ, rẻ hơn một ly cà phê. Mục tiêu là tăng tỷ lệ trả tiền và lan truyền thay vì ARPPU cao.
3. **Dịch chuyển chi phí sang doanh nghiệp.** Hồ câu dịch vụ, cửa hàng đồ câu và nhãn hàng trả phí hiện diện, để người chơi trả ít.
4. **Mobile web/PWA trước, app store sau.** Thanh toán web qua cổng nội địa thường rẻ hơn phí app store (cần xác minh hợp đồng thực tế). Bọc Android/iOS bằng Capacitor khi đã có số liệu retention.

## 2. Bậc giá đề xuất (sau khi pháp lý duyệt)

| Gói                       | Giá giả định (gồm VAT)  | Người chơi nhận                                                  | Rào chắn công bằng                                           |
| ------------------------- | ----------------------: | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Miễn phí                  |                       0 | Toàn bộ hồ, cá, nhiệm vụ, bảng xếp hạng                          | —                                                            |
| Cosmetic lẻ               |           5.000–15.000 | Skin cần, phao, khung avatar, hiệu ứng thả câu                   | Không thay chỉ số; xem trước khi mua                         |
| Hội viên “Cần thủ Xanh”   | 19.000/30 ngày · 49.000/quý | Cosmetic tháng, thêm ô preset trang bị, nhật ký câu mở rộng | Không thưởng sức mạnh; huỷ một chạm, không tự gia hạn ngầm  |
| Mùa câu (premium track)   |           29.000/6 tuần | Track cosmetic song song track miễn phí                          | Track miễn phí luôn đủ trải nghiệm; không FOMO trừng phạt   |
| Quảng cáo có thưởng       | 0 (nhà quảng cáo trả)   | Mồi/cosmetic nhỏ có trần mỗi ngày                                | Chỉ người lớn, tự nguyện, không bắt xem để chơi tiếp        |

Mua theo nhóm/gia đình (một hội viên cho 3 tài khoản cùng hộ) và giá sinh viên là đòn bẩy mở rộng thị trường thay vì giảm giá sâu.

## 3. Nguồn B2B: để doanh nghiệp trả thay người chơi

| Nguồn                                | Mô hình giả định                                       | Điều kiện                                                       |
| ------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------- |
| Hồ câu dịch vụ thật                  | 200.000–500.000/tháng/hồ: bản đồ “hồ đối tác”, lịch giải | Hợp đồng, gắn nhãn quảng cáo; không quy đổi Gold thành vé câu thật |
| Cửa hàng/nhãn đồ câu                 | Tài trợ hồ/skin mang thương hiệu, bài hướng dẫn        | Không quà hiện vật theo kết quả trong game (NĐ 147, xem LEGAL)  |
| Affiliate thương mại điện tử         | Hoa hồng trên đơn hàng đồ câu thật                     | Disclosure rõ, tách hẳn khỏi shop Gold, không hiển thị cho trẻ em |
| Giải đấu do nhãn hàng tài trợ        | Miễn phí tham gia; giải thưởng cosmetic trong game     | Không phí tham gia đổi giải thưởng có giá trị (rủi ro cờ bạc)   |

## 4. Kịch bản “phí thấp – quy mô lớn”

Công thức theo MONETIZATION §3: net paid = gross × (1 − 2% hoàn tiền) / 1,1 VAT × (1 − 5% phí cổng).

| Biến / kết quả (VNĐ/tháng)               | Giá trị giả định | Ghi chú                                         |
| ---------------------------------------- | ---------------: | ----------------------------------------------- |
| MAU                                      |           50.000 | Cần chứng minh bằng cohort, không phải cam kết  |
| Paying conversion                        |               4% | Giả định giá thấp nâng conversion từ 2%         |
| Gross ARPPU                              |           30.000 | Thay vì 100.000 ở base hiện tại                 |
| Gross paid booking                       |       60.000.000 |                                                 |
| Net paid                                 |       50.776.364 |                                                 |
| Net ads (20% opt-in × 20 lượt × 70% fill × eCPM 30.000 × 90%) |        3.780.000 |                                                 |
| B2B (20 hồ đối tác × 300.000)            |        6.000.000 | Chỉ tính khi có hợp đồng                        |
| Tổng net revenue                         |       60.556.364 |                                                 |
| Biến phí (300/MAU)                       |       15.000.000 |                                                 |
| Fixed đầy đủ (hạ tầng + 1 dev + marketing) |     32.000.000 | Như MONETIZATION §4                             |
| **Cash surplus trước thuế TNDN**         |   **13.556.364** | Không gọi là lợi nhuận sau thuế                 |
| Break-even MAU (contribution ≈ 911/MAU)  |      khoảng 35.100 | B2B tính gộp theo MAU để đơn giản              |

Độ nhạy: nếu conversion chỉ đạt 2% với ARPPU 30.000 thì net paid còn khoảng 25,4 triệu và kịch bản lỗ khoảng 11,8 triệu/tháng. Giá thấp **chỉ có lợi khi quy mô và conversion tăng thật**; quyết định giá sau A/B test trong closed beta.

## 5. Tăng trưởng người dùng với chi phí thấp

- **Cộng đồng câu cá Việt Nam:** hội nhóm Facebook/Zalo, TikTok clip “cá hiếm tuần này”, đối tác hồ câu treo QR mở game ngay trên điện thoại.
- **Lan truyền không thưởng tiền:** mời bạn nhận cosmetic (sau khi có chống abuse), chia sẻ thẻ kỷ lục cá có ảnh.
- **Không rào cản đăng ký:** Google một chạm, số điện thoại (OTP SMS) hoặc email (OTP); chơi ngay trên trình duyệt, cài PWA ra màn hình chính.
- **Đo trước khi chi:** chỉ mua quảng cáo trả phí khi LTV/CAC > 1,5 trên cohort thật (MONETIZATION §5).

## 6. Mobile và khả năng scale

| Lớp            | Hiện trạng                                                     | Bước tiếp theo khi có tải thật                                         |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Client         | Responsive, touch, Phaser lazy chunk; PWA manifest + icon      | Service worker cache asset tĩnh, giảm chunk Phaser, test Safari/Android thật |
| Đăng nhập      | OTP email/SMS, Google, giới hạn theo đích gửi (chịu CGNAT nhà mạng) | SMS brandname nhà mạng VN; theo dõi chi phí SMS/OTP mỗi người dùng mới |
| API            | Fastify stateless, Redis rate limit, PostgreSQL                | Nhiều instance sau load balancer; CDN cho asset; read replica khi đo được |
| Chi phí        | SMS là biến phí lớn nhất của đăng ký                            | Ưu tiên Google/email OTP; SMS cho người không dùng email               |

Chưa có load test 100 CCU; không khẳng định hệ thống chịu được 50.000 MAU khi chưa đo (xem TODO).

## 7. Lộ trình hợp thức hoá (cần tư vấn xác nhận)

| Bước | Việc cần làm                                                                                         | Đầu ra                                   |
| ---- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1    | Thành lập pháp nhân (thường là công ty TNHH) tại cơ quan đăng ký kinh doanh cấp tỉnh; chọn mã ngành phần mềm/dịch vụ trò chơi điện tử trên mạng theo tư vấn | Giấy chứng nhận đăng ký doanh nghiệp     |
| 2    | Mô tả kỹ thuật (server-authoritative, leaderboard, không chat/trading) để tư vấn phân loại G1–G4 theo NĐ 147/2024 | Memo phân loại có chữ ký người chịu trách nhiệm |
| 3    | Hồ sơ phát hành tương ứng phân loại; tên miền/hệ thống kỹ thuật/đầu mối xử lý khiếu nại            | Quyết định/giấy xác nhận theo thủ tục    |
| 4    | Xác thực tài khoản bằng số di động Việt Nam theo LEGAL L1. Đăng ký bằng SMS OTP đã làm; tài khoản email/Google có thể phải liên kết số trước khi phát hành public | Quy trình định danh, tuổi, người giám hộ |
| 5    | Luật Bảo vệ dữ liệu cá nhân 2025: thông báo xử lý, consent riêng cho marketing, hồ sơ đánh giá tác động, nhà cung cấp SMS/email/Google | Privacy policy, data map, hợp đồng xử lý |
| 6    | Thuế, hoá đơn điện tử; thu qua tổ chức trung gian thanh toán được cấp phép; chính sách hoàn tiền/huỷ gói theo luật bảo vệ người tiêu dùng | Quy trình kế toán, đối soát webhook      |
| 7    | Đăng ký nhãn hiệu “Fishing World” tại Cục Sở hữu trí tuệ; giấy phép asset/ảnh cá thương mại         | Đơn nhãn hiệu, asset register            |

Owner: chủ sản phẩm với tư vấn pháp lý/kế toán. Chỉ bật feature flag thanh toán/quảng cáo sau gate G3 trong LEGAL.
