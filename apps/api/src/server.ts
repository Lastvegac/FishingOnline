import 'dotenv/config';
import { buildApp } from './app.js';

const { app } = await buildApp();
const close = async () => {
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', close);
process.on('SIGINT', close);
await app.listen({
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '127.0.0.1',
});
