# Payments

Module sở hữu đơn VND, gateway adapters, xác minh IPN, fulfillment outbox và WebSocket. Không đổi giá Gold hoặc số dư ví khi bán vật phẩm bằng VND. Dùng lại `players.grantItem`, `lockPlayer`, auth family, RBAC và audit.

- `config.ts`: chế độ disabled/sandbox/production, merchant capabilities và URL.
- `gateways.ts`: `PaymentGatewayInterface`, MoMo, VNPay, BankCardGateway qua VNPay hosted checkout.
- `repository.ts`: đọc đơn theo chủ sở hữu, DTO và row lock.
- `service.ts`: OrderService, PaymentService, nhận receipt, cấp đồ, expiry/reconciliation và durable outbox.
- `index.ts`: controller/routes người chơi, IPN và admin; lifecycle worker.
- `realtime.ts`: WebSocket xác thực frame đầu, kiểm tra family/expiry, Redis fan-out giữa API instances.

Hướng dẫn cấu hình, API, migration, sơ đồ, merchant onboarding và nghiệm thu: [docs/PAYMENTS.md](../../../../../docs/PAYMENTS.md).
