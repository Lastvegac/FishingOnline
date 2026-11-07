import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export function createDatabase(url: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
export type Database = ReturnType<typeof createDatabase>;
export type Tx = Prisma.TransactionClient;
export function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
  ) as Prisma.InputJsonValue;
}
export function plain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
  ) as T;
}
