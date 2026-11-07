import type { ZodError } from 'zod';

export interface ValidationDetails {
  fields?: Record<string, string[]>;
  formErrors?: string[];
}
export interface AjvIssue {
  instancePath: string;
  keyword: string;
  params: Record<string, unknown>;
  message?: string;
}
const labels: Record<string, string> = {
  email: 'Email',
  password: 'Mật khẩu',
  username: 'Tên nhân vật',
  acceptTerms: 'Điều khoản',
  token: 'Liên kết đặt lại mật khẩu',
};
const labelFor = (path: string) => labels[path] ?? 'Giá trị';
function collect(
  entries: Array<{ path: string; message: string }>,
): ValidationDetails {
  const fields = new Map<string, string[]>();
  const formErrors: string[] = [];
  for (const entry of entries) {
    if (!entry.path) {
      if (!formErrors.includes(entry.message)) formErrors.push(entry.message);
      continue;
    }
    const messages = fields.get(entry.path) ?? [];
    if (!messages.includes(entry.message)) messages.push(entry.message);
    fields.set(entry.path, messages);
  }
  return {
    ...(fields.size ? { fields: Object.fromEntries(fields) } : {}),
    ...(formErrors.length ? { formErrors } : {}),
  };
}
export function zodValidationDetails(error: ZodError): ValidationDetails {
  return collect(
    error.issues.map((issue) => {
      const path = issue.path.map(String).join('.');
      let message = issue.message;
      if (issue.code === 'invalid_type')
        message = `Vui lòng nhập ${labelFor(path).toLowerCase()} hợp lệ.`;
      if (issue.code === 'invalid_format')
        message =
          path === 'email'
            ? 'Email không hợp lệ.'
            : 'Giá trị không đúng định dạng.';
      if (issue.code === 'invalid_value' && path === 'acceptTerms')
        message = 'Bạn cần đồng ý với điều khoản sử dụng.';
      if (issue.code === 'unrecognized_keys')
        message = 'Dữ liệu gửi lên chứa trường không được chấp nhận.';
      return { path, message };
    }),
  );
}
export function ajvValidationDetails(issues: AjvIssue[]): ValidationDetails {
  return collect(
    issues.map((issue) => {
      const parts = issue.instancePath
        .split('/')
        .slice(1)
        .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
      const extra =
        issue.keyword === 'required'
          ? issue.params.missingProperty
          : issue.keyword === 'additionalProperties'
            ? issue.params.additionalProperty
            : undefined;
      if (typeof extra === 'string') parts.push(extra);
      const path = parts.join('.');
      const label = labelFor(path);
      let message = issue.message ?? 'Giá trị không hợp lệ.';
      if (issue.keyword === 'required')
        message =
          path === 'acceptTerms'
            ? 'Bạn cần đồng ý với điều khoản sử dụng.'
            : `Vui lòng nhập ${label.toLowerCase()}.`;
      if (issue.keyword === 'minLength')
        message = `${label} cần ít nhất ${String(issue.params.limit)} ký tự.`;
      if (issue.keyword === 'maxLength')
        message = `${label} không được vượt quá ${String(issue.params.limit)} ký tự.`;
      if (issue.keyword === 'format')
        message =
          path === 'email'
            ? 'Email không hợp lệ.'
            : 'Giá trị không đúng định dạng.';
      if (issue.keyword === 'type') message = `${label} không đúng định dạng.`;
      if (issue.keyword === 'pattern')
        message = `${label} không đúng định dạng.`;
      if (issue.keyword === 'const' && path === 'acceptTerms')
        message = 'Bạn cần đồng ý với điều khoản sử dụng.';
      if (issue.keyword === 'additionalProperties')
        message = 'Trường này không được chấp nhận.';
      return { path, message };
    }),
  );
}
/** Only known account constraints become auth field errors; unrelated unique constraints stay generic. */
export function accountConflictDetails(
  target: unknown,
):
  | { code: string; message: string; fields: Record<string, string[]> }
  | undefined {
  function constraintNames(value: unknown, depth = 0): string {
    if (depth > 6) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value))
      return value
        .filter((item): item is string => typeof item === 'string')
        .join(' ');
    if (!value || typeof value !== 'object') return '';
    const metadata = value as Record<string, unknown>;
    // Prisma 7 adapter-pg nests constraints under driverAdapterError.cause.constraint.
    return [
      'target',
      'constraint',
      'fields',
      'index',
      'cause',
      'driverAdapterError',
    ]
      .map((key) => constraintNames(metadata[key], depth + 1))
      .join(' ');
  }
  const names = constraintNames(target);
  if (/email_normalized|emailNormalized/i.test(names))
    return {
      code: 'EMAIL_UNAVAILABLE',
      message: 'Email này đã được sử dụng.',
      fields: { email: ['Email này đã được sử dụng.'] },
    };
  if (/phone_e164|phoneE164/i.test(names))
    return {
      code: 'PHONE_UNAVAILABLE',
      message: 'Số điện thoại này đã được sử dụng.',
      fields: { phone: ['Số điện thoại này đã được sử dụng.'] },
    };
  if (/normalized_username|normalizedUsername/i.test(names))
    return {
      code: 'USERNAME_UNAVAILABLE',
      message: 'Tên nhân vật này đã được sử dụng.',
      fields: { username: ['Tên nhân vật này đã được sử dụng.'] },
    };
  return undefined;
}
