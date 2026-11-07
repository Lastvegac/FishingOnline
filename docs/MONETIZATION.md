# Mô hình doanh thu và kinh tế kinh doanh

Ngày 07/11/2026. Các bảng tài chính Discovery bên dưới là **giả định để tính độ nhạy**, không phải dự báo chắc chắn hay doanh thu hiện có. Hệ thống local đã có Gold kiếm trong game, Kim cương cho cosmetic và module thanh toán mặc định tắt; chưa có doanh thu giao dịch thật. Giá mở đầu đã áp dụng: 10.000đ/100 Kim cương, 20.000đ/200 Kim cương, đồ câu 120–600 Gold, mồi 30–60 Gold/gói 10, cosmetic có đường miễn phí. Xem [bảng giá đầy đủ theo cấp và cách công bố](LAUNCH_PRICING.md). Không bán Gold, bật SDK quảng cáo, tiền thưởng thật, giao dịch người chơi hoặc cash-out trong phạm vi này.

## 1. Các nguồn doanh thu tương lai có điều kiện

| Nguồn            | Giá trị đề xuất sau beta                         | Rào chắn thiết kế                                                                       | Điều kiện trước triển khai                                                                 |
| ---------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Cosmetic         | Skin cần, avatar, trang phục, hiệu ứng thả câu   | Không thay tỷ lệ cá, lực kéo hay XP; preview trước mua                                  | Rà soát pháp lý game/thanh toán/thuế, chính sách hoàn tiền, provider và webhook idempotent |
| Membership       | Cosmetic tháng/mùa, preset, biểu đạt hồ sơ       | Không thưởng sức mạnh độc quyền, không bỏ qua level; tránh streak trừng phạt            | Kiểm tra auto-renew/cancel, công bố quyền lợi, pháp lý và tải support                      |
| Rewarded ads     | Người lớn tự nguyện xem, phần thưởng nhỏ có trần | Không ép xem để câu tiếp; không tạo vòng Gold vô hạn; server verify khi provider hỗ trợ | Tuổi/đồng ý dữ liệu, nội dung quảng cáo, mạng ads, pháp lý và đo fill/eCPM thực tế         |
| Affiliate đồ câu | Bài hướng dẫn có sản phẩm thật liên quan         | Gắn nhãn liên kết thương mại, không trộn với shop Gold; không dùng mặc định với trẻ em  | Hợp đồng, disclosure, tracking tối thiểu, chính sách dữ liệu                               |
| Sponsorship      | Hồ/sự kiện/cosmetic do nhãn hàng tài trợ         | Không trả tiền thắng leaderboard, không đổi Gold ra quà/tiền khi chưa rà soát           | Duyệt nội dung, hợp đồng, quảng cáo, phân loại game và quyền asset                         |

Không cộng sponsorship/affiliate vào kịch bản cơ sở khi chưa có hợp đồng và cơ chế attribution. Không bán xác suất cá hiếm hoặc loot box trong kế hoạch hiện tại.

## 2. Gold và sức khỏe economy

**Cập nhật triển khai 07/11/2026:** người chơi chủ động đổi cá mới sang Gold, rồi mua vật phẩm trong game ở tiệm hiện có. Giá thử nghiệm = `min(100, max(1, floor(Gold cơ sở đã tính theo trọng lượng × 10%)))`; tối đa 100 Gold từ đổi cá/ngày/tài khoản, reset 00:00 Việt Nam. Cá chưa đổi giữ trong giỏ, không hết hạn. Tỷ lệ và giá tối đa snapshot lúc bắt đầu phiên; giá từng cá giữ sau catch. Phiên cũ giữ thưởng tự động, catch đã nhận Gold không đổi lần nữa. Starter và nhiệm vụ ngày không đổi, nên 100 Gold/ngày không phải trần của mọi nguồn Gold. Đây là giả thuyết cân bằng, cần đo thời gian tới vật phẩm, tỷ lệ hết mồi và retention; không phải cam kết người vận hành có lãi.

Phạm vi người dùng đã chốt: **hiện tại chỉ vật phẩm trong game; quà ngoài đời là giai đoạn sau**. Gold giảm không tự tạo dòng tiền. Doanh thu thật hiện bằng 0, trong khi hạ tầng/vận hành vẫn có chi phí. Khi có quà thật, cần mô hình riêng: `lãi đóng góp = doanh thu ròng đã đối soát − giá vốn quà − đóng gói/vận chuyển − biến phí vận hành − chi phí gian lận/hoàn tiền`. Chỉ phân bổ ngân sách quà từ phần đóng góp dương sau dự phòng và chi phí cố định; doanh thu chưa xác minh hoặc đóng góp không dương thì ngân sách quà bằng 0. Dùng giới hạn ngân sách tổng và tồn kho, không chỉ tỷ lệ thấp trên từng tài khoản; không gán Gold hiện tại thành nghĩa vụ đổi quà thật. Chưa chọn tỷ lệ quà thật khi chưa có số liệu doanh thu, giá vốn và điều kiện vận hành/pháp lý.

Gold là vòng gameplay, không phải doanh thu. Nguồn: starter một lần, catch được server xác minh và daily claim. MVP level chỉ mở nội dung/danh hiệu, không có thưởng Gold level-up. Sink: mồi, mua/nâng cấp trang bị, nội dung mở khóa sau MVP. Xem [GAME_DESIGN.md](GAME_DESIGN.md) để dùng cùng một bảng cân bằng.

Mỗi nguồn/sink phải ghi ledger với reason, sourceId, configVersion, idempotencyKey. Theo dõi Gold tạo/tiêu theo cohort level, median/P90 số dư, số giờ tới nâng cấp đầu tiên, tỷ lệ hết mồi và bỏ chơi. Không âm số dư; không sửa ledger cũ để “cân đối”. Admin đổi cấu hình có audit và version mới, không ảnh hưởng session đang chạy.

Mục tiêu thử nghiệm: người mới có cần/mồi ban đầu, không mắc kẹt khi thất bại; nâng cấp đầu tiên đạt được qua chơi, không cần quảng cáo hay mua tiền. Gold phát sinh/sink lệch dài hạn được xử lý bằng giá/nội dung hợp lý sau đo lường, không xóa tài sản người chơi tùy tiện.

## 3. Định nghĩa số đo và công thức

- **MAU:** tài khoản hợp lệ có gameplay trong 30 ngày, lọc tài khoản staff/test/bot; không dùng registered users thay thế.
- **Paying conversion:** người trả tiền duy nhất trong tháng / MAU. **ARPPU:** doanh thu trả tiền / người trả tiền tháng; nêu rõ gross hay net.
- **Gross booking:** giá khách thanh toán gồm VAT nếu niêm yết như vậy; chưa trừ hoàn tiền/phí. Trong bảng, giá giả định gồm VAT 10% chỉ là biến mô hình; phải xác minh cách tính/thuế suất thực tế với kế toán.
- **Net paid revenue:** gross × (1 − refund rate) / (1 + VAT assumption) × (1 − payment/platform fee). Phí giả định 5% tính trên doanh thu sau VAT để đơn giản; hợp đồng provider có thể tính khác.
- **Gross ARPU:** (gross paid + gross ads) / MAU. **Net ARPU:** tổng doanh thu net / MAU.
- **Contribution/MAU/month:** net ARPU − chi phí biến đổi/MAU. **Break-even MAU:** fixed monthly cost / contribution, chỉ khi contribution > 0 và mô hình giữ được khi scale.
- **Blended CAC:** tổng tiền acquisition / người mới activated được attribution. **Paid CAC:** tiền riêng kênh paid / activated từ kênh paid. Tách khỏi cost per signup/CPI.
- **Contribution LTV:** contribution/tháng × lifetime tháng. Công thức shortcut lifetime ≈ 1/monthly churn chỉ dùng steady-state giả định; D1/D7 không suy ra lifetime đáng tin cậy. Tính cohort LTV thực tế khi có đủ tháng.

Analytics không gửi email/token thô; purchase events tương lai chỉ do server ghi sau provider confirmation. Xem [SECURITY.md](SECURITY.md).

## 4. Ba kịch bản sau khi mô hình thanh toán và quảng cáo được duyệt

Đơn vị tiền: **VNĐ**. Horizon: một tháng vận hành ổn định giả định, không phải tháng đầu ra mắt. eCPM quy đổi trực tiếp VNĐ/1.000 impressions; không giả định USD tỷ giá nào. Membership/cosmetic cùng nằm trong ARPPU, tránh đếm hai lần.

| Biến đầu vào                         | Conservative |       Base | Optimistic |
| ------------------------------------ | -----------: | ---------: | ---------: |
| MAU                                  |        1.000 |      5.000 |     15.000 |
| Paying conversion                    |           1% |         2% |         3% |
| Payers                               |           10 |        100 |        450 |
| Gross ARPPU/tháng                    |       80.000 |    100.000 |    120.000 |
| Gross paid booking                   |      800.000 | 10.000.000 | 54.000.000 |
| Refund rate                          |           2% |         2% |         2% |
| VAT mô hình, cần xác minh            |          10% |        10% |        10% |
| Payment/platform fee mô hình         |           5% |         5% |         5% |
| Ads opt-in / MAU                     |          10% |        20% |        25% |
| Ads requests/người opt-in/tháng      |           10 |         20 |         25 |
| Fill rate                            |          60% |        70% |        80% |
| Filled impressions/tháng             |          600 |     14.000 |     75.000 |
| Gross eCPM giả định                  |       20.000 |     30.000 |     40.000 |
| Gross ads                            |       12.000 |    420.000 |  3.000.000 |
| Ads net realization                  |          90% |        90% |        90% |
| Biến phí/MAU (API/CDN/support usage) |          300 |        300 |        300 |
| Fixed cash cost/tháng                |    2.000.000 |  4.000.000 | 12.000.000 |

Net realization ads là khoản dự phòng thuế/điều chỉnh/withholding, không khẳng định quy định thuế hay net rate của nhà cung cấp. Gross eCPM được định nghĩa trước khoản này; nếu dashboard provider đã là net thì không trừ lần hai. Ads opt-in và requests không phải số lượt quảng cáo bắt buộc mỗi người.

| Kết quả công thức (làm tròn VNĐ)                    | Conservative |      Base | Optimistic |
| --------------------------------------------------- | -----------: | --------: | ---------: |
| Net paid revenue                                    |      677.091 | 8.463.636 | 45.703.636 |
| Net ads                                             |       10.800 |   378.000 |  2.700.000 |
| Tổng net revenue                                    |      687.891 | 8.841.636 | 48.403.636 |
| Gross ARPU                                          |          812 |     2.084 |      3.800 |
| Net ARPU                                            |          688 |     1.768 |      3.227 |
| Contribution/MAU                                    |          388 |     1.468 |      2.927 |
| Tổng biến phí                                       |      300.000 | 1.500.000 |  4.500.000 |
| Cash surplus trước công dev/marketing/thuế thu nhập |   −1.612.109 | 3.341.636 | 31.903.636 |
| Break-even MAU ở fixed cost tương ứng               |        5.157 |     2.725 |      4.100 |

Fixed cash cost gồm hạ tầng nền, monitoring/backup, domain phân bổ, công cụ và support/asset định kỳ theo từng kịch bản; là phong bì ngân sách, chưa phải báo giá VPS. Chi phí usage 300 VNĐ/MAU là giả định độc lập cần thay bằng số đo; không cộng trùng với dịch vụ đã tính fixed. Không lấy hòa vốn 5.157 MAU ở kịch bản thấp để mặc định rằng cấu hình 1.000 MAU đủ tải mức đó.

**Chi phí đầy đủ:** thêm cơ hội lao động một developer giả định 25 triệu/tháng và marketing duy trì giả định 3 triệu/tháng. Base fixed đầy đủ = 32 triệu; break-even khi đó khoảng **21.794 MAU** nếu contribution giữ nguyên. Optimistic surplus sau hai khoản này còn khoảng 3,90 triệu; không gọi là lợi nhuận sau thuế. Legal, sản xuất ban đầu và asset thuê ngoài là chi phí một lần, phải lập ngân sách riêng, không biến mất trong cash surplus.

## 5. CAC, retention, LTV và độ nhạy

| Giả định minh họa                              | Conservative |   Base | Optimistic |
| ---------------------------------------------- | -----------: | -----: | ---------: |
| Monthly churn dùng mô hình                     |          50% |    35% |        25% |
| Lifetime ≈ 1/churn, tháng                      |         2,00 |   2,86 |       4,00 |
| Contribution LTV, VNĐ/người                    |          776 |  4.195 |     11.708 |
| Activated mới attribution từ ngân sách 5 triệu |          200 |    500 |      1.000 |
| Blended CAC                                    |       25.000 | 10.000 |      5.000 |
| LTV/CAC giả định                               |         0,03 |   0,42 |       2,34 |

Các số CAC là giả định, không cam kết đạt user. Ngân sách 5 triệu có cả nội dung dùng lâu dài nên blended CAC pilot và CAC vận hành ổn định cần báo riêng; số bảng dùng toàn bộ chi phí để tránh che chi phí. Referral không thưởng tiền: chỉ dự kiến cosmetic sau khi có chống abuse và pháp lý; tiền thiết kế/thực thi nội dung referral nằm ngân sách marketing, không hạch toán Gold thành chi phí tiền mặt.

Base nhạy mạnh với conversion: giảm từ 2% xuống 1% làm net paid/MAU giảm khoảng 846 VNĐ và contribution còn khoảng 622; cash break-even tăng từ 2.725 lên khoảng 6.432 MAU. Nếu churn tăng từ 35% lên 50%, contribution LTV base giảm từ khoảng 4.195 xuống 2.937. Chi phí fixed khi scale, thuế và fee cao hơn đều làm break-even xấu đi.

**Quyết định:** chưa mua tăng trưởng quy mô lớn khi chưa chứng minh retention và LTV thực đo. D1 25–30%, D7 10–15% là mục tiêu thử nghiệm, không phải bằng chứng economics tốt. Chỉ đề xuất mở rộng paid sau khi có ít nhất cohort đủ trưởng thành, LTV/CAC có biên an toàn và review pháp lý hoàn tất.

## 6. Lộ trình nghiệm thu

1. MVP: chỉ Gold, không SDK ads/payment; nghiệm thu ledger, mission claim/purchase Gold idempotent, analytics không đếm trùng.
2. Closed beta: kiểm tra retention/cảm nhận công bằng, khảo sát cosmetic có prototype và giá giả định; không lấy survey willingness-to-pay thành doanh thu.
3. Legal/business review: tài liệu phân loại game, tuổi, dữ liệu, giao dịch, hợp đồng/thuế; danh sách hạng mục chưa đủ bằng chứng.
4. Pilot riêng sau phê duyệt: một danh mục cosmetic, payment provider sandbox, webhook replay/refund reconciliation, hạn mức và dashboard hỗ trợ.
5. Mở rộng nguồn doanh thu từng cái; A/B test không gây bất lợi gameplay; rollback khả dụng.

Chiến lược giá thấp/quy mô lớn và nguồn B2B (hồ câu, nhãn đồ câu): [BUSINESS_PLAN](BUSINESS_PLAN.md).

Nguồn sản phẩm đối chiếu được ghi trong [COMPETITORS.md](COMPETITORS.md); các bảng tài chính hoàn toàn là giả định nội bộ. Không có giá provider/ads hiện hành nào đã được xác minh trong phiên Discovery.
