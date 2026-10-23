import 'dotenv/config';

const BASE = process.env.BAFL_BASE_URL!;
const MID = process.env.BAFL_MERCHANT_ID!;
const PW = process.env.BAFL_API_PASSWORD!;
const V = process.env.BAFL_API_VERSION || '100';
const AUTH = 'Basic ' + Buffer.from(`merchant.${MID}:${PW}`).toString('base64');
const SELF = process.env.SELF_URL || 'http://localhost:4000';

// MPGS test acquirers usually decide the response from the AMOUNT, so make one
// checkout session per candidate amount and see which one the bank approves.
const amounts = process.argv.slice(2).length ? process.argv.slice(2) : ['100.00', '1000.00', '1785.00'];

for (const amount of amounts) {
  const orderId = 'TEST-' + amount.replace('.', '') + '-' + Date.now().toString().slice(-5);
  const r = await fetch(`${BASE}/api/rest/version/${V}/merchant/${MID}/session`, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiOperation: 'INITIATE_CHECKOUT',
      interaction: {
        operation: 'PURCHASE',
        returnUrl: `${SELF}/payments/return?order=${orderId}`,
        merchant: { name: 'uroojwithus' },
        displayControl: { billingAddress: 'HIDE', customerEmail: 'HIDE', shipping: 'HIDE' },
      },
      order: { id: orderId, amount, currency: 'PKR', description: 'amount probe' },
    }),
  });
  const j: any = await r.json();
  if (j.result !== 'SUCCESS') { console.log(amount, '→ session failed', JSON.stringify(j.error ?? j)); continue; }
  console.log(`PKR ${amount.padStart(8)}  →  ${BASE}/checkout/pay/${j.session.id}`);
}
