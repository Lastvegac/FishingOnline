# Nguồn đồ họa và âm thanh MVP

Ngày 07/11/2026. Không lấy artwork, âm thanh hoặc footage của game đối thủ.

| Nhóm                        | Cách tạo / vị trí source                                                 | Tình trạng                                                 |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Ảnh cá trên thẻ và chi tiết | Ảnh chụp thật qua `FishArt`, metadata ở `packages/ui/src/fish-photos.ts` | Cá khỏe, ảnh rõ, vây nguyên vẹn; nguồn và giấy phép đi kèm |
| Trang bị                    | Model Three.js qua `EquipmentArt`                                        | Repo-native, render cache/turntable                        |
| Cảnh gameplay và hồ         | Three.js procedural: nước/sen/cây/cần thủ/phao/cá bơi                    | Cá trong cảnh vẫn 3D                                       |
| Icon UI                     | lucide-react                                                             | ISC; giữ license/notice khi phân phối                      |
| Âm gameplay                 | Web Audio oscillators/noise do dự án sinh sau thao tác người dùng        | Có mute và browser autoplay policy                         |
| Font                        | Font stack hệ thống                                                      | Không tải font bên thứ ba                                  |

## Nhạc và âm thanh màn câu

`apps/web/src/game/FishingAudio.ts` sinh một đoạn nhạc ngũ cung stereo dài 32 giây bằng oscillator/envelope và echo rồi loop bằng audio clock; giai điệu được viết trong source, không dùng bản ghi hoặc nhạc bên thứ ba. Cùng context tạo gió/nước/mưa, nước bắn, tín hiệu cá đớp/kết quả và tiếng máy câu. Không tải asset âm thanh qua mạng. Context chỉ tạo sau thao tác thật, có mute/suspend khi ẩn tab và được đóng khi rời màn câu. Cần nghe thử trên loa/tai nghe và thiết bị thật trước khi chốt mức âm/cảm giác thư giãn.

## Chiến lợi phẩm trong simulator

Dialog kết quả lượt câu dùng `FishArt mode="model"` để xem cá 3D theo loài và chiều dài được server xác nhận. Các consumer ảnh chụp trong sổ cá/giỏ cá vẫn dùng mode mặc định; metadata và ghi công ảnh giữ nguyên.

## Ảnh chụp cá thật đẹp và khỏe — lựa chọn đã chốt

Người dùng yêu cầu ảnh cá thật cho thẻ/chi tiết cá. `FishArt` dùng ảnh chụp cho cả 37 loài trong sổ cá, giỏ cá và kết quả câu; không thay bằng model 3D hoặc ảnh sinh bằng AI. Ưu tiên ảnh cá đang sống, thân sạch, vây rõ/nguyên vẹn, màu tự nhiên; loại ảnh cá trên sàn/chợ hoặc mẫu vật trông trầy xước. Cá diêu hồng đã thay bằng ảnh thân sáng và vây xòe rõ, chụp ngoài trời.

Thẻ và chi tiết dùng `object-fit: contain` để tránh cắt cụt thân/vây/đuôi. Cả loài đã bắt và chưa khám phá đều hiển thị ảnh đủ màu, độ sáng bình thường; trạng thái khám phá thể hiện bằng nhãn và số lần bắt, không làm mờ ảnh. Prop `live` giữ tương thích ở caller nhưng hiển thị ảnh lớn kèm ghi công/link nguồn bên dưới; không khởi tạo WebGL. Sổ cá, giỏ cá, kết quả câu và cá chia sẻ tại hồ luôn dùng ảnh chụp, kể cả khi có chiều dài/kỷ lục. Ảnh thiếu/tải lỗi dùng `EmptyState` Việt–Anh. Cảnh gameplay và trang bị vẫn dùng Three.js.

Mọi consumer ảnh cá dùng chung tỷ lệ khung responsive 3:2 (thumbnail bảng admin 13:9), ảnh không vượt khung hoặc bị kéo méo; bo góc cả khung và ảnh bằng token `--radius-sm`. Chi tiết có hàng riêng cho nguồn ảnh. Nghiệm thu thêm: admin/list/editor và thẻ/chi tiết/kết quả/chat/preview ở 320px, 390px và desktop; 37 ảnh thư viện giữ đúng tỷ lệ gốc, ảnh upload/HTTPS cùng quy tắc, thông báo ảnh thiếu/lỗi đọc được trong thumbnail.

Tiêu chí nghiệm thu: đủ 37 ảnh thật, nguồn/giấy phép tương ứng; cá chưa khám phá có ảnh rõ như cá đã bắt; chi tiết có số đo vẫn dùng ảnh; nhóm ảnh thay mới ở `/fish/live/` hiển thị đúng; ảnh cá diêu hồng cũ không còn được tải; grid/detail và ảnh lỗi không tràn ngang ở desktop/mobile. Chọn ảnh dựa trên rà soát trực quan, không dùng ảnh trầy loang hoặc vây hỏng để đại diện loài.

## 16 ảnh thay mới và giấy phép

Ảnh được tải về origin, thu nhỏ tối đa 1280px, chuyển JPEG progressive và bỏ metadata máy ảnh. Không tái tạo hình cá bằng AI hoặc tô xóa các vết trên thân. Ảnh cá chiên được cắt riêng ảnh cá đang sống ở phần dưới ảnh ghép (giữ watermark); ảnh cá đục cắt bớt đáy cát xung quanh, giữ trọn cá. Các phép crop/resize là bản chuyển thể; file CC BY-SA tiếp tục phân phối dưới cùng giấy phép. Các ảnh iNaturalist giữ link đến trang ảnh có tác giả/giấy phép. 21 ảnh còn lại giữ nguồn ban đầu; metadata đang sử dụng đầy đủ ở `fish-photos.ts`.

| Slug / file trong `/fish/live/` | Tác giả                    | Giấy phép                                                       | Nguồn                                                                                          |
| ------------------------------- | -------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `grass-carp.jpg`                | Damien                     | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0)  | [Nguồn](<https://commons.wikimedia.org/wiki/File:Limoges_aquarium_201708_5_(42047139015).jpg>) |
| `climbing-perch.jpg`            | Abu Hamas                  | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://commons.wikimedia.org/wiki/File:Anabas_testudineus_52464852.jpg)               |
| `snakeskin-gourami.jpg`         | BEDO (Thailand)]           | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://commons.wikimedia.org/wiki/File:Trichopodus_pectoralis.jpg)                    |
| `grouper.jpg`                   | タウナギ                   | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [Nguồn](https://commons.wikimedia.org/wiki/File:Epinephelus_coioides_Uotto.jpg)                |
| `snakehead.jpg`                 | BEDO (Thailand)            | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://commons.wikimedia.org/wiki/File:Channa_striata.jpg)                            |
| `hampala.jpg`                   | Ong Jyh Seng               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://www.inaturalist.org/photos/293461062)                                          |
| `mudskipper-goby.jpg`           | Dmitry Ivanov              | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)        | [Nguồn](https://www.inaturalist.org/photos/586010879)                                          |
| `round-scad.jpg`                | Nicola Crockford           | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)        | [Nguồn](https://www.inaturalist.org/photos/574361195)                                          |
| `spanish-mackerel.jpg`          | Ewout Knoester             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://www.inaturalist.org/photos/116778763)                                          |
| `stream-minnow.jpg`             | Yung-Lun Lin               | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)        | [Nguồn](https://www.inaturalist.org/photos/586203254)                                          |
| `mahseer.jpg`                   | Ong Jyh Seng               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://www.inaturalist.org/photos/270432003)                                          |
| `red-tilapia.jpg`               | agriculturasp              | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)       | [Nguồn](https://www.flickr.com/photos/39272011@N07/6022028960/)                                |
| `bagarius.jpg`                  | Beta Mahatvaraj            | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)  | [Nguồn](https://commons.wikimedia.org/wiki/File:Bagarius_bagarius.jpg)                         |
| `mangrove-snapper.jpg`          | Jan Ebr &amp; Ivana Ebrová | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)        | [Nguồn](https://www.inaturalist.org/photos/260893707)                                          |
| `sillago.jpg`                   | Shaunak Modi               | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0)        | [Nguồn](https://www.inaturalist.org/photos/16963694)                                           |
| `stream-loach.jpg`              | no rights reserved         | [CC0](https://creativecommons.org/publicdomain/zero/1.0)        | [Nguồn](https://www.inaturalist.org/photos/275164970)                                          |

Ảnh cá chiên có tên nguồn `Bagarius bagarius`; truy vấn iNaturalist theo `Bagarius yarrelli` trả về tên này. Không thay dữ liệu loài hoặc luật game trong lần sửa ảnh.

## Hồ sơ ảnh ban đầu — giữ nguồn và giấy phép file cũ

Các file JPEG ban đầu ở `apps/web/public/fish/<slug>.jpg` được giữ cùng hồ sơ ghi công sau. 16 file đã được thay trong UI không bị gọi lại bởi `FishArt`; các file khác vẫn sử dụng theo metadata hiện hành.

| Slug                | Tác giả                                | Giấy phép     | Nguồn                                                                                                                                                 |
| ------------------- | -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `carp`              | George Chernilevsky                    | CC BY-SA 3.0  | [Commons](<https://commons.wikimedia.org/wiki/File:Cyprinus_carpio_2008_G1_(cropped).jpg>)                                                            |
| `grass-carp`        | Dezidor                                | CC BY 3.0     | [Commons](https://commons.wikimedia.org/wiki/File:2x_amur_b%C3%ADl%C3%BD.jpg)                                                                         |
| `tilapia`           | Germano Roberto Schüür                 | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Til%C3%A1pia_ou_Sarotherodon_niloticus_2.jpg)                                                       |
| `snakehead`         | Wie146                                 | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Gabus_070909_0074_rwg.jpg)                                                                          |
| `walking-catfish`   | Mistvan                                | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Clarias_batrachus-ZOO.Brno.jpg)                                                                     |
| `pangasius`         | User:Melanochromis                     | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Iridescent_shark.jpg)                                                                               |
| `silver-carp`       | USFWS Mountain-Prairie                 | Public domain | [Commons](<https://commons.wikimedia.org/wiki/File:Silver_Carp_Adult_(Hypophthalmichthys_molitrix).jpg>)                                              |
| `climbing-perch`    | Nayan j Nath                           | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Anabas_testudineus_climbing_perch.jpg)                                                              |
| `giant-gourami`     | George Chernilevsky                    | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Osphronemus_goramy_2008_G1.jpg)                                                                     |
| `red-tilapia`       | Takeaway                               | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Pla_thapthim.jpg)                                                                                   |
| `river-goby`        | Wibowo Djatmiko (Wie146)               | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Glossogo_giur_160312-57258_rwg.JPG)                                                                 |
| `chub`              | Gaeho77                                | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Squaliobarbus_curriculus,_Seocheon.jpg)                                                             |
| `bagrid-catfish`    | Catxx                                  | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Cranoglanis_bouderius.jpg)                                                                          |
| `hemibagrus`        | FloUdon                                | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Redtail-Catfish.jpg)                                                                                |
| `giant-barb`        | User:Lerdsuwa                          | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Giant_Barb.jpg)                                                                                     |
| `stream-minnow`     | Tiouraren (Y.-C. Tsai)                 | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Hemiculter_leucisculus_Taijiang_National_Park.jpg)                                                  |
| `stream-loach`      | Không rõ tác giả                       | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Misgurnus_anguillicaudatus.jpg)                                                                     |
| `hampala`           | Wibowo Djatmiko (Wie146)               | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Hampal_macrol_111013-18311_mtp.JPG)                                                                 |
| `spinibarbus`       | Cool critter channel                   | CC BY 4.0     | [Commons](https://commons.wikimedia.org/wiki/File:Phoenix_barb.jpg)                                                                                   |
| `bagarius`          | Hamid Badar Osmany                     | CC BY 3.0     | [Commons](https://commons.wikimedia.org/wiki/File:Bagarius_bagarius_Pakistan_1.jpg)                                                                   |
| `mahseer`           | Bernard DUPONT from FRANCE             | CC BY-SA 2.0  | [Commons](<https://commons.wikimedia.org/wiki/File:Thai_Mahseer_(Tor_tambroides)_(8683085589).jpg>)                                                   |
| `snakeskin-gourami` | Bochr                                  | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Snakeskin_gourami.jpg)                                                                              |
| `featherback`       | Xufanc                                 | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Notopterus_notopterus46.JPG)                                                                        |
| `clown-featherback` | Parkourprincess                        | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Chitala_Ornata.jpg)                                                                                 |
| `giant-snakehead`   | George Chernilevsky                    | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Channa_micropeltes_2012_G1.jpg)                                                                     |
| `mudskipper-goby`   | Phương Huy                             | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:C%C3%A1_k%C3%A8o_Vi%E1%BB%87t_Nam_t%E1%BA%A1i_BHX_1.jpg)                                            |
| `mullet`            | Diego Delso                            | CC BY-SA 4.0  | [Commons](<https://commons.wikimedia.org/wiki/File:M%C3%BAjol_(Mugil_cephalus),_Parque_natural_de_la_Arr%C3%A1bida,_Portugal,_2021-09-09,_DD_25.jpg>) |
| `spotted-scat`      | Fokko Toelstede, Wikipedia-User „Nyks“ | CC BY-SA 3.0  | [Commons](https://commons.wikimedia.org/wiki/File:Scatophagus_argus.jpg)                                                                              |
| `barramundi`        | Mitch Ames                             | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Lates_calcarifer,_2014-09-19a.jpg)                                                                  |
| `mangrove-snapper`  | Jean-Lou Justine                       | CC BY-SA 4.0  | [Commons](https://commons.wikimedia.org/wiki/File:Lutjanus_argentimaculatus_JNC2123_New_Caledonia.JPG)                                                |
| `sillago`           | Sahat Ratmuangkhwang                   | CC BY 3.0     | [Commons](https://commons.wikimedia.org/wiki/File:Sillago_sihama_Thailand.jpg)                                                                        |
| `round-scad`        | re_nebel                               | CC BY 4.0     | [Commons](https://commons.wikimedia.org/wiki/File:Decapterus_maruadsi.jpg)                                                                            |
| `spanish-mackerel`  | Rickard Zerpe                          | CC BY 2.0     | [Commons](<https://commons.wikimedia.org/wiki/File:Narrow-barred_spanish_mackerel_(Scomberomorus_commerson).jpg>)                                     |
| `pompano`           | David Burdick                          | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Trachinotus_blochii,_Guam.jpg)                                                                      |
| `barracuda`         | Diego Delso                            | CC BY-SA 4.0  | [Commons](<https://commons.wikimedia.org/wiki/File:Gran_barracuda_(Sphyraena_barracuda),_Yeda,_Arabia_Saudita,_2025-05-20,_DD_118.jpg>)               |
| `grouper`           | Sahat Ratmuangkhwang                   | CC BY 3.0     | [Commons](https://commons.wikimedia.org/wiki/File:Epinephelus_coioides_Thailand.jpg)                                                                  |
| `giant-grouper`     | Bernard DUPONT                         | CC BY-SA 2.0  | [Commons](<https://commons.wikimedia.org/wiki/File:Epinephelus_lanceolatus_(uShaka).jpg>)                                                             |

## Nhân vật Trung Hoa procedural

Người dùng chọn tiếp tục model dựng bằng code. `packages/ui/src/three/character.ts` tạo rig 14 bone, SkinnedMesh và các phần tóc/áo/quần/phụ kiện; `character-studio.ts` dùng courtyard 3D và `character-portraits.ts` render thumbnail/cache qua renderer chung. Không có ảnh avatar 2D thay cho nhân vật trong gameplay. Màu/material lấy semantic token; mesh rigid cùng parent/material được gộp, props/bone giữ transform riêng. Chưa có asset GLB, texture PBR, facial rig hoặc chứng minh hết clipping. Thông số/gate trực quan và giới hạn tại [CHARACTER_FASHION](CHARACTER_FASHION.md).
