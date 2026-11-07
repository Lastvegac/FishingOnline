# Thanh toán và cấp vật phẩm realtime

Ngày 07/11/2026. Tích hợp vào modular monolith hiện tại; mặc định `PAYMENT_ENVIRONMENT=disabled`. Chủ sản phẩm chọn VNPay cho ATM và thẻ quốc tế. Chưa có merchant credentials: không có giao dịch thật hoặc nghiệm thu trực tiếp sandbox của nhà cung cấp trong lần triển khai này.

## Phân tích và quyết định tích hợp

React/Vite/Three.js và TanStack Query đang đọc player/inventory/shop qua HTTP; Zustand giữ auth/UI. Backend Fastify/Zod dùng Prisma/PostgreSQL, JWT cùng refresh-session family, Redis cho rate limit. Gold là BigInt với ledger bất biến. `players/service.ts` đã có `grantItem`, `getInventory`, `getPlayer`; mutation helper dùng idempotency và khóa user trong transaction. Game fishing dùng polling, chưa có transport push.

Giữ shop Gold và snapshot phiên câu. Catalog VND độc lập, không suy giá VND từ Gold. Gói có thể chứa equipment/bait hoặc Kim cương (`DIAMOND`, ID tiền canonical); Super Admin quản lý catalog qua API/UI có optimistic version và audit. Theo giá mở đầu được chủ sản phẩm duyệt, cài mới seed hai gói 10.000đ/100 Kim cương và 20.000đ/200 Kim cương; dữ liệu cũ áp dụng bằng CLI có version/audit. Catalog hiển thị giá cả khi phương thức disabled, nút mua vô hiệu hóa và API từ chối tạo đơn. Việc niêm yết không bật cổng thanh toán. Chi tiết giá/cấp/cách áp dụng: [LAUNCH_PRICING](LAUNCH_PRICING.md). Số lượng gói chứa trang bị tối đa 1; gói chỉ mồi/Kim cương tối đa 100 và tổng tối đa 999.999.999 VND. Không nạp Gold, thu thập thẻ hoặc đổi tiền ra khỏi game.

## Kiến trúc

```mermaid
flowchart LR
  Shop[React Shop / Orders] -->|Bearer + Idempotency-Key| Controller[Payment controllers]
  Controller --> Orders[OrderService / giá và snapshot từ DB]
  Orders --> Adapter[PaymentGatewayInterface]
  Adapter --> MoMo[MoMo hosted checkout]
  Adapter --> VNPay[VNPay / ATM / Visa-Mastercard]
  MoMo --> IPN[Webhook controller / verify signature]
  VNPay --> IPN
  IPN --> Receipt[(PostgreSQL receipt + fulfillment outbox)]
  Receipt --> Worker[PaymentService retry worker]
  Worker --> Inventory[players.grantItem / inventory transaction]
  Inventory --> Events[(Notification outbox)]
  Events --> Redis[Redis fan-out khi chạy nhiều instance]
  Redis --> WS[RealtimeNotificationService / authenticated WebSocket]
  WS --> Shop
  Shop -->|Reconnect / GET authoritative data| Controller
```

```mermaid
sequenceDiagram
  participant C as Client
  participant A as Fastify
  participant D as PostgreSQL
  participant G as Gateway
  C->>A: POST orders {productId,quantity,method} + idempotency UUID
  A->>D: Lock user; snapshot DB price/items; PENDING order + transaction
  A-->>C: Order code, amount, items
  C->>A: POST order/checkout
  A->>G: Signed checkout request / URL
  A-->>C: Hosted payment URL
  C->>G: Payment on provider page
  G->>A: Signed IPN (independent of browser)
  A->>A: Verify merchant, signature, amount, reference, transaction identity
  A->>D: Lock user/order; receipt SUCCESS + order PROCESSING + outbox
  A->>D: Transaction: grant items + immutable fulfillment logs + PAID + notification
  A-->>G: Provider acknowledgement after receipt persists
  A-->>C: payment:success via authenticated WebSocket
  C->>A: Refetch inventory, wallet/player, shop and order
  Note over C,A: Return URL only opens order history; it never settles payment
```

## Nhất quán và phục hồi

Receipt và fulfillment có hai transaction có chủ đích. Transaction đầu lưu bằng chứng payment hợp lệ trước khi ack IPN. Transaction thứ hai cấp toàn bộ gói, ghi fulfillment mỗi dòng, chuyển `PAID`, ghi analytics và notification outbox nguyên tử. Nếu cấp đồ lỗi, payment vẫn `SUCCESS`, order `PROCESSING`; không hiện popup thành công cho tới `PAID`. Worker retry sau 1s, 2s… tối đa 60s giữa các lần, không tự bỏ quyền lợi. Admin thấy backlog và có thể gọi đối soát để retry receipt đã được xác minh.

Worker outbox chạy mỗi 500ms; sweep hết hạn/đối soát mỗi 10s. Đơn chưa có kết quả bắt đầu được query sau 30s, ít nhất 60s giữa các lượt tự động, tối đa 5 đơn mỗi sweep. IPN bình thường cấp đồ ngay trong request; không chờ lịch đối soát. Đơn unresolved trong 7 ngày được query tự động; đơn cũ hơn vẫn nhận IPN và được Super Admin đối soát có audit. Vận hành phải theo dõi backlog thay vì xem đây là SLA đã đo.

Khóa luôn theo thứ tự user → order; dùng chung khóa với shop/equip hiện tại. Unique constraints bảo vệ `(user,idempotencyKey)`, orderCode, `(gateway,gatewayTransactionId)`, orderItem fulfillment và outbox key. Hai IPN đồng thời hoặc hai worker không cấp thêm. Realtime có thể lặp sau crash/publish; client dedupe theo order, đọc lại API và không cộng inventory cục bộ.

Thành công hợp lệ đến sau `EXPIRED`, `CANCELLED` hoặc `FAILED` vẫn được xử lý để giữ quyền lợi. Callback failure đến sau `SUCCESS` không đảo receipt. Cùng provider transaction không được dùng cho hai đơn. Redirect/refresh/đóng trình duyệt không ảnh hưởng fulfillment. Network timeout lúc tạo checkout giữ đơn `PENDING`; người dùng tiếp tục cùng đơn/request ID, hoặc kiểm tra trước khi tạo đơn khác.

Equipment mua trong hai đơn hợp lệ là hai instance riêng. Shop Gold vẫn dùng quy tắc sở hữu cũ; một cuộc đua mua Gold/VND không làm mất vật phẩm đã trả tiền. Mua mới không đổi trang bị/snapshot của phiên câu đang chạy; equip vẫn theo kiểm tra active session hiện có. Config publish phải giữ mọi definition đã tham chiếu trong đơn VND.

## Database migration

`apps/api/prisma/migrations/202611070005_payments/migration.sql` chỉ thêm bảng/enum/index/check/trigger; không sửa ví hoặc lịch sử người chơi:

| Bảng                     | Nội dung                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| payment_products         | Giá VND, items, active, optimistic version                                                 |
| payment_orders           | Chủ sở hữu, product/name/total snapshot, trạng thái, hạn 15 phút                           |
| payment_order_items      | ID/tên/kind/quantity/image snapshot; lịch sử bất biến                                      |
| payment_transactions     | Một attempt ổn định/đơn, gateway/method/provider ID, URL, receipt lược dữ liệu             |
| payment_webhook_logs     | Payload whitelist + SHA256 của payload nhận, signatureValid, processingStatus; append-only |
| payment_fulfillment_logs | Unique orderItem, inventoryId, quantity, fulfilledAt; append-only                          |
| payment_outbox           | Công việc FULFILLMENT và NOTIFICATION, attempts/backoff/error code                         |

Giá nguyên VND dùng BigInt, DTO là decimal string. SQL chặn thay amount/identity của transaction, snapshot đơn và đảo successful receipt. Không xóa inventory khi log cấp đồ còn tham chiếu: inventoryId trong log là historical identifier, không foreign key, nên flow bán lại hiện có vẫn hoạt động.

Từ root repository: `rtk proxy pnpm db:generate`, sau backup và chọn đúng môi trường chạy `rtk proxy pnpm db:migrate`. Rerun `infrastructure/scripts/runtime-role.sql` bằng migration owner để runtime role có quyền trên bảng mới, đồng thời bị revoke UPDATE trên ba bảng payment history. Migration chưa tự chạy trên database ứng dụng bởi task này.

## HTTP API

Các route dưới `/api/v1`; JSON `{data}`/`{error}`, trừ provider ack. Người chơi phải authenticated, chỉ đọc/ghi đơn của mình. Mọi POST/PATCH authenticated gửi `Idempotency-Key` UUID. Tạo order dùng receipt idempotency; checkout/check là thao tác tiếp tục/query trên chính đơn đó, không tạo thêm attempt.

| Method/path                               | Input/kết quả                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /payments/catalog                     | environment, methods enabled, catalog/bundle public                                                                                          |
| POST /payments/orders                     | `{productId,quantity,method}` → order; không nhận giá hoặc status từ client                                                                  |
| GET /payments/orders?cursor=UUID          | 30 đơn gần nhất + nextCursor                                                                                                                 |
| GET /payments/orders/:id                  | Order/transaction status, items, inventory IDs sau fulfillment                                                                               |
| POST /payments/orders/:id/checkout        | `{}` → cùng order, signed hosted URL; lease chống tạo checkout đồng thời                                                                     |
| POST /payments/orders/:id/check           | `{}` → signed provider query, đối chiếu và fulfillment nếu hợp lệ; throttle 15s/đơn                                                          |
| POST /payments/webhooks/momo              | Signed JSON IPN; ack HTTP 204 khi đã persist, lỗi HTTP để gateway retry                                                                      |
| GET /payments/webhooks/vnpay              | Signed query IPN; `{RspCode,Message}`: 00 accepted, 02 already confirmed, 01 unknown order, 04 amount mismatch, 97 signature, 99 other/retry |
| GET /admin/payments/orders                | Filters cursor,userId,gateway,status,from,to (UTC ISO)                                                                                       |
| GET /admin/payments/orders/:id            | Receipt, 100 IPN gần nhất, fulfillment logs, retry state                                                                                     |
| GET /admin/payments/report                | Counts, delivered revenue, verified receipts, global fulfillment backlog                                                                     |
| POST /admin/payments/orders/:id/reconcile | `{reason}`; Super Admin; chỉ query/verify/retry, audit trước thao tác                                                                        |
| GET /admin/payments/products              | Super Admin; catalog cả active/inactive                                                                                                      |
| POST /admin/payments/products             | `{name,description,amountVnd,active,items:[{itemId,kind,quantity}],reason}`                                                                  |
| PATCH /admin/payments/products/:id        | Như create + `expectedVersion`; không sửa snapshot đơn đã tạo                                                                                |

Readers: SUPER_ADMIN, GAME_ADMIN, SUPPORT, ANALYST. Writers/đối soát: SUPER_ADMIN. Bộ lọc ngày admin là ngày Việt Nam; doanh thu theo ngày tạo đơn đã PAID, receipts theo cùng tập đơn. Backlog là toàn hệ thống và được ghi nhãn riêng. Mỗi dòng trong danh sách đơn hiển thị transaction ID/gateway; không có giao dịch rời khỏi đơn trong mô hình một attempt/đơn. Thử lại payment thất bại tạo đơn mới và giữ nguyên đơn cũ.

## WebSocket

URL `/api/v1/payments/socket`, `ws:` local/`wss:` production. Không gửi bearer/ticket trong URL. Frame đầu `{accessToken:"..."}` trong 5s; token chỉ ở memory browser. Server verify JWT, ACTIVE user và refresh family; kiểm tra lại trước mỗi notification và heartbeat 15s. Origin phải có trong allowedOrigins. Tối đa 5 connection/user, 1000/process, giới hạn upgrade/IP và frame 4096B.

Server gửi `payment:connected` khi auth xong; client gửi `payment:ping` mỗi 10s, server `payment:pong`. Các event nghiệp vụ là `payment:pending`, `payment:processing`, `payment:success`, `payment:failed` (bao gồm CANCELLED), `payment:expired` với envelope `{id,event,data:PaymentOrderDto}`. `success` chỉ sau inventory commit; `data.items` có quantity và inventoryId. Không có event client tự cấp đồ.

Reconnect exponential backoff 0,5–15s có jitter; heartbeat thiếu 25s thì reconnect. Mỗi lần connect/focus/online đồng bộ đơn, inventory, wallet/player và shop từ API. Trang đơn poll GET mỗi 3s khi PENDING/PROCESSING; đơn đang theo dõi được đồng bộ qua API mỗi 10s kể cả khi mất fan-out mà socket còn mở. Các lần thanh toán đến liên tiếp được queue, không ghi đè popup. Đóng popup lưu acknowledge UI cho phiên hiện tại; không sửa order trên backend.

Redis production publish/subscribe fan-out tới mọi API instance; outbox giữ notification để retry khi publish lỗi. Không có Redis chỉ dùng local hub ở development. Pub/sub không lưu session delivery: mất sự kiện hoặc reconnect luôn được sửa bằng API/DB. Nginx đã có upgrade/no buffering/60s timeout cho socket; Vite proxy bật ws.

## Cấu hình môi trường

File mẫu không có secret thật: `apps/api/.env.example`. Backend là nơi duy nhất có merchant keys; không dùng biến VITE_* cho credentials. Production Compose truyền các biến tương ứng.

| Biến                                                | Vai trò                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PAYMENT_ENVIRONMENT                                 | disabled (default), sandbox, production; production yêu cầu NODE_ENV=production                                          |
| PAYMENT_SUCCESS_URL, PAYMENT_CANCEL_URL             | URL frontend; không xác nhận/cancel payment bằng redirect. MoMo dùng success URL chung cho mọi kết quả; trang đó đọc API |
| MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY | Merchant do MoMo cấp                                                                                                     |
| MOMO_ENDPOINT                                       | Origin `https://test-payment.momo.vn` hoặc `https://payment.momo.vn`, đúng mode                                          |
| MOMO_IPN_URL                                        | HTTPS public callback `/api/v1/payments/webhooks/momo`                                                                   |
| VNPAY_TMN_CODE, VNPAY_HASH_SECRET                   | Merchant do VNPay cấp                                                                                                    |
| VNPAY_PAYMENT_URL                                   | Sandbox paymentv2/vpcpay.html; production URL do VNPay cấp trên pay.vnpay.vn                                             |
| VNPAY_QUERY_URL                                     | merchant_webapi/api/transaction                                                                                          |
| VNPAY_RETURN_URL                                    | Frontend `/play/payments`; không cần order ID trong URL vì history/watch được phục hồi                                   |
| VNPAY_IPN_URL                                       | HTTPS public `/api/v1/payments/webhooks/vnpay`; khai báo với VNPay, không phải tham số tạo payment URL                   |
| VNPAY_ATM_ENABLED                                   | true khi merchant được bật VNBANK                                                                                        |
| VNPAY_INTERNATIONAL_CARD_ENABLED                    | true khi merchant được bật INTCARD / Visa / Mastercard                                                                   |
| PAYMENT_QUERY_IP                                    | IP egress của server gửi trong querydr; bắt buộc khi VNPay production, không dùng IP người chơi                          |
| REDIS_URL                                           | Rate limit và notification fan-out production                                                                            |

Thẻ dùng chính VNPay, vì vậy không cần `CARD_GATEWAY_PUBLIC_KEY`, `CARD_GATEWAY_SECRET_KEY`, `CARD_GATEWAY_WEBHOOK_SECRET`. Không có API nhận PAN/CVV/OTP, iframe hoặc SDK thu thập thẻ. Thông tin thẻ chỉ nhập tại trang VNPay/ngân hàng. Webhook payload chỉ giữ whitelist các mã/amount/result; không lưu toàn bộ payload, chữ ký hoặc thông tin thẻ.

## Merchant onboarding và chạy sandbox

1. MoMo: liên hệ [MoMo Business](https://business.momo.vn/) và đăng ký merchant tích hợp thanh toán. Cung cấp thông tin doanh nghiệp/dịch vụ/website theo yêu cầu của MoMo; lấy tài khoản môi trường thử và bộ partnerCode/accessKey/secretKey. Xác nhận sản phẩm captureWallet/autoCapture phù hợp merchant. Tham khảo [create wallet](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [IPN](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/) và [query](https://developers.momo.vn/v3/vi/docs/payment/api/payment-api/query/). Website tài liệu MoMo trả HTTP 403 trong phiên này; cần đối chiếu lại với bộ tài liệu merchant và chạy contract sandbox trước khi bật thật.
2. VNPay: đăng ký [sandbox developer](https://pay.vnpaytest.vn/dev-registration), nhận TmnCode/hashSecret qua kênh VNPay cấp. Đăng ký merchant production trực tiếp với [VNPay](https://vnpay.vn/), xác nhận website/app, ngành hàng và các rail được hợp đồng cho phép. Tham khảo [PAY/IPN](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) và [querydr](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html), đã đối chiếu ngày 07/11/2026.
3. Thẻ: merchant yêu cầu VNPay bật ATM (VNBANK) và/hoặc INTCARD. Chỉ bật env tương ứng sau khi được cấp. Không tự thêm provider thẻ giả hoặc giả lập transaction thành công vào runtime.
4. Cấu hình API ở `PAYMENT_ENVIRONMENT=sandbox`, điền credentials thử ở backend. Cung cấp HTTPS callback công khai tới API local/staging qua tunnel có kiểm soát; đăng ký chính xác URL IPN với provider. Return URL tới frontend. Không dùng secret production hoặc thẻ thật cho test.
5. Chạy migration trên database sandbox riêng, chạy API/web/admin theo README. Super Admin tạo gói từ ID equipment/bait có sẵn, giá VND nguyên, bật active. Đi Shop → chọn gói → tạo đơn → xác nhận total/code → hosted checkout.
6. Dùng tài khoản/thẻ thử mà gateway cung cấp. Kiểm tra cả callback thật và provider query; lưu kết quả merchant certification. Trình duyệt quay lại không được coi là bằng chứng đã trả tiền.

## Triển khai production

Backup/diễn tập migration trên staging; migrate bằng owner rồi cấp lại runtime privileges. Cấu hình HTTPS frontend/API, `PAYMENT_ENVIRONMENT=production`, Node production, live merchant keys đúng endpoint, IPN đã đăng ký, card flags đúng hợp đồng. Các gate release/legal/security hiện có của dự án vẫn áp dụng. Nginx/Cloudflare phải cho IPN đi tới origin, không cache callback/order/auth; bật WebSocket. Redis dùng chung giữa instances; clock đồng bộ NTP.

Trước mở bán: hoàn thành provider sandbox/certification, xác nhận chính sách giá/quyền lợi, quy trình xử lý tranh chấp/hoàn tiền qua provider và audit. Chưa có tự động refund/chargeback trong phạm vi này; không tự sửa trạng thái PAID hoặc xóa fulfillment để xử lý hoàn tiền. Theo dõi `fulfillmentBacklog`, outbox attempts/lastError, lỗi chữ ký/amount, đơn PROCESSING quá ngưỡng và đơn unresolved >7 ngày. Cấu hình alert tại hệ thống giám sát vận hành; không coi log warn đơn thuần là cảnh báo đã triển khai.

Rollback ứng dụng phải giữ worker có khả năng cấp đồ cho receipt đã lưu. Khi cần dừng mở bán mà còn đơn chờ, deactivate toàn bộ sản phẩm và giữ mode/credentials hiện tại để IPN/query tiếp tục hoạt động. Mode disabled tắt gateway adapters, vì vậy không nhận thêm IPN/query; outbox của receipt SUCCESS đã lưu vẫn tiếp tục cấp đồ. Không drop bảng khi còn đơn hoặc đối soát chưa xong. Không đổi/thu hồi credentials trước khi đối soát xong các đơn đang mở mà không có kế hoạch nhận IPN/query bằng bộ merchant cũ.

## Kiểm thử và các phase bàn giao

Từ root repository:

```sh
rtk proxy pnpm --filter @fwo/api test
rtk proxy env TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/fishing_world_payment_test pnpm test:integration
rtk proxy env E2E_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/fishing_world_payments_e2e_test pnpm exec playwright test --config playwright.payments.config.ts
rtk proxy pnpm typecheck
rtk proxy pnpm lint
rtk proxy pnpm build
```

E2E dùng cổng API 3012/web 4183/admin 4184, database riêng và `payment-api.ts` inject dummy merchant cùng fetcher từ chối mọi request gateway. Web/admin chạy Vite preview từ build riêng trong `/tmp/fwo-payments-{web,admin}-build` để việc sửa source đồng thời không làm HMR xoá form đang kiểm thử. Không có production mock endpoint. Các test chính thức mới được giữ theo yêu cầu task. Dọn database bằng test-database helper với đúng TEST/E2E_DATABASE_URL, chỉ sau khi server/run đã dừng; dọn cả hai build tạm và `/tmp/fwo-payments-e2e-artifacts`.

| Phase       | Source chính                                                            | Checkpoint                                                              |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1 Phân tích | README, contracts, auth/players/fishing/admin, transaction/schema       | Baseline typecheck + 33 unit PASS                                       |
| 2 DB/module | schema + 005_payments migration, contracts/payments, repository/service | Migration trên DB test + validation/idempotency/concurrency             |
| 3 MoMo      | gateways.MoMoGateway/config/IPN controller                              | Chữ ký, request ID, amount, cancel, repeated IPN; chưa merchant sandbox |
| 4 VNPay     | gateways.VNPayGateway + querydr/IPN                                     | HMAC512, encoding, amount×100, GMT+7, signed query, concurrency         |
| 5 Thẻ       | BankCardGateway + capability flags                                      | VNBANK/INTCARD URL và disabled rail; chưa merchant certification        |
| 6 Realtime  | realtime.ts, Redis/Nginx/Vite, PaymentUpdates                           | Real WebSocket owner isolation/reconnect + browser flow                 |
| 7 Inventory | fulfill/outbox + players.grantItem, config guard                        | Retry fault, unique fulfillment, no Gold mutation, late success         |
| 8 Web       | payments.tsx/.module.css, ShopPage/App                                  | Typecheck/color lint + desktop/mobile E2E                               |
| 9 Admin     | admin main/CSS + payments controllers                                   | RBAC/audit/optimistic version + browser create/detail                   |
| 10 Handoff  | PAYMENTS.md, env, README/status/changelog/TODO/test plan                | Kết quả thực tế cập nhật tại PROJECT_STATUS                             |

Acceptance bắt buộc: không cấp đồ từ redirect/client; signature/account/ref/amount khớp; duplicate/concurrent receipt chỉ một grant; user khác 404; failure/cancel/expiry không cấp; late success được phục hồi; lỗi fulfillment giữ receipt và retry; WebSocket chỉ đúng user; reload/reconnect fetch inventory; audit admin không sửa payment thành công bằng tay; secret không vào bundle/log; không giao dịch tiền thật trong QA.

Giới hạn cần xác minh với môi trường thực: merchant sandbox end-to-end MoMo/VNPay/thẻ, credentials rotation, production Redis fan-out qua nhiều instance, latency/FPS/mobile thật, tải, alert/restore và provider certification. Test fake transport không chứng minh kết nối merchant hoạt động.
