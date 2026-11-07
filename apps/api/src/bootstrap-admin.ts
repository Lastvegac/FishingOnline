import 'dotenv/config';
import argon2 from 'argon2';
import { createDatabase } from './db.js';
import { initializePlayer } from './modules/players/service.js';
import { bootstrapAdminEnvSchema } from './lib/bootstrap-config.js';

const input = bootstrapAdminEnvSchema.parse(process.env);
const db = createDatabase(input.DATABASE_URL);
try {
  const passwordHash = await argon2.hash(input.ADMIN_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:bootstrap-admin'))`;
    if (await tx.adminUser.count())
      throw new Error(
        'An admin already exists. Use the authenticated role-management workflow.',
      );
    const user = await tx.user.create({
      data: { emailNormalized: input.ADMIN_EMAIL.toLowerCase(), passwordHash },
    });
    await initializePlayer(tx, user.id, input.ADMIN_USERNAME, Date.now());
    await tx.adminUser.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorSnapshot: { source: 'BOOTSTRAP_CLI' },
        action: 'BOOTSTRAP_SUPER_ADMIN',
        targetType: 'User',
        targetId: user.id,
        requestId: 'bootstrap-cli',
        reason: 'Explicit operator bootstrap',
      },
    });
  });
  console.log(
    'Super Admin created. Remove ADMIN_PASSWORD from the shell environment after use.',
  );
} finally {
  await db.$disconnect();
}
