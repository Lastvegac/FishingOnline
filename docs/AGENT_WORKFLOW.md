# Quy trình phối hợp agent và người chịu trách nhiệm

07/11/2026 · Một chủ sản phẩm nghiệm thu, một owner kiến trúc tích hợp. Agent hỗ trợ công việc theo phạm vi; không tự thay product scope, stack hoặc deploy. Không đếm output AI là feature hoàn thành khi chưa check.

| Vai trò     | Input                             | Output / phạm vi                               | Giới hạn và tiêu chí xong                                                  |
| ----------- | --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Product     | Master prompt, phỏng vấn, KPI     | PRD, backlog, acceptance, quyết định           | Không tự coi giả định là nhu cầu đã chứng minh; story có AC và owner       |
| Architect   | PRD/GDD, constraint chi phí       | ADR, module/package boundaries, system diagram | Không đổi stack/microservices tùy ý; data flow/trust boundary rõ           |
| Game Design | Persona, playtest/economy         | State table, fish/gear data, balance version   | Không để client chọn rewards; số liệu cần gắn giả thuyết/measurement       |
| Frontend    | API/UI_UX, shared exports         | React screen/UI states, Query/Zustand          | Dùng shared components/tokens, không frame logic; responsive đã check      |
| Phaser      | GDD/contracts/assets              | Scenes/input/render/audio                      | Không author rewards; cleanup event/timer khi unmount; loop/device check   |
| Backend     | Contracts/security/GDD            | Fastify module/service/routes                  | Validation/ownership/transaction, module docs và tests pass                |
| Database    | Domain invariants/access patterns | Schema, SQL migration/seed/index               | Không sửa ledger lịch sử; clean DB migration + race/restore evidence       |
| Security    | Threat model/changed diff         | Findings và abuse verification                 | Không chỉ checklist; báo severity và case tái lập, risk owner chấp thuận   |
| QA          | AC/test plan/build                | Unit/integration/E2E/device/load evidence      | Không mock transaction để chứng minh DB correctness; lỗi có repro          |
| DevOps      | Release artifact/env/runbooks     | CI/staging/backup/observability                | Không tự production; deployment gate/manual review và restore drill        |
| Marketing   | Vision/metrics/legal budget       | Nội dung, attribution, cohort report           | Không tự gửi email/đăng cộng đồng/quảng cáo; không hứa1.000 user/doanh thu |

## Cách giao task

Mỗi task mô tả mục tiêu, file/module sở hữu, input/output, invariant không đổi, acceptance và lệnh kiểm tra kèm thư mục. Nhiều agent không cùng sửa một file; khi cần đổi contract, owner cập nhật trước rồi báo downstream. Agent phải biết có người khác cùng codebase và không revert thay đổi ngoài phạm vi.

Luồng: Product → Architect/Game Design → Backend/DB và Frontend/Phaser theo contract → QA → Security → DevOps staging → Product nghiệm thu. Dependency được check theo thứ tự, không dùng chạy song song để bỏ qua contract/approval.

Mỗi lần sửa code báo file tạo/sửa, lý do, check đã chạy/kết quả, giới hạn chưa kiểm. Module README hoặc docs có request/data flow, failure behavior, permissions và AC. Cập nhật README/CHANGELOG/PROJECT_STATUS/TODO/API/DB khi liên quan.

## Thực hiện trong Discovery lần này

Owner tích hợp soạn PRD/backlog/roadmap/legal/risk/bản bàn giao. Ba phạm vi agent độc lập: GDD+UI_UX+TEST_PLAN; kiến trúc+database+API+security+deployment+schema design; competitor+monetization+marketing. Owner rà lại thuật ngữ, timing, nhiệm vụ và estimate giữa tài liệu. Chưa có agent nào viết application runtime hoặc deploy.

Khi triển khai, đọc skill phù hợp công việc; shared UI reuse bắt buộc, test-artifact-cleanup cho kiểm chứng tạm. Tài liệu workflow này không cài plugin/skill mới và không cấp quyền gửi tin nhắn ra ngoài.
