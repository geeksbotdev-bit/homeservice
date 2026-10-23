/**
 * Load just the service catalogue — no demo users, cleaners or bookings.
 * Safe to run against a database that has real customers in it.
 */
import { PrismaClient } from '@prisma/client';
import { seedServices } from './services.js';

const prisma = new PrismaClient();

seedServices(prisma)
  .then(async (added) => {
    const total = await prisma.service.count();
    console.log(`✅ ${added} service(s) added · ${total} in the catalogue`);
  })
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
