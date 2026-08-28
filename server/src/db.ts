import { PrismaClient } from '@prisma/client';

/**
 * Lazy Prisma client. On serverless (Vercel) we must NOT construct the client
 * at module-load time — a heavy/native init at import can crash the whole
 * function before any route runs. The Proxy defers `new PrismaClient()` to the
 * first actual query, so routes that don't touch the DB (e.g. /health) always
 * work, and any real DB error surfaces as a catchable request error.
 */
let _client: PrismaClient | null = null;
function client(): PrismaClient {
  if (!_client) _client = new PrismaClient();
  return _client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = client() as any;
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});
