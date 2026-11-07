---
name: fwo-form-validation
description: Implement consistent Fishing World Online forms with shared native validation, inline red field errors, server field mapping, accessible required labels and an eight-character minimum for new passwords.
---

# Validation tại field, dùng chung giữa web và admin

Đọc [forms.tsx](../../../packages/ui/src/forms.tsx), [validation.ts](../../../packages/ui/src/validation.ts), [ApiError](../../../packages/ui/src/http.ts) và schema tương ứng trong [contracts](../../../packages/contracts/src/index.ts) hoặc API module. Tái sử dụng `Form`, `FormField`, `FormError`; không viết hệ thống touched/error thứ hai tại mỗi màn.

- Đặt `name` ổn định trùng key request trên input/select/textarea. Bao field bằng `FormField`; khai báo `required`, `type`, `minLength`/`maxLength`, `min`/`max`, `step`, `pattern` theo contract. Shared field hiển thị required mark, `aria-invalid`, `aria-describedby`, viền đỏ và thông báo ngôn ngữ hiện hành.
- `Form` nhận `error` từ mutation và kiểm tra validity khi submit, focus field lỗi đầu tiên; `FormField` cập nhật lỗi khi blur/input. Dùng `FormError` gần submit cho lỗi form-wide không gắn được vào field. Không dùng native popup hoặc toast thay thông báo validation tại field.
- Giữ submit khả dụng để người dùng thấy lỗi khi thiếu/sai dữ liệu; chỉ disable vì đang gửi hoặc không có quyền/đối tượng thực hiện. Modal footer bên ngoài form dùng `form={formId}` và `type="submit"`, không gọi mutation trực tiếp bằng onClick để bỏ qua validation.
- Mật khẩu mới: tối thiểu **8**, tối đa **128** ký tự; login/reset/register phải nhất quán với contract hiện tại. Không tự đổi password policy hoặc các giới hạn khác chỉ ở frontend.
- Number input phải giữ chuỗi rỗng khi bị xóa; chỉ chuyển thành Number khi có giá trị. Không biến ô trống thành `0`, nhất là field có min=0. Number nguyên dùng step=1; chỉ cho thập phân khi schema cho phép.
- Server trả `ApiError.fields: Record<string,string[]>`; field matching dùng name và nested path. Giữ lỗi có cấu trúc khi bắt exception, không chỉ lấy `.message` rồi làm mất field mapping. JSON sai cú pháp gắn vào textarea `item`/`value` qua `ApiError` fields hoặc `FormField.error`.
- Validation client phục vụ UX; server vẫn validate/authorize. Kiểm tra lỗi liên quan nhiều field (ví dụ min/base/max weight) tại đúng các field hoặc form-wide khi không có một field phù hợp.

Ví dụ modal: body là `<Form id={formId} error={save.error} onSubmit={submit}>…<FormError error={save.error}/></Form>`; nút footer là `<Button type="submit" form={formId} loading={save.isPending}>Lưu</Button>`.

Nghiệm thu tối thiểu: submit rỗng, email sai, password 7/8 ký tự khi field liên quan bị đổi, number ngoài giới hạn, lỗi server tại field và sửa lại thành hợp lệ; kiểm tra cả modal footer. Chạy typecheck của app và regression liên quan theo [verification](../fwo-verification/SKILL.md).
