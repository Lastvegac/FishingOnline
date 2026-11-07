export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message = code,
    public details?: {
      fields?: Record<string, string[]>;
      formErrors?: string[];
    },
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  status: number,
  code: string,
  message?: string,
): asserts condition {
  if (!condition) throw new ApiError(status, code, message);
}
