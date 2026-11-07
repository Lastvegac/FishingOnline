# @fwo/contracts

DTO công khai, enum và Zod strict schemas dùng chung giữa API/web/admin. Không chứa spawn weight, seed hoặc công thức thưởng. Gold là decimal string; trọng lượng là gram integer; thời gian là ISO UTC; ID là UUID.

Từ thư mục repo `/Users/hanguyen/Downloads/fishing-world-online`: `rtk pnpm --filter @fwo/contracts typecheck` và `rtk pnpm --filter @fwo/contracts test`. Request gameplay chỉ chứa hành động, không chứa kết quả. API cần kiểm tra ownership, idempotency và expectedVersion ngoài validation shape.
