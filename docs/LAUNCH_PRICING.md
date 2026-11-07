# Giá mở đầu — thu hút người chơi

Ngày 07/11/2026. Chính sách `acquisition-2026-11-v1` được chủ sản phẩm chấp thuận để thử nghiệm trước ra mắt. Gold kiếm trong game; Kim cương mua trang phục/đạo cụ ngoại hình. Không bán Gold, không đổi Gold sang Kim cương. Giá thấp là giả thuyết acquisition, chưa có dữ liệu để kết luận doanh thu hoặc lợi nhuận.

## Gói nạp

| Gói        | Giá thanh toán |          Nhận |
| ---------- | -------------: | ------------: |
| Khởi Đầu   |        10.000đ | 100 Kim cương |
| Phong Cách |        20.000đ | 200 Kim cương |

Cùng tỷ lệ 100đ/Kim cương, không bonus theo lượng nạp. Đây là tỷ lệ mua, không phải giá đổi ngược ra tiền. Mức chi thực tế tối thiểu là một gói 10.000đ; ví dụ món 30 Kim cương dùng 30/100 Kim cương của gói, không có checkout 3.000đ riêng. Gold không quy đổi ra VND.

Hiện local `PAYMENT_ENVIRONMENT=disabled`: hai gói được niêm yết, nút mua vô hiệu hóa; API từ chối tạo đơn khi phương thức chưa cấu hình. Chưa có merchant credentials hoặc nghiệm thu trực tiếp sandbox nhà cung cấp. Xem [PAYMENTS](PAYMENTS.md) trước khi mở thanh toán.

## Đồ câu và mồi theo cấp

Đơn vị Gold. Giá mua mồi tính cho **gói 10**, giá bán lại tính cho **một đơn vị**; trang bị mỗi món một đơn vị. Cấp là điều kiện tối thiểu, không tăng giá theo cấp tài khoản. Đồ địa phương còn yêu cầu mở khóa và chọn đúng điểm câu.

| Món               | Cấp | Mua | Bán lại/đơn vị | Tiệm                |
| ----------------- | --: | --: | -------------: | ------------------- |
| Giun đất ×10      |   1 |  30 |  Không thu mua | Chung               |
| Cần tre           |   2 | 120 |             40 | Chung               |
| Ngô ngọt ×10      |   2 |  30 |              1 | Chung               |
| Cám thơm ×10      |   2 |  30 |              1 | Chung               |
| Ốc bươu ×10       |   2 |  40 |              2 | Sông, nước lợ       |
| Cá mồi sống ×10   |   3 |  50 |              3 | Sông, rừng sâu      |
| Dế mèn ×10        |   3 |  40 |              2 | Suối, rừng sâu      |
| Cần sông dài      |   3 | 240 |             90 | Sông                |
| Cần suối ngắn     |   3 | 240 |             90 | Suối                |
| Dây fluorocarbon  |   3 | 160 |             60 | Suối, sông          |
| Lưỡi câu tròn     |   3 | 120 |             40 | Sông, suối, nước lợ |
| Cần composite     |   4 | 360 |            140 | Chung               |
| Cần lóc rừng      |   4 | 420 |            160 | Rừng sâu            |
| Tôm sống ×10      |   5 |  50 |              3 | Nước lợ, bờ biển    |
| Dây dù bện        |   5 | 240 |             90 | Nước lợ, bờ biển    |
| Mực cắt khúc ×10  |   6 |  60 |              3 | Bờ biển             |
| Cần ném biển      |   6 | 600 |            240 | Bờ biển             |
| Lưỡi câu chống gỉ |   6 | 180 |             70 | Bờ biển             |

Giữ starter 200 Gold, 20 giun và bộ cần/dây/lưỡi cơ bản. Nâng cấp 100/250 Gold, cứu trợ mồi và nhiệm vụ giữ cấu hình hiện có. Giá giun 30 Gold/gói giữ điều kiện economy starter/cứu trợ; giun không bán lại. Đổi cá vẫn snapshot 10% thưởng cơ sở, làm tròn xuống, 1–100 Gold/con và tối đa 100 Gold/ngày Việt Nam; đây không phải trần mọi nguồn Gold.

## Trang phục và đạo cụ

Mọi món trả tiền dưới đây mở từ cấp 1; trang phục chỉ thay ngoại hình, không cộng power/control, tỷ lệ cá hoặc XP. Giá từng phần áo/quần được ghi riêng.

| Món / ID                                                                                                                                                                 |           Giá |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------: |
| Quạt (`fan`)                                                                                                                                                             |       20 Gold |
| Bình rượu (`wine-flask`)                                                                                                                                                 |       20 Gold |
| Quạt tre (`bamboo-fan`)                                                                                                                                                  |       20 Gold |
| Vòng tay ngọc (`jade-bracelet`)                                                                                                                                          |       20 Gold |
| Khăn che lụa (`silk-veil`)                                                                                                                                               |       20 Gold |
| Dây chuyền ngọc (`jade-necklace`)                                                                                                                                        |       30 Gold |
| Áo choàng lãng khách (`cloak-wanderer`)                                                                                                                                  |       40 Gold |
| Áo choàng đạo sĩ (`cloak-taoist`)                                                                                                                                        |       40 Gold |
| Màu rượu / tím / hồng (`dye-wine`, `dye-lilac`, `dye-blush`)                                                                                                             |   10 Gold/màu |
| Họa tiết sen, rồng, phượng, mây, sóng, tre, mai, hồi văn (`pattern-lotus`, `dragon`, `phoenix`, `cloud`, `wave`, `bamboo`, `plum`, `meander`, đều có tiền tố `pattern-`) |   10 Gold/mẫu |
| Kiếm nghi lễ (`ceremonial-sword`)                                                                                                                                        |  30 Kim cương |
| Áo lễ hội (`festival-upper`)                                                                                                                                             |  50 Kim cương |
| Quần lễ hội (`festival-lower`)                                                                                                                                           |  50 Kim cương |
| Áo mùa đông (`winter-upper`)                                                                                                                                             |  60 Kim cương |
| Quần mùa đông (`winter-lower`)                                                                                                                                           |  60 Kim cương |
| Áo hoàng gia (`royal-upper`)                                                                                                                                             | 100 Kim cương |
| Quần hoàng gia (`royal-lower`)                                                                                                                                           | 100 Kim cương |

Miễn phí từ cấp 1: áo/quần `elder`, `fisher`, `maiden`, `wanderer`, `summer`, `swordswoman`; tóc `hair-bun`, `hair-braid`, `hair-long`, `hair-loose`, `hair-pinned`, `hair-ponytail`, `hair-short`, `hair-tousled`; `hat-bamboo`, `hat-scholar`, `belt-cloth`, `belt-jade`, `shoes-cloth`, `shoes-boots`, `fish-basket`, `gourd`, `jade-cord`, `jade-pin`, `pouch`, `scarf`, `talisman`, `travel-pack`, `wood-pin`. Mỗi cặp áo/quần dùng hậu tố `-upper`/`-lower`. Áo/quần `taoist-upper`/`taoist-lower` mở miễn phí ở cấp 3.

Collection dùng giảm giá và phần còn thiếu theo cấu hình admin hiện có (local hiện 10%); hệ thống báo giá trước mua. Bộ có nhiều loại tiền yêu cầu mua từng món. Người đã sở hữu món sau này chuyển sang Kim cương vẫn giữ món, không bị trừ thêm hoặc tính lại lịch sử. Không tự tạo event, pass hoặc membership trả tiền.

## Áp dụng và nghiệm thu

Nguồn giá: `packages/game-config/src/launch-pricing.ts` và shop của `DEFAULT_CONFIG`. Cài mới seed đúng giá; database đã có cấu hình chỉ đổi giá bằng thao tác vận hành rõ ràng, seed bổ sung nội dung không tự ghi đè giá admin.

Từ root repository:

```sh
rtk proxy pnpm --filter @fwo/api pricing:launch
rtk proxy pnpm --filter @fwo/api pricing:launch --apply --expected-version VERSION_VUA_PREVIEW --reason 'Apply approved acquisition pricing'
```

CLI chỉ nhận database local, yêu cầu version hiện tại khi apply. Transaction khóa cấu hình/cosmetic/product, publish version mới khi shop thay đổi, tăng version từng món/gói và ghi audit `APPLY_LAUNCH_PRICING`. Chỉ chỉnh giá offer có sẵn, không hồi sinh nội dung admin đã gỡ hoặc đổi cấp/chỉ số/địa điểm. Phiên câu, đơn cũ, đồ sở hữu, số dư và ledger giữ nguyên. Chạy lại khi đã khớp không publish/audit thêm; không tự bật lại gói operator đã tắt.

Tiêu chí nghiệm thu: preview không ghi; version cũ rollback; apply và retry giữ tài sản/snapshot; signed IPN đồng thời cấp Kim cương một lần; mua cosmetic trừ đúng tiền một lần; có đơn Kim cương vẫn publish cấu hình được; catalog hiển thị giá Việt–Anh ở 320px/1440px và từ chối checkout disabled. Các kiểm tra này đã qua trên PostgreSQL riêng và Chromium với API mock cho phần UI. Cần merchant sandbox thật, Safari/thiết bị thật và cohort playtest trước mở bán công khai.

Theo dõi D1/D7, thời gian mua món đầu, hết mồi, Gold tạo/tiêu, paying conversion, net revenue sau phí/hoàn tiền và chi phí vận hành. Chưa tăng giá hoặc chi acquisition quy mô lớn khi chưa có dữ liệu; quà thật cần ngân sách và mô hình chi phí riêng.
