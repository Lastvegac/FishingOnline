# Auth và user session

Routes register/login/refresh/logout/forgot-password/reset-password, profile và quản lý sessions. Hash Argon2id; refresh token hash trong Postgres; cookie readable fwo-csrf là HMAC bind refresh token, header phải khớp cookie và Origin allowlist. Refresh dùng user lock, rotation một lần; reuse revoke cả family. Logout/reset/revoke cũng user lock để không bỏ sót refresh child mới.

Mật khẩu đăng ký/đăng nhập/đặt lại/bootstrap và xác nhận quyền admin dùng chung chính sách 8–128 ký tự. Sau khi input hợp lệ, login trả lỗi thông tin đăng nhập chung, không tiết lộ tài khoản tồn tại hay email/mật khẩu nào sai. Lỗi validation trả `fields: Record<string,string[]>` cho từng trường; lỗi toàn form dùng `formErrors`.

Đăng ký tạo user/profile/200Gold-ledger/wood rod+line+hook/20worm trong một transaction. Chỉ email/password phát triển nội bộ, không coi là đủ cho public Việt Nam. SMTP transport verify và send thật; chưa cấu hình trả503. Reset token TTL30 phút one-use, đổi mật khẩu revoke tất cả session families. Không trả reset token qua API hoặc logs.

Nghiệm thu: integration hash/starter state, CSRF, refresh reuse/revocation, reset one-use/old JWT rejection; HTTP strict schemas chặn role/Gold injection. IP budgets độc lập với account-hash budgets (login10/5phút, reset3/giờ); Redis shared ở production, local memory giới hạn chỉ dùng phát triển. MFA vẫn cần hoàn thiện trước public. Không tự cấp role khi register.

## OTP, số điện thoại, Google (07/11/2026)

- Đăng ký 2 bước: thông tin hợp lệ + kiểm tra trùng → gửi OTP 6 số (crypto.randomInt) qua email (SMTP) hoặc SMS (webhook HTTPS `SMS_WEBHOOK_URL`) → verify tạo tài khoản. Chỉ lưu HMAC(JWT_SECRET, challengeId:code); payload chờ (argon2 hash, username) bị xoá khi dùng. TTL 10 phút, 5 lần sai thì khoá, gửi lại ≥60 giây và ≤5 lần, 5 OTP/giờ/đích + giới hạn IP.
- Mã sai được đếm sau rollback (`otp.guard`), mã đúng được consume trong cùng transaction với thay đổi; idempotent replay trả kết quả cũ.
- Phone: số di động VN chuẩn hoá E.164 `+84…`, unique, đăng nhập phone+password, forgot gửi link qua SMS.
- Google: verify ID token bằng JWKS Google (`jose`), yêu cầu `email_verified`; không tự liên kết với email đã tồn tại. Tài khoản Google không có mật khẩu (có thể đặt qua forgot-password).
- Hồ sơ: chỉ tên cần thủ/avatar, mọi thay đổi cần OTP gửi email (hoặc SMS nếu không có email). Email bất biến: schema strict từ chối, không có endpoint đổi, trigger `immutable_user_email` chặn UPDATE.
- `OTP_DEV_OUTBOX=true` chỉ cho local/E2E (`GET /api/v1/dev/otp-outbox?to=`); app từ chối khởi động production với cờ này.

Phiên web: access JWT chỉ trong memory, refresh cookie giữ qua reload. Client refresh trước hạn 60 giây/401; network/429/5xx không logout. Web Locks serialize rotation cùng origin (browser thiếu Web Locks chỉ có single-flight trong tab).

Hết hạn tự nhiên giữ leaf family chưa revoked để quyền kết thúc lượt câu tiếp tục hoạt động; không gia hạn refresh đã hết hạn. `fishing-access.ts` cấp grant cookie HttpOnly riêng, purpose/bind user/family/session/deadline cố định; fallback chỉ trên route opt-in. `GET /auth/fishing-resume` trả PlayerDto để khôi phục màn câu sau reload. Grant không dùng như bearer hoặc cho payment socket; CSRF HMAC + Origin cho mutation, kiểm lại family/account dưới player lock. Logout/sign-in xóa cookie grant; reuse/reset/revoke/khóa account chặn grant ngay. Xem IMPLEMENTATION_CONTRACT cho danh sách endpoint và TTL.
