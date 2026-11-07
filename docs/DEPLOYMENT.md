# Kế hoạch vận hành và triển khai

## Runtime và lệnh đã có

Xem README root để setup local. `compose.yaml` cung cấp Postgres16/Redis7/Mailpit; native helper cung cấp cluster localhost riêng khi máy đã có PostgreSQL tools. `pnpm dev` chạy API3001/web5173/admin5174. CI `.github/workflows/ci.yml` chạy lint/typecheck/unit/integration/build/audit/E2E; chưa được chạy trên GitHub trong phiên local.

Production template: `infrastructure/docker/compose.production.yaml`, hai Dockerfile và Nginx8080/8081. API bundle workspace TypeScript, chạy Node với user node; frontend là static asset. Sao chép `.env.example` trong thư mục docker sang file operator riêng; lệnh thực thi từ root: `rtk proxy docker compose --env-file <file-operator> -f infrastructure/docker/compose.production.yaml ...`. Không lưu secrets vào Git/image.

Trước deploy: provision TLS reverse proxy/domain, tách runtime DB role khỏi POSTGRES_USER/migration owner (quyền tối thiểu, không superuser/owner bảng lịch sử) bằng `infrastructure/scripts/runtime-role.sql` sau migrate. Script psql đọc FWO_RUNTIME_PASSWORD từ môi trường operator; chạy bằng MIGRATION_DATABASE_URL, sau đó đặt DATABASE_URL của API sang fwo_app. Mỗi migration bổ sung bảng phải rà soát/chạy lại grants; không truyền credential owner vào container API, giới hạn mạng/ports, xác thực SMTP, backup mã hóa/offsite/WAL và monitoring. API không mở cổng trực tiếp; Nginx truyền IP và API tin private Docker peers qua TRUST_PROXY; nếu đổi topology phải cấu hình đúng CIDR proxy, không tin IP header từ Internet.

Chạy migration bằng one-off container/job trước API startup (`pnpm db:migrate`, `pnpm db:seed`), không tự chạy mỗi replica. `PUBLIC_RELEASE_APPROVED` mặc địnhfalse; chỉ operator đặttrue sau legal/security/release review. Docker daemon máy hiện tại chưa hoạt động nên chỉ validate compose, chưa build/run image. Chưa có domain/VPS/Cloudflare/R2 hay deployment thực.

## Kế hoạch vận hành tiếp theo

Ngày: 07/11/2026. Chi phí dưới đây là budget giả định, chưa lấy báo giá nhà cung cấp hiện hành; cần đo tải trước khi mua/nâng cấp.

## Local, môi trường và artifacts

Foundation tạo pnpm workspace + lockfile, pin Node LTS/TypeScript/Prisma/Phaser thực sự tương thích. Chạy app từ workspace root bằng pnpm; PostgreSQL/Redis qua Docker Compose, không cài bằng npm/yarn. `.env.example` chỉ placeholder cho DATABASE_URL, REDIS_URL, JWT keys, CSRF secret, allowed origins, R2 endpoint/bucket và email provider. Web chỉ có API base URL/public asset URL. README phải ghi thư mục thực thi cho từng lệnh sau khi scripts tồn tại; hiện chưa có lệnh start hợp lệ.

Ba môi trường local/staging/production tách DB, Redis, bucket, signing key, cookie origin và admin. Frontend build artifact immutable; API Docker multi-stage chạy non-root, health/readiness, resource limits, không nhúng secret vào image. Nginx terminate TLS hoặc TLS tới Cloudflare origin, strict TLS end-to-end; origin firewall chỉ trusted ingress và SSH theo operator IP/zero-trust.

## Pipeline đề xuất

1. PR → install `pnpm install --frozen-lockfile`, lint, typecheck, unit, integration với PostgreSQL/Redis ephemeral, contract check, production build, dependency/secret scan.
2. Merge dev → build immutable image/static hash, migrate staging bằng job độc lập, deploy staging, smoke/E2E + migration compatibility.
3. Production release từ main/tag → cùng image digest đã qua staging; GitHub Environment production có required reviewer, secret hạn chế, approval thủ công. Không tự deploy public khi chưa đủ gate pháp lý.
4. Trước migrate production: backup và check dung lượng; `prisma migrate deploy` duy nhất một runner; không chạy migration trong mỗi replica startup. Expand/contract để image trước vẫn tương thích.
5. Health check + smoke catch/wallet invariants. Rollback image về digest trước nếu lỗi; migration phá hủy không reverse tự động, dùng forward fix hoặc restore có đánh giá mất dữ liệu theo RPO.

Branch main production, dev staging, feature/_, fix/_, release/*. Git identity/SSH phải kiểm tra theo project rule trước commit/push; tài liệu này không thay đổi remote hoặc identity.

## Capacity: registered users không phải concurrent users

Giả định dimensioning: 1 active fisher đọc 2 request/s khi chờ và trung bình 2 action/s khi fight; budget đỉnh ~4 dynamic RPS/CCU, không tính asset CDN. 100 registered users có thể chỉ 5–20 CCU; không suy ra CCU bằng một tỷ lệ cố định. Bảng là lộ trình theo CCU thật, không cam kết throughput phần cứng:

| Tải đỉnh   | RPS budget | Bố trí thử nghiệm                                                                                                          | Hành động trước khi chấp nhận tải                                                                                 |
| ---------- | ---------: | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 100 CCU    |       ~400 | VPS 4 vCPU/8GB RAM/80GB NVMe, app+DB+Redis có limits; static CDN                                                           | Load 100 CCU, theo dõi DB IOPS, transaction locks và CPU; DB chung VPS là rủi ro single point                     |
| 1.000 CCU  |     ~4.000 | 2 API replicas 4 vCPU/8GB mỗi máy; DB riêng 8 vCPU/16–32GB; Redis riêng 2 vCPU/4GB                                         | Connection pool/PgBouncer, query tuning, giảm poll/backoff; LB và failover plan                                   |
| 10.000 CCU |    ~40.000 | Nhiều API nodes 8 vCPU/16GB; DB 16–32 vCPU/64–128GB, standby; Redis HA; tách analytics                                     | Benchmark mô hình trạng thái; evaluate Socket.IO/batching để giảm poll; write contention và chi phí DB quyết định |
| 50.000 CCU |   ~200.000 | Cụm capacity theo benchmark, multiple failure domains, primary/standby + read replicas, queues/outbox cho noncritical work | Dedicated capacity engineering; có thể partition gameplay domain/regions sau ADR, không hứa monolith một VPS đủ   |

Nếu 100/1.000/10.000/50.000 là registered users thay CCU: bắt đầu tính từ DAU × tỷ lệ peak đồng thời đo từ beta; chưa tăng hạ tầng chỉ theo số tài khoản. 10.000 accounts với 200 CCU có thể ở gần tier thấp hơn nhiều. Level scale lớn cần kế hoạch ngân sách riêng; không thêm microservices ngay Foundation.

## Ngân sách giả định mỗi tháng

Đơn vị triệu VNĐ, chưa VAT/công vận hành và biến động tỷ giá. Không phải báo giá. Egress, log volume, email, R2 operations, Cloudflare plan và SLA có thể làm tăng chi phí.

| Mục                    | MVP private beta ≤100 CCU |  1.000 CCU |   10.000 CCU |    50.000 CCU |
| ---------------------- | ------------------------: | ---------: | -----------: | ------------: |
| API/VPS/LB             |                   0,6–1,2 |      2,5–6 |        15–50 |        75–250 |
| DB/Redis/standby       | chung VPS; 0–0,4 dự phòng |        3–7 |        15–45 |        60–200 |
| R2/assets/CDN          |                     0–0,3 |      0,3–1 |          2–8 |         10–40 |
| Monitoring/log/email   |                     0–0,4 |      0,5–2 |         3–12 |         15–60 |
| Backup offsite         |                   0,1–0,3 |      0,4–1 |          2–8 |          8–25 |
| Domain quy đổi / tháng |                 0,02–0,05 |  0,02–0,05 |    0,02–0,05 |     0,02–0,05 |
| Tổng khoảng            |                 0,72–2,65 | 6,72–17,05 | 37,02–123,05 | 168,02–575,05 |

Ngưỡng scale ban đầu: p95 API >300ms/5 phút, CPU >70% kéo dài, pool wait >100ms, DB disk >70%, rate lỗi 5xx >1% hoặc queue lag tăng. Chỉ nâng cấp sau phân biệt query/lock/GC/asset với thiếu tài nguyên. Budget alert 50/80/100%; closed beta có giới hạn concurrent admission nếu cần.

## Backup, quan sát và phục hồi

- PostgreSQL daily encrypted full/base backup + WAL archive ≤5 phút cho alpha có dữ liệu thật; offsite storage khác failure domain, quyền delete backup tách app. RPO mục tiêu ≤5 phút, RTO ≤4 giờ; restore drill hàng tháng ghi thời gian thực. Redis cache rebuild được, không dùng Redis backup thay DB.
- Backup giữ 7 daily/4 weekly/3 monthly tạm tính, kiểm tra checksum và test restore với ledger balance/count. Snapshot VPS chỉ hỗ trợ phục hồi nhanh, không thay backup độc lập.
- Structured JSON logs requestId/user pseudonymous ID/state transition/error code; redact headers/auth/bodies. Metrics RPS/p95/p99/5xx, db pool/lock/slow queries, Redis health, fish catches/rarity distribution, ledger reconcile, claim conflicts, session escape và refresh reuse.
- Alert có owner và runbook: disk, DB down, backup thất bại, reward invariant, elevated auth failures. Uptime probe ngoài VPS; frontend error tracking có sampling và lọc PII. Không đưa fish reward bí mật vào client log.
- SLO beta thử nghiệm: API availability 99,5%/tháng, 5xx<0,5%, p95 read<300ms và economic mutation<500ms ở 100 CCU; FPS median ≥50 desktop và ≥30 thiết bị mobile target. Đo mạng VN và thiết bị thật; đây là tiêu chí thử nghiệm, chưa là SLA thương mại.

## Gate triển khai

Không public release cho đến khi có acceptance của product, security/RBAC/anti-cheat, load/restore test, support/incident process, legal review và ngân sách vận hành. Chưa bật premium/payment/ads. Mọi deployment thực tế cần domain, VPS và quyền operator do chủ dự án cung cấp; Discovery không tạo tài khoản/dịch vụ hay phát hành ra Internet.
