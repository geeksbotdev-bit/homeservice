import 'dotenv/config';

const BASE = process.env.BAFL_BASE_URL || 'https://test-bankalfalah.gateway.mastercard.com';
const MID = process.env.BAFL_MERCHANT_ID || 'TESTCHASKA';
const PW = process.env.BAFL_API_PASSWORD || '';
const V = process.env.BAFL_API_VERSION || '100';
const AUTH = 'Basic ' + Buffer.from(`merchant.${MID}:${PW}`).toString('base64');

async function mpgs(path: string, method: 'GET' | 'POST' | 'PUT', body?: any) {
  const r = await fetch(`${BASE}/api/rest/version/${V}/merchant/${MID}${path}`, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return { status: r.status, json: JSON.parse(text) }; } catch { return { status: r.status, text: text.slice(0, 300) }; }
}

// What can this merchant actually accept? (card types, currencies)
console.log('── paymentOptionsInquiry');
console.log(JSON.stringify(await mpgs('/paymentOptionsInquiry', 'POST', { apiOperation: 'PAYMENT_OPTIONS_INQUIRY' }), null, 2).slice(0, 2500));
