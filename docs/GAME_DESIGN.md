# Game Design Document — Fishing World Online

Ngày thiết kế: 07/11/2026. Engine TypeScript có kiểm thử deterministic, chưa có dữ liệu cân bằng từ người chơi thật. Bản runtime đã mở rộng sang simulator Three.js, 6 điểm câu và 37 loài, chat/khoe cá/bảng tuần bằng dữ liệu thật. Hồ sơ baseline bên dưới được giữ để đối chiếu; ưu tiên [SIMULATOR](SIMULATOR.md), [IMPLEMENTATION_CONTRACT](IMPLEMENTATION_CONTRACT.md) và source khi khác biệt. Không có cược hoặc giao dịch giữa người chơi; thanh toán thuộc module riêng và không được bật bởi nâng cấp simulator.

## Runtime simulator

Chọn hướng, lực và tầng nước trước khi cast; gió, khối lượng bộ câu và chiều dài cần quyết định điểm rơi, vùng kiếm ăn và độ ồn. Loài cá có profile riêng về độ sâu/nhiệt độ/giờ/habitat/cảnh giác/sức bền/kiểu chống trả. Conditions do server tạo theo địa hình và block thời tiết 20 phút, snapshot tại create; không gọi dịch vụ thời tiết thật.

Chờ tự nhiên 4,5–35 giây sau điểm rơi (tutorial tối đa 9 giây), lần lượt tìm mồi/tiếp cận/kiểm mồi/ăn/cắn; có thể từ chối. Giật sớm mất cá, giật muộn lỡ cửa sổ; giật gần tâm cửa sổ cho chất lượng móc cao hơn. Fight dùng drag, hướng cần, khối lượng, kiểu DASH/BOTTOM/WEAVE/SURFACE, current, tải dây, độ giãn và mài mòn. Các chỉ số hiện: tension, stamina, drag, độ bền dây, khoảng cách và tải cần. Độ bền chỉ thuộc lượt câu, chưa phá/xóa inventory vĩnh viễn. Fight mới tối đa 75 giây, tick 50ms/hold TTL 350ms; phải kiệt sức và kéo về bờ mới bắt được.

Catch lưu gram và chiều dài xấp xỉ theo loài, thời điểm, địa điểm, mồi/cần; XP/collection/mission ghi khi bắt, Gold khi đổi cá theo policy hiện có. Config và session legacy giữ snapshot/engine cũ; không tái tính thưởng. Chat share chỉ từ catch sở hữu đúng điểm câu. Bảng tuần miễn phí tính cá lớn nhất đã ghi nhận từ thứ Hai 00:00 Việt Nam, không có phí/đăng ký/phần thưởng giải đấu.

## Baseline MVP trước simulator

## 1. Trải nghiệm cốt lõi

Một lượt chơi 3–8 phút: vào Hồ Sen, câu 3–8 lượt, có một mục tiêu gần để hoàn thành và một mục tiêu dài để quay lại. Một lượt câu dự kiến 20–45 giây; thất bại vẫn cho biết nguyên nhân và cách cải thiện, không trao thưởng giả. Người chơi thành công nhờ phản ứng khi phao chìm và nhả/kéo hợp lý, thay vì liên tục bấm càng nhanh càng tốt.

Khác biệt cần kiểm chứng: loài cá và phong cảnh Việt Nam, thao tác một tay trên mobile, mở trình duyệt là chơi, tiến trình minh bạch và không bán lợi thế bằng tiền thật. Đây là giả thuyết sản phẩm, không phải kết luận về nhu cầu thị trường.

## 2. Chọn góc nhìn

| Phương án | Độ khó và chi phí asset                                                 | Trải nghiệm                                          | Mở rộng                                                 | Mobile browser                                            |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Top-down  | Trung bình; cần nhiều hướng nhân vật, tile và va chạm nếu đi lại        | Khám phá hồ tốt, đấu cá khó biểu đạt bằng chính cảnh | Thuận lợi cho bản đồ, NPC, multiplayer sau này          | Tốt nếu đơn giản hóa điều khiển; joystick chiếm diện tích |
| Side-view | Thấp nhất cho một điểm câu; một nền nhiều lớp, một bộ động tác nhân vật | Phao, cần, dây và lực kéo rõ; không cần đi bộ        | Thêm hồ qua dữ liệu/nền; di chuyển thế giới hạn chế hơn | Tốt; một vùng cảnh và một nút chính, hỗ trợ portrait      |
| Isometric | Cao; phối cảnh, sorting, nhiều asset và vùng chạm                       | Đẹp và có chiều sâu, hợp trang trí                   | Thuận lợi cho thế giới mở nhưng tăng chi phí nội dung   | Khó hơn với vật nhỏ, overdraw và độ chính xác chạm        |

**Đề xuất MVP: side-view.** Phaser render cảnh câu và hiệu ứng; React render giao diện ngoài frame loop. Không xây hệ thống di chuyển nhân vật, collision map hoặc 3D. Chỉ cân nhắc đổi góc nhìn sau khi chứng minh retention; đổi góc nhìn không phải nâng cấp miễn phí vì cần thay asset và scene.

## 3. Vòng lặp và nội dung khởi đầu

1. Đăng ký/đăng nhập → nhận một lần 200 Gold, cần gỗ, dây nylon, lưỡi cơ bản, 20 mồi giun.
2. Vào sảnh → chọn Hồ Sen miễn phí → xác nhận trang bị và mồi.
3. Thả câu → chờ phao → giật cần đúng lúc → kéo/nhả theo độ căng.
4. Bắt được cá → server ghi catch, bộ sưu tập, XP và Gold trong một transaction; client hiển thị kết quả đã xác nhận.
5. Nhận nhiệm vụ ngày → mua mồi/nâng cấp cần → cải thiện kỷ lục cá nhân.

Cá bắt được tự động quy đổi thành Gold theo thưởng cấu hình, đồng thời lưu bộ sưu tập; không đồng thời tạo vật phẩm cá để bán thêm lần nữa. Giao diện ghi “Đã nhận” và không có nút nhận thưởng catch lần hai.

### Hồ đầu tiên

| Thuộc tính    | Thiết kế MVP                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ID / tên      | `ho-sen` / Hồ Sen                                                                                                             |
| Kiểu          | Hồ nước ngọt, một vị trí câu, phiên riêng                                                                                     |
| Mở khóa / phí | Cấp 1 / 0 Gold                                                                                                                |
| Nội dung      | 10 loài ở bảng bên dưới, bảng `location_fish` điều chỉnh trọng số                                                             |
| Hình ảnh      | Bờ cỏ, cầu gỗ, sen, đồi xa; nước có ripple, phao, bóng cá                                                                     |
| Âm thanh      | Nước và chim nhẹ; splash, bite, dây căng, bắt/thoát; được tắt hoàn toàn                                                       |
| Thời gian     | Giờ UTC server ánh xạ múi giờ Asia/Ho_Chi_Minh; bình minh/hoàng hôn tăng hệ số một số loài, không khóa loài bắt buộc theo giờ |

Tutorial nằm trong 3 lượt đầu: lượt đầu hướng dẫn từng thao tác, hook window rộng hơn và cá dễ; server vẫn quyết định cá và thưởng. Không đảm bảo cá hiếm hoặc tạo catch giả. Có thể xem lại hướng dẫn từ Cài đặt.

## 4. Máy trạng thái câu cá

Một người chơi có tối đa một phiên chưa kết thúc. Server lưu state, sequence, config version, thời hạn và dữ liệu cá bí mật. Đồng hồ client chỉ dùng hiển thị. Mọi mutation gửi `Idempotency-Key` và sequence; server xác nhận ownership, session, hạn, trang bị và chuyển trạng thái hợp lệ.

| State      | Bắt đầu / xử lý phía server                                                                                                              | Kết thúc                                                                              | Hình ảnh và âm thanh                                                                      | API/sự kiện                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `IDLE`     | Tạo phiên với trang bị hợp lệ, chưa tiêu mồi                                                                                             | `cast` hợp lệ → `CASTING`; hủy/hết hạn → `FINISHED`                                   | Nhân vật thả lỏng, chỉ dẫn Thả câu; ambient                                               | `POST /fishing/sessions`; `session_started`                                     |
| `CASTING`  | `cast` trừ 1 mồi đúng một lần, khóa loadout, snapshot cấu hình; server chọn cá/khối lượng và lịch bite bằng RNG an toàn; animation 700ms | Hết animation server → `WAITING`                                                      | Cần vung, dây bay, splash; âm quăng mồi                                                   | `POST .../cast`; `first_cast` một lần                                           |
| `WAITING`  | Giữ kết quả chọn cá bí mật, chờ khoảng 3–8s sau casting                                                                                  | Đến lịch → `BITE`; bỏ phiên → `FINISHED`                                              | Phao nhấp nhô, ripple; ambient                                                            | `GET .../:id` trả trạng thái công khai; không lộ fish ID/reward trước kết quả   |
| `BITE`     | Mở cửa sổ giật cần theo difficulty; không dùng timestamp client để gia hạn                                                               | Hook đúng cửa sổ → `HOOKING`; quá hạn → `ESCAPED`                                     | Phao chìm, nhãn “Cá cắn câu!”, rung tùy chọn, âm bite riêng                               | `POST .../hook`; server dùng thời điểm nhận request                             |
| `HOOKING`  | Server xác nhận hook một lần; khởi tạo stamina/tension; chuyển tiếp ngắn khoảng 0,25s                                                    | → `FIGHTING`                                                                          | Cần giật lên, splash lớn; âm hook                                                         | Response hook kèm state hiện tại                                                |
| `FIGHTING` | Server mô phỏng lực, stamina, tension và khoảng cách từ các thao tác hold/release                                                        | Stamina = 0 và đủ tiến độ → `REELING`; tension cao lâu hoặc cá kéo quá xa → `ESCAPED` | Cá vùng vẫy theo nhịp, cần cong, hai thanh rõ; âm dây tăng theo tension                   | `POST .../reel` nhận input, không nhận kết quả                                  |
| `REELING`  | Giai đoạn kéo lên bờ 1–2s; vẫn xử lý tension, không thể skip bằng client                                                                 | Khoảng cách về 0 → `CAUGHT`; đứt dây → `ESCAPED`                                      | Cá tới gần bờ, nước bắn; âm quay máy                                                      | `POST .../reel`; `complete` chỉ yêu cầu server đối soát                         |
| `CAUGHT`   | Trạng thái terminal gameplay: ghi catch + ledger + XP + collection + mission progress nguyên tử, uniqueness theo session                 | Commit thành công → `FINISHED`; nếu DB lỗi giữ nguyên để retry an toàn                | Thẻ cá chỉ xuất hiện sau xác nhận commit, hiệu ứng có thể giảm chuyển động; âm thành công | `POST .../complete` có thể trả lại kết quả đã lưu; `fish_caught`, `first_catch` |
| `ESCAPED`  | Lưu reason: `MISSED_HOOK`, `LINE_BROKE`, `FISH_TOO_FAR`, `ABANDONED`; không cộng XP/Gold                                                 | Ghi kết quả một lần → `FINISHED`                                                      | Cá quẫy đi, thông báo nguyên nhân; âm thất bại nhẹ                                        | Server hoàn tất; `complete` không biến thất bại thành thành công                |
| `FINISHED` | Chỉ đọc kết quả đã lưu; không thể cast lại cùng session                                                                                  | Tạo session mới để quay lại `IDLE`                                                    | CTA “Câu tiếp”, kết quả đã xác nhận                                                       | `GET .../:id`; retry bất kỳ action không phát thưởng thêm                       |

`CAUGHT`, `ESCAPED`, `HOOKING` có thể là các bước ngắn trong cùng lần xử lý server; response được phép đã ở state tiếp theo. Event/outbox giữ lịch sử chuyển trạng thái, không yêu cầu UI phải render từng state. Server tự hoàn tất khi đủ điều kiện; đóng tab hoặc không gọi `complete` không được làm mất catch đã commit. Phiên hết hạn xử lý cả khi read/action đến và bằng sweeper định kỳ; retry sweeper không được cộng thưởng hai lần.

### Kết nối và phản ứng

- MVP dùng REST; trong `WAITING` polling tối đa mỗi 500ms để nhận bite kịp thời, ngừng/backoff khi tab ẩn và không mở nhiều poll đồng thời. Chưa cần Socket.IO. Trong fight, response input trả snapshot để hạn chế poll thừa. Capacity test phải tính cả các poll này.
- Clock sync ước lượng độ lệch từ server time; hook window theo từng loài từ 1,4–2,4s cộng allowance mạng cố định 150ms. Phiên tutorial dùng ít nhất 3s cộng allowance. Chỉ khi đã vào `BITE`, DTO mới trả `hookDeadline`; không trả trước `biteAt`. Đây là số thử nghiệm, phải đo trên mạng mobile Việt Nam.
- Mất mạng: client ngừng dự đoán kết quả, hiện kết nối lại; server tự chuyển về nhả khi input hết hạn và xử lý timeout. Không pause vô hạn bằng cách mất mạng.
- Rate limit action theo user/session; một action mỗi 250ms, tối đa 4/giây, không thưởng cho spam. Nút hold hỗ trợ pointer/touch/Space; thả nút khi blur, pointercancel hoặc modal mở. Hold TTL server 350ms; inactivity 60s hoặc tổng thời hạn phiên 5 phút chuyển sang `ESCAPED/ABANDONED`. Engine nhận server clock đơn điệu, từ chối thời gian đi lùi.

## 5. Đấu cá do server tính

Mô phỏng bước 50ms, chỉ catch up đến `serverNow` khi nhận input/read; không khởi tạo một timer riêng liên tục cho từng người chơi. Giới hạn số bước xử lý và xử lý timeout trước khi catch up để tránh request sau treo tab gây CPU spike. Server tự tạo nhịp cá vùng vẫy từ seed không công khai.

Các đại lượng chuẩn hóa: tension `T` trong [0,100], stamina cá `S` trong [0,100], tiến độ kéo `P` trong [0,100]. Khởi đầu `T=15`, `P=15`, `S=100`. API input là `hold` hoặc `release`, hold có thời hạn tối đa 350ms cho mỗi mẫu để đứt kết nối không tạo hold vô hạn. Các công thức dưới đây đồng bộ với `packages/game-core/src/index.ts`; chúng là baseline triển khai để playtest, chưa là cân bằng đã chứng minh.

- Đặt `F = fish.pullStrength`, `R = rodPower`, `C = rodControl`, `dt=0,05s`. `surge = (1 + sin((tickAt−fightStartedAt) × 2π / surgePeriodMs + surgePhase)) / 2`; phase và period được server chọn bằng RNG khi cast, không gửi client.
- Khi `hold`: `T += (12 + 1,3F + 10surge − 1,1C) × dt`; `S -= max(2, 12 + 1,3R − 0,8F) × dt`; `P += max(1, B + 0,7R − 0,2F − 2surge) × dt`, với `B=7` ở `FIGHTING`, `B=16` ở `REELING`.
- Khi `release` hoặc hold hết TTL: `T -= (26 + 2C) × dt`; `S += 1 × dt` chỉ trong `FIGHTING`; `P -= (1 + 2surge) × dt`. Sau mỗi tick clamp `T/P/S` vào [0,100].
- Các công thức hiện hành làm cá thường có thể bắt bằng cần gỗ với chiến thuật giữ/nhả khi tension gần 70; test deterministic xác minh cả bốn loài Common bắt được dưới 45s. Đây là kiểm tra khả năng chơi được, không thay thế playtest độ khó với người thật.
- `T > 95` liên tục 0,8s → đứt dây. `P = 0` liên tục 6s sau grace 3s → cá thoát. Giới hạn fight 45s để không giữ phiên vô hạn.
- `S = 0` và `P >= 80` → `REELING`; server hoàn thành khi `P = 100`. Không chấp nhận `progress`, `fishId`, `weight`, `XP`, `Gold` từ client.
- Trong `REELING`, stamina giữ0; khi HOLD tiến độ tăng12 điểm/giây thay công thức FIGHTING, còn tension và RELEASE giữ quy tắc trên. TừP80 đến100 cần khoảng1,7s kéo liên tục nếu an toàn; nhả sẽ kéo dài, giới hạn thời gian fight vẫn áp dụng. Đây là baseline để animation1–2s và simulation cùng nghĩa, không cho client skip.

Mục tiêu thử nghiệm: người mới hoàn thành tutorial đạt catch rate 65–80% với cá thường; cá hiếm 25–45% sau khi đã hiểu cơ chế. Không khẳng định đạt các mức này trước playtest. Các hệ số rodPower/control/resistance cần chuẩn hóa chung trong cấu hình versioned; không hardcode rải rác trong scene.

## 6. Danh mục 10 loài cá

Đơn vị trọng lượng kg; Gold/XP là base cho một catch bằng base weight. Rarity là phân loại trong game, không là nhận định sinh học hoặc mức độ bảo tồn. `imageKey` là khóa asset cần sản xuất/cấp phép, chưa có ảnh thật trong lần bàn giao Discovery. Mỗi mô tả là copy gameplay cần rà soát trước phát hành.

| ID / tên / imageKey                                   | Mô tả ngắn / môi trường                          | Rarity / trọng số nền | Min / base / max kg | Gold / XP | Mồi ưa thích | Difficulty 1–100 |
| ----------------------------------------------------- | ------------------------------------------------ | --------------------- | ------------------- | --------- | ------------ | ---------------- |
| `carp` / Cá chép / `fish/carp`                        | Cá thân vàng, thích kiếm ăn gần bờ; hồ nước ngọt | Common / 10           | 0,3 / 1,2 / 4,0     | 15 / 12   | Ngô, giun    | 22               |
| `grass-carp` / Cá trắm / `fish/grass-carp`            | Thân dài, kéo khỏe; hồ có thực vật               | Uncommon / 14         | 0,8 / 2,5 / 8,0     | 28 / 18   | Ngô, cỏ      | 38               |
| `tilapia` / Cá rô phi / `fish/tilapia`                | Loài nhập môn dễ gặp; vùng nước nông             | Common / 24           | 0,15 / 0,6 / 2,0    | 10 / 10   | Giun, cám    | 15               |
| `snakehead` / Cá lóc / `fish/snakehead`               | Phản ứng mạnh khi mắc câu; ven cỏ nước ngọt      | Rare / 8              | 0,4 / 1,6 / 5,0     | 45 / 28   | Cá nhỏ, giun | 52               |
| `walking-catfish` / Cá trê / `fish/walking-catfish`   | Cá da trơn gần đáy; hồ bùn                       | Uncommon / 11         | 0,3 / 1,4 / 4,5     | 25 / 17   | Giun, cá nhỏ | 32               |
| `pangasius` / Cá tra / `fish/pangasius`               | Cá lớn có sức kéo bền; vùng nước sâu             | Epic / 5              | 1,0 / 4,0 / 12,0    | 80 / 45   | Cám, giun    | 72               |
| `silver-carp` / Cá mè / `fish/silver-carp`            | Bơi tầng giữa, cần lực kéo đều; hồ rộng          | Rare / 5              | 0,6 / 2,0 / 7,0     | 40 / 25   | Cám, ngô     | 48               |
| `climbing-perch` / Cá rô / `fish/climbing-perch`      | Nhỏ và linh hoạt; ven sen, cỏ                    | Common / 12           | 0,08 / 0,25 / 0,8   | 8 / 8     | Giun         | 18               |
| `giant-gourami` / Cá tai tượng / `fish/giant-gourami` | Mục tiêu sưu tập khó gặp; vùng nước yên          | Legendary / 2         | 0,5 / 2,0 / 6,0     | 120 / 65  | Cỏ, giun     | 85               |
| `red-tilapia` / Cá diêu hồng / `fish/red-tilapia`     | Màu sáng dễ nhận biết; vùng nước ấm              | Common / 9            | 0,2 / 0,8 / 2,5     | 12 / 11   | Cám, giun    | 20               |

Tổng trọng số nền 100 tương ứng 55/25/13/5/2 theo rarity **chỉ khi mọi hệ số bằng 1**. Thêm loài bằng dữ liệu, association hồ và asset key; không thêm nhánh if/else theo tên loài.

Các chỉ số hành vi bổ sung dưới đây cũng là giả thuyết cấu hình, không suy ra từ dữ liệu sinh học. `pullStrength` 1–10 ánh xạ sang `fishResistance` trong simulation; `surgePeriodSeconds` tạo nhịp vùng vẫy có báo trước; hook window là thời gian server chấp nhận giật cần trước allowance mạng tối đa 150ms.

| Loài ID           | pullStrength | Hook window giây | surgePeriodSeconds |
| ----------------- | ------------ | ---------------- | ------------------ |
| `carp`            | 3            | 2,2              | 3,0–4,5            |
| `grass-carp`      | 5            | 2,0              | 2,5–4,0            |
| `tilapia`         | 2            | 2,4              | 3,5–5,0            |
| `snakehead`       | 6            | 1,8              | 1,8–3,0            |
| `walking-catfish` | 4            | 2,2              | 3,0–4,0            |
| `pangasius`       | 8            | 1,6              | 2,0–3,5            |
| `silver-carp`     | 6            | 1,9              | 2,5–4,0            |
| `climbing-perch`  | 2            | 2,3              | 2,0–3,0            |
| `giant-gourami`   | 9            | 1,4              | 1,5–2,5            |
| `red-tilapia`     | 3            | 2,3              | 3,0–4,5            |

Không áp dụng cửa sổ ngắn dưới 1,4s trong MVP. Nếu p95 latency của nhóm mobile khiến cá khó gần như không hook được, mở rộng window hoặc đổi cách chuyển bite trước khi tăng difficulty; không dùng thống kê gộp desktop để bỏ qua nhóm này.

### Chọn cá và khối lượng

1. Lọc loài đang bật và thuộc hồ, điều kiện cấp/hồ hợp lệ; starter worm luôn có pool hợp lệ.
2. Tính `w_i = locationWeight_i × rarityMultiplier_i × baitAffinity_i × timeFactor_i × gearSuitability_i × levelFactor_i` từ phiên bản config đã snapshot. Mọi hệ số có giới hạn/range validation; ví dụ bait phù hợp 1,4, không phù hợp 0,8; time 0,8–1,2; gear/level 0,9–1,1, tránh một nâng cấp tăng rarity đột ngột.
3. Chuẩn hóa `p_i = w_i / sum(w)` sau lọc. Nếu tổng bằng 0 từ cấu hình sai: chặn publish config và cảnh báo; không fallback bí mật sang loài khác sau khi đã tiêu mồi.
4. Server lấy mẫu RNG an toàn; trọng lượng dùng phân phối triangular min/base/max, ưu tiên cá quanh base hơn là uniform làm cá lớn xuất hiện quá nhiều. Lưu gram integer để tính toán, không dùng float làm tiền.
5. Không lộ seed, loài, trọng lượng hoặc thưởng tương lai cho client. Config publish mới chỉ áp dụng session mới. Admin preview xác suất hữu hiệu với từng loadout trước publish.

Các thời điểm/level chỉ điều chỉnh nhẹ và không ngăn người mới hoàn thành nhiệm vụ ngày. MVP không có pity system; nếu thêm phải version và công bố tác động phù hợp.

### 6b. Điểm câu theo địa hình (mở rộng 07/11/2026)

Nguồn sự thật là `packages/game-config` (bảng dưới tóm tắt). Mỗi loài có tên khoa học, loại nước chịu được và nơi sống thật; schema từ chối pool điểm câu chứa loài không sống được ở loại nước của điểm đó (hồ/sông/suối/rừng sâu = ngọt, cửa sông = lợ, ghềnh biển = mặn). Ảnh chụp thật và ghi công: [ASSETS](ASSETS.md).

| Điểm câu         | Địa hình / nước | Cấp / phí | Loài                                                                     | Hàng địa phương                                                 |
| ---------------- | --------------- | --------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Hồ Sen           | Hồ / ngọt       | 1 / 0     | 10 loài ban đầu                                                          | — (tiệm tổng hợp)                                               |
| Bến Sông Đào     | Sông / ngọt     | 2 / 5     | bống cát, chép, trắm, mè, chày, ngạnh, tra, lăng nha, cá hô              | ốc bươu, cá mồi, cần sông dài, dây fluorocarbon, lưỡi tròn      |
| Suối Đá Mây      | Suối / ngọt     | 3 / 10    | mương, chạch bùn, rô, ngựa xám, bỗng, chiên, ngựa nam                    | dế mèn, cần suối ngắn, dây fluorocarbon, lưỡi tròn              |
| Đầm Rừng Sâu     | Rừng sâu / ngọt | 4 / 15    | sặc rằn, rô, trê, lóc, thát lát, còm, tai tượng, lóc bông                | dế mèn, cá mồi, cần lóc rừng                                    |
| Cửa Sông Nước Lợ | Nước lợ         | 5 / 20    | kèo, rô phi, đối mục, nâu, chẽm, mú chấm cam, hồng bạc                   | ốc bươu, tôm sống, dây dù bện, lưỡi tròn                        |
| Ghềnh Biển Gió   | Bờ biển / mặn   | 6 / 25    | đục, nục, đối mục, thu, chim vây vàng, nhồng, chẽm, mú chấm cam, mú nghệ | tôm sống, mực cắt khúc, cần ném biển, dây dù bện, lưỡi chống gỉ |

Chỉ số dây và lưỡi cộng vào cần thành chỉ số cả bộ. Tiệm thu mua lại mồi/trang bị theo `sellPriceGold` (luôn < giá mua mỗi đơn vị; không thu mua giun starter). Mọi giá, phí và tỷ lệ là giả thuyết cân bằng cần đo theo cohort.

## 7. Trang bị, mồi và kinh tế Gold

### Loadout baseline

| Vật phẩm                       | Cấp mở / giá Gold        | Tác dụng / giới hạn                                                             |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------- |
| Cần gỗ                         | 1 / cấp miễn phí một lần | power 4, control 3; không bán/loại bỏ starter khiến người chơi kẹt              |
| Cần tre                        | 2 / 180                  | power 6, control 5                                                              |
| Cần composite                  | 4 / 600                  | power 9, control 7; chưa cần thêm nhiều tier MVP                                |
| Dây nylon cơ bản / lưỡi cơ bản | 1 / cấp cùng starter     | Tham gia kiểm tra loadout; chưa có durability, repair hoặc hàng chục biến thể   |
| Giun 10 con                    | 1 / 30                   | 1 con/lần cast hợp lệ; phù hợp nhiều loài                                       |
| Ngô 10 phần                    | 2 / 40                   | Tăng affinity chép/trắm/mè; không đảm bảo bắt cá                                |
| Cám 10 phần                    | 2 / 40                   | Tăng affinity rô phi/diêu hồng/mè/tra                                           |
| Nâng cấp cần đang sở hữu +1    | 2 / 100, tối đa +2       | +1 power/control mỗi cấp; +2 giá 250; server kiểm tra cap và trừ Gold nguyên tử |

Không xóa cần/dây/lưỡi khi đứt dây trong MVP; thất bại mất mồi đã dùng. Bỏ durability giảm gánh cân bằng và tránh người mới phá sản; đây là lựa chọn phạm vi có thể mở lại sau beta.

### Công thức và ledger

**Cập nhật 07/11/2026:** công thức `rewardGold` dưới đây là Gold cơ sở của engine. Với phiên mới, giá đổi cá = `min(100, max(1, floor(rewardGold × 10%)))`, snapshot policy lúc bắt đầu phiên và lưu giá lúc catch. Cá vào giỏ trong Túi đồ, XP/collection/mission ghi nhận ngay; người chơi xác nhận đổi mới nhận Gold. Tổng đổi cá tối đa 100 Gold/ngày, reset 00:00 Việt Nam; không đổi một phần hoặc mất cá khi hết hạn mức. Cá chưa đổi không hết hạn; đổi không giảm collection/kỷ lục. Phiên cũ thiếu policy giữ thưởng tự động; catch đã nhận Gold không đổi thêm. Các bảng Gold, tốc độ và ví dụ dự báo cũ bên dưới mô tả baseline trước giảm, không phải thu nhập thực sau thay đổi. Starter, giá shop và nhiệm vụ ngày giữ nguyên; cần playtest kiểm tỷ lệ hết mồi và tốc độ nâng cấp với mức mới.

- `rewardGold = max(1, floor(baseReward × clamp(weightGram / baseWeightGram, 0.5, 2.0)))`.
- `rewardXP = max(1, floor(baseXP × clamp(weightGram / baseWeightGram, 0.75, 1.5)))`.
- `level = 1 + floor(sqrt(totalXP / 100))`; đạt level `L` cần tổng XP `100 × (L−1)^2`: L2=100, L3=400, L4=900, L5=1600. Dùng integer sqrt hoặc so sánh ngưỡng an toàn server.
- Cấp đầu tăng nhanh, cấp sau chậm dần; không tự trao Gold mỗi lần render level. MVP level-up mở trang bị/mồi và danh hiệu; nếu thêm thưởng Gold phải có unique entitlement.
- Mọi phát sinh/tiêu Gold qua ledger append-only cùng cập nhật balance trong transaction; không cho âm. `fishingSessionId`, `orderId`, `missionOccurrenceId` là nguồn đối soát và chống nhân đôi.

| Nhóm cấp | Mục tiêu tiến trình            | Nguồn Gold                         | Gold sink                               | Tốc độ giả định cần đo                                   |
| -------- | ------------------------------ | ---------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| 1        | Hiểu hook/nhả, bắt 3–8 cá      | Starter một lần + cá thường        | Mồi; chưa ép mua cần                    | L2 sau khoảng 7–12 catch nhỏ/thường                      |
| 2–3      | Đổi mồi, mua cần tre, 5–7 loài | Catch + daily                      | Mồi 3–4 Gold/lượt, cần 180, nâng +1 100 | Mục tiêu mua đầu sau 1–3 buổi 5–10 phút                  |
| 4–5      | Sưu tập cá khó, kỷ lục cá nhân | Catch có trọng số và daily cố định | Cần 600, nâng +2 250                    | Cần kiểm chứng tránh Gold tăng vô hạn hoặc grind ép buộc |

Ví dụ kiểm tra, không phải dự báo: catch rate 70%, trung bình 18 Gold/catch → 12,6 Gold/lượt trước chi phí, trừ giun 3 còn 9,6 Gold/lượt; 10 lượt tạo khoảng 96 Gold chưa kể daily. Nếu đo thấy sink quá thấp, điều chỉnh giá/tốc độ nội dung qua config, không tịch thu số dư đang có. Không tạo phí sửa chữa bí mật.

### Ba nhiệm vụ ngày

Ngày gameplay dùng Asia/Ho_Chi_Minh; lưu occurrence bằng ngày tương ứng và timestamps UTC. Không reset theo đồng hồ thiết bị.

| ID                 | Điều kiện server ghi nhận           | Gold / XP | Tiêu chí chống lặp                                    |
| ------------------ | ----------------------------------- | --------- | ----------------------------------------------------- |
| `daily-catch-3`    | 3 catch thành công trong ngày       | 40 / 20   | Unique user + mission + date; không tính action retry |
| `daily-species-2`  | 2 loài khác nhau trong ngày         | 35 / 20   | Distinct species từ catch đã commit                   |
| `daily-weight-5kg` | Tổng khối lượng catch ngày ≥ 5.000g | 45 / 25   | Cộng từ catch server, không nhận số kg từ client      |

Claim nhiệm vụ có thao tác chủ động để tạo khoảnh khắc hoàn thành, nhưng phải idempotent và nguyên tử. Nhiệm vụ đã hoàn thành trước 00:00 mà chưa claim có grace đến 12:00 ngày sau; progress không tăng sau hết ngày. Mục tiêu tổng 120 Gold/ngày không là nguồn chính vô hạn. Có cứu trợ5 giun khi không còn mồi sử dụng được và Gold<30, tối đa một lần/ngày, UserGrant+inventory nguyên tử; không tạo ledger Gold delta0. Cần đánh giá abuse nhiều tài khoản. Không triển khai quảng cáo để mở khóa mồi trong MVP.

## 8. Phản hồi, nội dung và khả năng tiếp cận

- Không dùng màu duy nhất để báo nguy hiểm: thanh căng có nhãn “An toàn / Căng / Sắp đứt”, icon và âm tùy chọn. Chế độ giảm chuyển động bỏ screen shake, vẫn giữ tín hiệu hook.
- Không autoplay âm trước tương tác; ambient/sfx có mức âm riêng, mặc định vừa phải, lưu tùy chọn. Cảnh không nhấp nháy nhanh; vibration là tùy chọn có fallback.
- Assets MVP: 1 nền 3 lớp, 1 nhân vật 5 động tác, 10 fish thumbnails + vài animation silhouette dùng chung, 3 cần và 3 bait icons, 6 SFX, 1 ambient loop. Lưu license/nguồn của từng asset; không lấy asset game đối thủ.
- Phaser giới hạn hiệu ứng và DPR theo thiết bị; giảm particle và pixel ratio trước khi giảm logic simulation. UI loading/error phải phân biệt đang tải asset, offline và phiên hết hạn.

## 9. Tiêu chí nghiệm thu thiết kế khi triển khai

1. Chạy trọn vòng đăng nhập → cast → hook → fight → catch/escape → câu tiếp ở mobile và desktop; không có state kẹt.
2. Mỗi cast tiêu đúng 1 mồi; duplicate/retry/concurrent request không tiêu thêm hoặc phát thưởng lặp.
3. Client sửa fish/reward/weight hoặc gọi complete sớm không tạo catch; một active session/player kể cả nhiều tab.
4. 10 loài có dữ liệu/asset hợp lệ và xuất hiện đúng pool; Monte Carlo trên server trong khoảng sai số thống kê đã nêu ở Test Plan, không dùng thống kê ngẫu nhiên flaky làm CI blocker.
5. Tắt âm/giảm chuyển động/keyboard hoạt động; khi offline có khôi phục kết quả đã commit.
6. Thử nghiệm ít nhất 10 người mới trên mobile trước chốt balance; ghi completion, catch rate, thời gian và 3 nguyên nhân thất bại phổ biến.

## 10. Nội dung chưa triển khai

Hồ mới, biển/sông, di chuyển, giải đấu, chat, guild, pet, kỹ năng chủ động, durability, event theo mùa, VIP và cosmetic shop tiền thật nằm backlog sau MVP. Không mở thanh toán hoặc premium currency trước rà soát pháp lý và mô hình vận hành.
