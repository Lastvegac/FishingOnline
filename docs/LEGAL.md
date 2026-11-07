# Nghiên cứu pháp lý sơ bộ và gate phát hành tại Việt Nam

Cập nhật/đọc nguồn: **07/11/2026, Asia/Ho_Chi_Minh**. Đây là hồ sơ vấn đề cần giải quyết cho sản phẩm, không phải kết luận đủ điều kiện phát hành hoặc ý kiến pháp lý của luật sư. Chỉ ghi là đã xác minh những nội dung đọc được từ nguồn chính thức bên dưới; chưa hoàn tất rà soát toàn văn, văn bản sửa đổi, văn bản hướng dẫn hoặc cơ quan thụ lý hiện tại.

## 1. Nguồn chính thức đã truy cập

| Mã  | Nguồn / ngày bài                                                                                                                                                                                                                                                                 | Đã đọc được                                                                                                                                      | Giới hạn                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| L1  | [Báo Điện tử Chính phủ — Nghị định 147/2024/NĐ-CP: Không mua, bán vật phẩm ảo giữa những người chơi](https://xaydungchinhsach.chinhphu.vn/nghi-dinh-147-2024-nd-cp-khong-mua-ban-vat-pham-ao-giua-nhung-nguoi-choi-tro-choi-dien-tu-voi-nhau-119241113161443995.htm), 13/11/2024 | Bài nêu NĐ ban hành 09/11/2024, hiệu lực 25/12/2024; virtual items/currency, hồ sơ phát hành, thông tin tài khoản/người giám hộ và lưu thông tin | Bài giải thích chính thức, chưa thay thế toàn văn hợp nhất/cập nhật tại ngày phát hành                              |
| L2  | [Báo Điện tử Chính phủ — Những quy định đáng chú ý trong Luật Bảo vệ dữ liệu cá nhân 2025](https://xaydungchinhsach.chinhphu.vn/nhung-quy-dinh-dang-chu-y-trong-luat-bao-ve-du-lieu-ca-nhan-2025-119251225084154179.htm), 25/12/2025                                             | Bài nêu hiệu lực luật từ 01/01/2026, các hành vi cấm, nghĩa vụ dữ liệu, vấn đề chuyển xuyên biên giới                                            | Cần đối chiếu toàn văn và quy định áp dụng riêng cho game; không áp dụng máy móc điều dành cho mạng xã hội/lao động |
| L3  | [Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/)                                                                                                                                                                                                                            | Truy cập thành công cổng tra cứu                                                                                                                 | Chưa xác định được trang toàn văn/bản ký đúng NĐ 147 qua công cụ trong phiên này; không ghi một docid đoán là nguồn |

Không chỉ dựa Nghị định 13/2023 về dữ liệu để kết luận nghĩa vụ năm 2026. Phải kiểm tra Luật 2025, văn bản hướng dẫn/sửa đổi và hiệu lực chuyển tiếp. Chưa xác minh đầy đủ có sửa đổi NĐ 147 sau 2024 hay không; đây là việc bắt buộc trước beta ngoài nhóm.

## 2. Phân loại theo tương tác thực tế

Không gọi sản phẩm là G4 chỉ vì đồ họa 2D, không có chat hay chưa thu tiền. Cần mô tả các trao đổi giữa client, server và người chơi, rồi đối chiếu định nghĩa pháp lý hiện hành.

| Nhóm cần đối chiếu | Mô hình tương tác cần phân biệt*                                                      | Tình huống Fishing World cần xem                                                                    |
| ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| G1                 | Nhiều người chơi tương tác với nhau qua máy chủ                                       | Co-fishing, chat, giao dịch, giải đấu hoặc cơ chế đối kháng có thể làm thay đổi phân tích           |
| G2                 | Người chơi tương tác với máy chủ                                                      | Server quyết định catch/Gold/mission của từng người; là đặc điểm quan trọng cần phân tích trong MVP |
| G3                 | Người chơi tương tác với nhau, không tương tác máy chủ theo mô hình luật định         | Không dự kiến có peer-to-peer trong MVP                                                             |
| G4                 | Tải nội dung, không tương tác với người chơi khác hoặc máy chủ theo mô hình luật định | MVP vẫn dùng backend cho kết quả; không thể tự nhận G4 từ việc không multiplayer                    |

`*` Đây là khung phân tích sơ bộ cần đối chiếu nguyên văn định nghĩa và hướng dẫn hiện hành; chưa phải kết luận phân loại. Bảng xếp hạng bất đồng bộ cũng phải được mô tả trong hồ sơ: dữ liệu gì, cách so kỷ lục, có cạnh tranh trực tiếp/phần thưởng hay không.

Hồ sơ giao tư vấn: sơ đồ request, video loop, session riêng, leaderboard chỉ đọc, không chat/trading/payments, currency không chuyển nhượng, chính sách tuổi, hạ tầng và đơn vị dự kiến phát hành. Yêu cầu trả lời bằng văn bản về phân loại, điều kiện doanh nghiệp và thủ tục tương ứng. Nguồn L1 phân biệt Quyết định phát hành G1 và Giấy xác nhận thông báo phát hành G2/G3/G4; không diễn giải rằng nhóm sau chỉ cần tự đăng thông báo lên website.

## 3. Các tác động cụ thể vào sản phẩm

| Chủ đề                      | Căn cứ/điểm cần xác minh                                                                                              | Hành động / gate                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tài khoản                   | L1 nêu họ tên, ngày sinh, số điện thoại di động VN; người dưới 16 do cha mẹ/người giám hộ đăng ký                     | Email/password là bản nội bộ. Trước beta ngoài nhóm phải chốt xác minh/age/guardian; cập nhật API/schema/consent và test       |
| Thời gian chơi/trẻ em       | Phải đối chiếu quy định thời lượng/cảnh báo/phân loại độ tuổi trong toàn văn hiện hành                                | Không đưa con số giới hạn chưa xác minh thành policy. Server-side enforcement, không chỉ checkbox tự nhận tuổi                 |
| Lưu và xóa dữ liệu          | L1 nêu giữ thông tin trong thời gian dùng và 6 tháng sau ngừng dùng; L2 đặt thêm nghĩa vụ dữ liệu                     | Lập retention matrix theo loại dữ liệu, căn cứ và quyền xóa; pháp lý giải quyết xung đột giữ bắt buộc/xóa/ẩn danh              |
| Quyền sử dụng thông tin     | L1 nêu quyền cho phép/không cho phép dùng cho quảng bá/cung cấp bên khác                                              | Consent riêng marketing; không gộp với chấp thuận chơi; tài liệu privacy giải thích analytics và nhà cung cấp                  |
| Cloud/R2/analytics          | Có thể liên quan truyền dữ liệu xuyên biên giới, hợp đồng xử lý và nơi lưu trữ                                        | Data map, vendor inventory, kiểm tra yêu cầu đánh giá/hồ sơ theo luật hiện hành trước chọn region; asset public không chứa PII |
| Vật phẩm/Gold               | L1: dùng trong phạm vi game/theo hồ sơ; không quy đổi ngược ra tiền/thẻ/vật có giá trị, không mua bán giữa người chơi | Gold-only, không cash-out/trading/betting; không gắn quà ngoài game vào kết quả/đơn vị ảo                                      |
| Khuyến mãi/giải thưởng      | L1 nêu không gắn chương trình khuyến mãi có thưởng tiền/hiện vật ngoài trò chơi vào UI/tính năng                      | Không triển khai giải thưởng cần câu thật theo leaderboard hoặc referral khi chưa thẩm định mô hình                            |
| Thanh toán/cosmetic/VIP     | Có thể kéo theo nghĩa vụ game, nội dung, thanh toán, thuế, người tiêu dùng                                            | Chưa checkout/premium wallet; review riêng rồi thiết kế provider/refund/cancel và reconciliation                               |
| Quảng cáo/affiliate/sponsor | Nội dung phù hợp tuổi, disclosure, dữ liệu, hợp đồng và giới hạn quảng cáo                                            | Chưa SDK ads; sponsor không tự mở quyền tặng quà ngoài game. Xem MONETIZATION/MARKETING                                        |
| Bản quyền                   | Cá/nền/sprite/audio/font và nội dung thương hiệu                                                                      | Asset register, giấy phép thương mại, attribution; không sao chép asset đối thủ                                                |
| Vận hành                    | Điều kiện kỹ thuật/nhân sự, tiếp nhận khiếu nại và báo cáo tùy phân loại                                              | Chủ thể phát hành, đầu mối xử lý, quy trình support/incident và hồ sơ phải hoàn tất                                            |

## 4. Các gate có bằng chứng

**G0 phát triển nội bộ:** dữ liệu giả hoặc tài khoản nhóm phát triển, localhost/private staging, không payment/quảng cáo. Việc này không là kết luận miễn pháp lý cho mọi môi trường thử nghiệm.

**G1 beta ngoài nhóm:** có tư vấn về phân loại/phát hành/thử nghiệm; chủ thể và thủ tục phù hợp; tài khoản/guardian/time controls nếu áp dụng; privacy/retention/security; quyền asset. Invitation-only và không thu tiền không tự thay thế các điều kiện này.

**G2 public:** các điều kiện G1 + hồ sơ/văn bản cần thiết đã hoàn tất, nội dung/version đúng hồ sơ, terms/privacy/tuổi/support công khai, monitoring và trách nhiệm vận hành được phân công.

**G3 doanh thu thật:** review riêng từng hình thức, hợp đồng/thuế/provider, tuổi/consent, refunds/audit/anti-fraud; chỉ mở feature flag khi chủ sản phẩm phê duyệt trên tài liệu cụ thể.

## 5. Việc cần đóng trước khi kết luận

- [ ] Lấy bản gốc/bản hợp nhất chính thức của NĐ 147 và danh sách sửa đổi còn hiệu lực ở ngày dự định phát hành.
- [ ] Đối chiếu nguyên văn G1–G4 với protocol server-authoritative, leaderboard và phiên riêng; lưu memo kết luận và người chịu trách nhiệm.
- [ ] Xác định cơ quan có thẩm quyền hiện hành và thủ tục/điều kiện pháp nhân, không dùng tên cơ quan cũ mặc định.
- [ ] Kiểm chứng điều khoản tuổi, xác thực, guardian, thời lượng/cảnh báo và dữ liệu trước thiết kế identity cuối.
- [ ] Đối chiếu Luật Bảo vệ dữ liệu cá nhân 2025 và hướng dẫn 2026, chuyển dữ liệu xuyên biên giới, consent/retention/breach response.
- [ ] Dự toán phí tư vấn, hồ sơ và công sức phát triển bổ sung; tách khỏi chi phí VPS và ngân sách marketing 5 triệu.

Lộ trình hợp thức hoá đề xuất và trạng thái xác thực số điện thoại: xem [BUSINESS_PLAN §7](BUSINESS_PLAN.md).

Owner: chủ sản phẩm + tư vấn pháp lý được chọn; developer cung cấp mô tả kỹ thuật và bằng chứng. Không đánh dấu “legal approved” bằng việc hoàn tất tài liệu này.
