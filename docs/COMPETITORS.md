# Phân tích đối thủ và giả thuyết khác biệt

Ngày kiểm tra nguồn: **07/11/2026, Asia/Ho_Chi_Minh**. Trạng thái: desk research từ website chính thức; chưa chơi thử có ghi hình, chưa phỏng vấn khách hàng Việt Nam, chưa mua báo cáo thị trường. “Thành công” ở đây chỉ có nghĩa là sản phẩm đang có dấu hiệu vận hành/nội dung/cộng đồng trên nguồn công khai, không suy ra lợi nhuận.

## 1. Nguồn và mức độ kiểm chứng

| Mã  | Nguồn chính thức, kết quả truy cập                                                            | Điều đã đọc được                                                                                                                                                | Giới hạn                                                                                                              |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| C1  | [Fishing Planet](https://fishingplanet.com/), HTTP 200                                        | Metadata giới thiệu first-person online multiplayer, free-to-play; trang có realistic physics, tournaments, multiplayer, DLC; gói quảng bá Premium/XP/Baitcoins | Không kiểm tra checkout, giá tại Việt Nam, thời lượng phiên, doanh thu hoặc DAU                                       |
| C2  | [Ten Square Games — Our games](https://tensquaregames.com/our-games/), HTTP 200               | Fishing Clash được mô tả là 3D fishing simulator, nhiều loài và địa điểm; portfolio tự mô tả free-to-play hobby simulators                                      | URL cũ `/games/fishing-clash/` chuyển về trang này. Chưa kiểm tra in-app purchase hay session thực tế                 |
| C3  | [Let's Fish](https://lets-fish.com/), HTTP 200                                                | Trang chính thức tiếng Ba Lan tự mô tả free browser game, bộ trang bị, mở hồ theo level, collection, event, ranking, club                                       | Đây là nội dung marketing của hãng; không coi số tài khoản/“active” tự công bố là MAU đã kiểm toán                    |
| C4  | [WEBFISHING — trang tác giả trên itch.io](https://lamedeveloper.itch.io/webfishing), HTTP 200 | Bản JAM có nhân vật động vật, fishing online/offline, bắt cá mở cosmetic; tác giả nói bản Steam đã được làm lại hoàn toàn                                       | Phân biệt rõ bản JAM với Steam; mô tả không chứng minh tình trạng dịch vụ, tính năng hay giá bản Steam hiện nay       |
| C5  | [WEBFISHING trên Steam](https://store.steampowered.com/app/3146520/WEBFISHING/)               | Link được tác giả C4 dẫn tới                                                                                                                                    | Phiên nghiên cứu này không đọc được nội dung do TLS kết nối; không dùng làm bằng chứng về giá hay tính năng hiện hành |

Không dùng số lượt cài đặt, lượt chơi, rating hay doanh thu để tính TAM/SAM/SOM. Website có thể thay đổi; cần lưu nguồn/chụp màn hình có ngày trước khi quyết định đầu tư lớn. Không sử dụng bình luận người dùng trên trang itch.io làm sự kiện đã xác minh.

## 2. Bảng so sánh triển khai

Các điểm “chi phí/UX” dưới đây là **suy luận thiết kế của dự án**, không phải số liệu nội bộ đối thủ.

| Game                             | Gameplay/nền tảng có bằng chứng                                  | Tiến trình và kinh doanh quan sát được                                         | Điều có thể học                                                        | Chi phí asset/UX suy luận                                                 | Ý nghĩa với Fishing World Online                                       |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Fishing Planet                   | Mô phỏng 3D góc người thứ nhất, vật lý, multiplayer (C1)         | Free-to-play, DLC và Premium trong gói (C1)                                    | Cảm giác cá có sức nặng; trang bị gắn với mục tiêu câu                 | Asset 3D, vật lý và nhiều địa điểm đòi hỏi sản xuất/QA lớn hơn MVP 2D     | Chọn một thao tác đấu cá dễ hiểu thay vì cạnh tranh độ chân thực       |
| Fishing Clash                    | Simulator 3D, nhiều cá và địa điểm (C2)                          | Portfolio free-to-play; cấu trúc bán cụ thể cần kiểm tra thêm                  | Trình bày cá và địa điểm như mục tiêu khám phá                         | Cần nhiều nội dung hình ảnh để giữ cảm giác mới; chưa đo độ dài phiên     | Một hồ đẹp, phản hồi rõ và 10 loài trước khi mở rộng live ops          |
| Let's Fish                       | Browser; mở hồ theo level; collection, ranking, event, club (C3) | Free browser; shop trang bị được giới thiệu; chưa kiểm tra cấu trúc thanh toán | Browser đã có đối thủ trực tiếp; collection và progression có liên kết | Màn nhiều hệ thống có thể gây tải nhận thức; cần playtest để xác nhận     | “Không cần cài” chỉ là điều kiện tiện lợi, chưa đủ thành lợi thế riêng |
| WEBFISHING (bản JAM, tham chiếu) | Nhân vật động vật, online/offline, bắt cá mở cosmetic (C4)       | Bản JAM tải về name-your-own-price; bản Steam khác hoàn toàn                   | Thẩm mỹ thân thiện và mục tiêu biểu đạt bản thân                       | 3D cách điệu vẫn cần animation/avatar; cộng đồng tạo gánh nặng moderation | Học cảm giác thư giãn và cosmetic; chat/phòng realtime để backlog      |

Không sao chép asset, âm thanh, giao diện, tên vật phẩm hoặc công thức kinh tế của đối thủ.

## 3. Định vị đề xuất

**“Một góc hồ Việt Nam trong trình duyệt: chơi 5–10 phút, học đấu cá trong một phút, mỗi ngày thêm một kỷ lục.”** Đây là giả thuyết định vị cần thử với người thật.

1. **Bản địa hóa có chiều sâu:** Hồ Sen, cá rô/cá lóc/cá chép và mô tả gần gũi; tiếng Việt trước, tên cá có thể đối chiếu sinh học khi sản xuất nội dung. Không tự nhận đã có nhóm đối thủ thiếu tiếng Việt nếu chưa kiểm tra storefront/localization.
2. **Phiên ngắn nhưng có kỹ năng:** giữ/thả để quản lý lực và độ căng; không bắt người mới học tổ hợp phím; mobile một tay. Mục tiêu first catch dưới ba phút kể từ vào hồ.
3. **Sưu tập và kỷ lục minh bạch:** album có bóng cá chưa gặp, record cân nặng; Gold kiếm qua gameplay, không trả tiền mua tỷ lệ cá hiếm trong MVP.
4. **Tải nhẹ:** tách React shell và Phaser chunk, một cảnh 2D side-view; mục tiêu payload ban đầu được đo trong test plan, không quảng cáo “chạy mọi máy”.
5. **Cạnh tranh nhẹ:** leaderboard bất đồng bộ, không dựng multiplayer chỉ để dùng chữ “online”.

## 4. Thử nghiệm trước khi mở rộng

| Giả thuyết                            | Cách kiểm tra                                                                                                             | Bằng chứng chấp nhận tạm thời                                                              | Quyết định nếu không đạt                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Người Việt quan tâm cá/hồ quen thuộc  | Phỏng vấn 12–15 người: người câu thật, casual, người chơi sưu tập; cho xem cùng prototype với tên địa phương và tên chung | Đa số hiểu giá trị trong 30 giây và nêu được lý do tự quay lại; ghi cả phản hồi trái chiều | Sửa định vị/nội dung, không thêm nhiều hồ để bù        |
| Đấu cá có kỹ năng nhưng không gây bực | 10 buổi quan sát mobile/desktop, không hướng dẫn ngoài tutorial                                                           | Ít nhất 8/10 hoàn thành tutorial; ghi điểm bỏ cuộc, thao tác sai, cảm giác căng dây        | Chỉnh feedback/timing trước balance tỷ lệ              |
| Phiên ngắn tạo động lực quay lại      | Closed beta cohort, events first_cast/first_catch/session_end/mission_claim                                               | Tutorial >70%, activation >50%, D1 25–30%, D7 10–15% là mục tiêu thử nghiệm                | Ngừng tăng ngân sách acquisition, sửa trải nghiệm      |
| Browser có lợi cho chia sẻ            | Landing → đăng ký → first catch phân theo thiết bị/kênh                                                                   | Có ít nhất 100 activated players để ước lượng funnel ban đầu; báo cả số mẫu                | Sửa tải trang/funnel; chưa kết luận product-market fit |

## 5. Việc nghiên cứu còn thiếu

- Chơi thử và ghi screen flow của Fishing Clash/Let's Fish; xác minh UX shop, ranh giới miễn phí và localization tiếng Việt, có ngày và phiên bản.
- Đọc bản Steam WEBFISHING chính thức khi truy cập được; không suy tính năng bản hiện hành từ bản JAM.
- Kiểm tra game câu cá web/mobile đang phổ biến tại Việt Nam qua phỏng vấn và storefront địa phương; phân biệt game câu cá với bắn cá/đổi thưởng.
- Ước lượng nhu cầu bằng landing và beta, không lấy doanh thu quốc tế hoặc số cộng đồng tự công bố làm dự báo Việt Nam.

Tiêu chí nghiệm thu nghiên cứu mở rộng: bảng source/date/version, ít nhất 4 flow quan sát/game, 12 biên bản phỏng vấn ẩn danh, kết luận có dữ liệu phản bác và cập nhật backlog.
