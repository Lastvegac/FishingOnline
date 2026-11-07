import { z } from 'zod';
import { passwordSchema } from '@fwo/contracts';

/** Separate validation from the executable bootstrap CLI so it can be checked without DB side effects. */
export const bootstrapAdminEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: passwordSchema,
  ADMIN_USERNAME: z.string().min(3).max(24),
});
