import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE = process.env.BAFL_BASE_URL!;
const MID = process.env.BAFL_MERCHANT_ID!;
const PW = process.env.BAFL_API_PASSWORD!;
const V = process.env.BAFL_API_VERSION || '100';
const AUTH = 'Basic ' + Buffer.from(`merchant.${MID}:${PW}`).toString('base64');

const recent = await prisma.payment.findMany({
  where: { NOT: { orderId: null } },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { orderId: true, status: true, amount: true, bookingId: true, createdAt: true },
});

for (const p of recent) {
  console.log('\n──', p.orderId, '| db status:', p.status, '| PKR', p.amount, '|', p.createdAt.toISOString().slice(0, 16));
  const r = await fetch(`${BASE}/api/rest/version/${V}/merchant/${MID}/order/${p.orderId}`, {
    headers: { Authorization: AUTH },
  });
  const o: any = await r.json();
  if (o?.error) { console.log('   gateway error:', JSON.stringify(o.error)); continue; }
  console.log('   order status :', o.status, '| result:', o.result);
  for (const t of o.transaction ?? []) {
    console.log('   txn', t.transaction?.id, '→', t.result,
      '| gatewayCode:', t.response?.gatewayCode,
      '| acquirer:', t.response?.acquirerCode, t.response?.acquirerMessage ?? '');
    if (t.authentication) {
      console.log('     3DS version:', t.authentication.version, '| status:', t.authentication['3ds']?.transactionStatus ?? t.authentication.transactionStatus);
    }
    if (t.sourceOfFunds?.provided?.card) {
      const c = t.sourceOfFunds.provided.card;
      console.log('     card:', c.brand, c.number, 'expiry', c.expiry?.month + '/' + c.expiry?.year);
    }
  }
}
await prisma.$disconnect();
