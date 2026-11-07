# Security design và threat model

Ngày: 07/11/2026. Checklist là điều kiện nghiệm thu; chưa khẳng định kiểm soát đã được triển khai.

Email/password là phạm vi nội bộ; beta có người chơi bên ngoài vẫn phải qua [LEGAL.md](LEGAL.md), không được mặc định miễn nghĩa vụ vì gọi là closed beta. Định danh, tuổi/người giám hộ, giới hạn thời gian chơi và retention cuối cùng phải dựa phân tích mô hình tương tác/pháp lý hiện hành trước thu dữ liệu thật.

## Trust boundaries

Browser/Phaser, payload admin và analytics đều không đáng tin. API là authority; Postgres lưu kết quả và ledger; Redis chỉ giới hạn/cache. Asset upload, email service, CI runner và Cloudflare là biên tích hợp riêng. Không đưa password, refresh token, session token, email đầy đủ hoặc gameplay random secret vào logs/analytics/frontend env.

## Threat matrix

| Nguy cơ                 | Kiểm soát thiết kế                                                                                                | Bằng chứng cần trước beta                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Fake catch/reward       | Client chỉ action; server state/time/random/config snapshot; ignore/reject fishId,weight,reward client            | Tamper payload không đổi reward; GET không lộ kết quả sớm                     |
| Replay action           | Key+requestHash+saved response, session version/CAS, unique catch/session                                         | Gửi cùng request 100 lần chỉ tiêu một mồi/cộng một reward                     |
| Duplicate mission claim | Unique user/mission/period, row lock và claimedAt cùng reward transaction                                         | 20 concurrent claims chỉ một ledger                                           |
| Fake inventory/equip    | Ownership + slot/level check, transaction; lock equip khi phiên active                                            | Equip inventory người khác/quantity 0 bị từ chối                              |
| Gold duplication/race   | Append-only ledger, unique business ref, balance≥0, locks, no client amount                                       | Concurrent purchases/catch/claim không âm/không lệch ledger                   |
| Speed hack/auto request | Server elapsed time, simulation tick 50ms, input spacing 250ms và hold TTL 350ms, total TTL, behavior metrics     | Tăng request rate không tăng simulation speed; client clock fake không có lợi |
| Brute force/enumeration | Argon2id, IP+account limits, generic errors/reset response, monitored lock policy                                 | Password/email không lọt log; rate 429 có backoff                             |
| Account takeover        | Refresh family rotation/hash/reuse revoke, short access TTL, session management, reset one-use; admin MFA/step-up | Replay refresh revokes family; reset revokes sessions; XSS/CSRF checks        |
| Admin escalation        | DB role check từng operation, deny-default, step-up publish/roles, last super admin protection, audit             | SUPPORT/ANALYST không sửa config/role; register không nhận role               |
| SQL injection/XSS       | Zod strict, Prisma parameterized query, không raw interpolated SQL, React escaping, CSP, no arbitrary HTML        | Payload injection và URL/avatar malicious không execute                       |
| Resource exhaustion     | Body size, pagination cap, rate limit, DB timeout, config bounds, API queue/backpressure                          | Load test + Redis outage fail policy đúng                                     |
| Insider ledger tamper   | Runtime DB role không UPDATE/DELETE ledger/audit; migration role tách biệt, backup độc lập                        | SQL attempts fail, reconcile catches/ledger/balance khớp                      |

## Auth, browser và secrets

- Hash password Argon2id; benchmark VPS để chọn memory/time cost (~100–250ms/hash là budget khởi đầu, không thông số tuyệt đối). Không truncate password, không log body auth; đặt max 128 ký tự và body cap.
- Access JWT TTL 10 phút chỉ trong memory, không localStorage; refresh token opaque ≥256-bit random, chỉ hash lưu DB. Rotation một lần, token family và parent giữ để phát hiện reuse. Frontend dùng single-flight trong tab và Web Locks để serialize rotation giữa tab cùng origin; CSRF cookie được đọc sau khi lấy lock. Browser không có Web Locks chỉ bảo vệ đồng thời trong tab; cross-origin web/admin không chia sẻ lock, cần kiểm deployment thực.
- Access JWT chứa familyId; auth guard xác nhận family chưa bị revoke trên mọi protected request, cache có invalidation + DB fallback. Logout/reset/suspend/reuse vô hiệu family trước response; không chờ access TTL để ngừng action cấp thưởng. Trạng thái revocation cần fail-closed nếu không thể xác nhận.
- Cookie `__Host-fwo-refresh`: Secure, HttpOnly, SameSite=Lax, Path=/, không Domain. CSRF token riêng ký/bind session, đọc được JS để gửi `X-CSRF-Token`; kiểm tra exact Origin/Referer fallback và token ở refresh/logout và mọi cookie-auth mutation. Auth login/register/reset kiểm tra Origin để tránh login CSRF.
- Prefer cùng origin `/api`; dev CORS exact allowlist `http://localhost:5173`, `http://localhost:5174`; production allowlist env rõ từng host, không wildcard khi credentials. Reject Origin `null` trừ luồng thực sự đã thiết kế.
- CSP giới hạn script/connect/img/media từ origin/R2 chính xác, không unsafe-eval production; Phaser/WebGL compatibility kiểm thử. TLS 1.2+, HSTS sau khi domain/subdomain đã HTTPS; no-store token/session response. Không log Authorization/Cookie/Set-Cookie.
- Admin MFA/step-up là release gate trước quyền production; không coi JWT claim role lâu hạn là đủ. Bootstrap admin bằng lệnh one-time với secret từ operator, không seed default credentials. Không có endpoint tự cộng tiền MVP.
- Secrets nằm secret store CI/VPS, `.env.example` chỉ placeholder; `VITE_*` luôn public. Rotate DB/signing/R2 keys theo runbook, quyền tối thiểu, staging/prod tách bucket/database/key.

## Rate limit ban đầu và failure policy

Các số là giả định cần load test: login 5 lần/5 phút/account + 30/5 phút/IP; register/reset 3/giờ/IP; refresh30/phút/family; fishing read180/phút/user; reel4/giây/user cộng spacing 250ms (cast/hook/complete có bucket riêng để không chặn thao tác chuyển state); purchase/claim 30/phút/user; admin publish5/phút. Key IP phải lấy từ trusted proxy cấu hình đúng, không tin X-Forwarded-For tùy ý. CGNAT Việt Nam cần theo dõi để tránh khóa nhầm.

Redis mất: auth/admin/economy mutations fail closed 503 hoặc fallback giới hạn process được thiết kế và test; không bỏ rate limit âm thầm. Public static/catalog có thể phục vụ cache. DB mất: không cấp thưởng offline; UI thông báo retry và giữ receipt/session ID.

## Checklist release

- [ ] Threat cases trên có unit/integration/E2E tương ứng, race test PostgreSQL thật.
- [ ] Secrets/dependency scan và review quyền CI/DB/R2; dependency pin + lockfile pnpm.
- [ ] HTTPS/CORS/CSRF/CSP/cookie chạy đúng trên domain staging thực, logout/reset/revocation và refresh reuse đã test.
- [ ] Replay/duplicate transaction test và daily reconcile ledger đã pass.
- [ ] RBAC matrix phủ từng admin route; audit append-only và rate limit không bypass qua proxy.
- [ ] Backup mã hóa restore được, incident contact và key rotation runbook có người chịu trách nhiệm.
- [ ] Chính sách dữ liệu, tuổi người chơi, email/consent và retention được rà soát pháp lý; không bật payment/ads khi chưa phê duyệt.

Sự cố kinh tế: tạm ngừng mutation liên quan bằng feature flag → giữ log/ledger → đánh giá phạm vi → fix/reconcile bằng compensating ledger entry có audit → thông báo theo nghĩa vụ áp dụng. Không sửa/xóa ledger lịch sử để che sai lệch.

## Hoàn tất lượt câu khi hết phiên đăng nhập

Cookie grant HttpOnly/SameSite=Lax/Secure production, purpose `finish-fishing`, ràng buộc user/family/session; không chấp nhận như bearer hoặc payment WebSocket. Deadline tuyệt đối theo lượt, tối đa hai phút sau timeout phiên để xác nhận kết quả; không refresh hay gia hạn bởi polling/replay. Chỉ allowlist endpoint context/read và hook/reel/complete/abandon đúng session, yêu cầu Origin allowlist + HMAC CSRF riêng cho cookie mutation. Family leaf phải chưa used/revoked và cast bắt đầu trước expiry rolling/absolute; account active được kiểm tra lại và mutation recheck dưới lock. Natural refresh expiry không revoke leaf; logout/reset/reuse/admin revoke/khóa account vẫn chặn. Không mở lại deadline engine hoặc nhân reward.
