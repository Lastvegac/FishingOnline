# Risk register

07/11/2026 · Xác suất/tác động: thấp/vừa/cao theo nhận định ban đầu, chưa dữ liệu thực nghiệm. Người phát triển chính chịu trách nhiệm kỹ thuật; chủ sản phẩm quyết định phạm vi/ngân sách/phát hành. Mỗi risk có trigger, việc giảm thiểu và gate rõ.

| ID  | Rủi ro                                  | Xác suất / tác động | Tín hiệu                                   | Giảm thiểu / phương án                                                                         | Owner              |
| --- | --------------------------------------- | ------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| R01 | Loop không vui/retention thấp           | Cao / cao           | 10 playtest không hiểu tension, D1<20%     | Prototype shapes sớm, quan sát thao tác, sửa onboarding trước paid                             | Product + Game     |
| R02 | Scope vượt 20h/tuần                     | Cao / cao           | Task trượt >30%, WIP>2                     | Vertical slice, backlog P2 riêng; giảm asset variants, không cắt integrity                     | Product            |
| R03 | Phân loại/thủ tục pháp lý sai           | Vừa / cao           | Chưa memo/hồ sơ, thay đổi social/payment   | Legal gate trước beta ngoài nhóm; xác minh nguồn hiện hành, dự toán riêng                      | Product + tư vấn   |
| R04 | Fake catch/Gold duplication             | Vừa / cao           | Ledger lệch, replay/race tăng              | Server authority, unique refs, locks, transaction, reconcile, tắt mutation khi invariant lỗi   | Backend + Security |
| R05 | Latency làm miss hook                   | Vừa / cao           | Mobile miss theo RTT, hook p95 cao         | Window theo species tối thiểu1,4s, poll2Hz, allowance server có cap; đo VN network             | Game + QA          |
| R06 | Canvas/asset nặng trên mobile           | Cao / vừa           | FPS<30, load>5s ở target                   | Atlas/lazy scene, frame budget, giảm particles; thiết bị thật trước final art                  | Phaser + QA        |
| R07 | Player hết mồi không chơi tiếp          | Vừa / vừa           | Không cast được/thoát shop                 | Starter20, giá mồi hợp lý, daily rescue5 có điều kiện/unique; đo farm                          | Game + Backend     |
| R08 | Cấu hình admin phá economy              | Vừa / cao           | Spawn sum0, surge reward, sai giá          | Zod bounds/cross-field, preview, draft/publish role, immutable snapshot, rollback version      | Admin + Product    |
| R09 | Mất dữ liệu/VPS đơn điểm                | Vừa / cao           | Backup lỗi, disk>70%, restore chậm         | Offsite + WAL, restore drill RPO/RTO; scale theo số đo                                         | DevOps             |
| R10 | Takeover/PII lộ                         | Vừa / cao           | Refresh reuse, token log, quyền dư         | Hash/MFA/CSRF/CSP/redact, access revocation, least privilege, privacy map                      | Security           |
| R11 | Asset vi phạm license                   | Vừa / cao           | Asset không rõ nguồn                       | Asset register, thuê ngoài có quyền thương mại; shapes thay thế tới khi đủ quyền               | Design + Product   |
| R12 | Bot/farm nhiệm vụ/rescue                | Cao / vừa           | Session cadence đồng đều, nhiều account/IP | Rate/user constraints, không thưởng referral Gold, dashboard behavior; không khóa cứng CGNAT   | Backend + Ops      |
| R13 | Monetization không bù chi phí           | Cao / cao           | LTV/CAC<1, conversion thấp                 | MVP không payments, mô hình giả định minh bạch, chi phí công dev tính riêng                    | Product + Business |
| R14 | Bỏ sót nghĩa vụ dữ liệu 2026            | Vừa / cao           | Chỉ dựa nguồn2024, không retention matrix  | Đối chiếu luật 2025/hướng dẫn hiện hành, data minimization và legal review                     | Product + Security |
| R15 | Schema hợp lệ nhưng transaction sai     | Vừa / cao           | Validate pass, concurrency test fail       | SQL partial/CHECK/trigger, PostgreSQL integration thật; không lấy Prisma validate thay DB test | Database + QA      |
| R16 | Không có thời gian vận hành sau release | Cao / cao           | Support/alert quá tải ngoài20h dev         | Beta cohort có cap, owner trực sự cố, budget support; chưa public nếu không có người xử lý     | Product            |

Review risk mỗi tuần và trước mọi gate. Đổi risk status phải ghi bằng chứng trong PROJECT_STATUS; không chuyển “closed” chỉ vì có giải pháp trên giấy.
