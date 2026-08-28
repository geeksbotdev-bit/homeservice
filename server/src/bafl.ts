// Bank Alfalah — Mastercard Payment Gateway Services (MPGS) Hosted Checkout.
const BASE = process.env.BAFL_BASE_URL || 'https://test-bankalfalah.gateway.mastercard.com';
const MID = process.env.BAFL_MERCHANT_ID || 'TESTCHASKA';
const PW = process.env.BAFL_API_PASSWORD || '';
const V = process.env.BAFL_API_VERSION || '100';
const AUTH = 'Basic ' + Buffer.from(`merchant.${MID}:${PW}`).toString('base64');

async function mpgs(path: string, method: 'GET' | 'POST' | 'PUT', body?: any): Promise<any> {
  const r = await fetch(`${BASE}/api/rest/version/${V}/merchant/${MID}${path}`, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json().catch(() => ({}));
}

/** Create a Hosted Checkout session for an order. */
export function createCheckoutSession(orderId: string, amount: number, returnUrl: string) {
  return mpgs('/session', 'POST', {
    apiOperation: 'INITIATE_CHECKOUT',
    interaction: { operation: 'PURCHASE', returnUrl, merchant: { name: 'HomeService' } },
    order: { id: orderId, amount: amount.toFixed(2), currency: 'PKR', description: 'HomeService cleaning booking' },
  });
}

/** Retrieve an order to confirm the payment outcome server-side. */
export function retrieveOrder(orderId: string) {
  return mpgs(`/order/${orderId}`, 'GET');
}

/** Refund a captured order (partial or full) via the gateway. */
export function refundOrder(orderId: string, txnId: string, amount: number) {
  return mpgs(`/order/${orderId}/transaction/refund-${txnId}`, 'PUT', {
    apiOperation: 'REFUND',
    transaction: { amount: amount.toFixed(2), currency: 'PKR' },
  });
}

/** The Checkout.js launcher page that redirects the browser to the gateway. */
export function launcherHtml(sessionId: string, cancelUrl: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Redirecting to secure payment…</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F7F9FA;color:#1F2937;text-align:center;padding-top:80px}
.s{width:34px;height:34px;border:3px solid #E6F4F4;border-top-color:#0B7C82;border-radius:50%;margin:0 auto 18px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}</style>
<script src="${BASE}/static/checkout/checkout.min.js"
  data-error="errorCallback" data-cancel="${cancelUrl}"></script>
<script>
  function errorCallback(err){ document.getElementById('msg').textContent='Payment could not start. Please try again.'; }
  Checkout.configure({ session: { id: '${sessionId}' } });
  window.addEventListener('load', function(){ try { Checkout.showPaymentPage(); } catch(e) { errorCallback(e); } });
</script></head>
<body><div class="s"></div><div id="msg">Redirecting to secure Bank Alfalah checkout…</div></body></html>`;
}
