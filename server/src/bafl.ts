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

const MERCHANT_LOGO = process.env.BAFL_MERCHANT_LOGO || '';

/** Create a Hosted Checkout session for an order. */
export function createCheckoutSession(orderId: string, amount: number, returnUrl: string) {
  return mpgs('/session', 'POST', {
    apiOperation: 'INITIATE_CHECKOUT',
    interaction: {
      operation: 'PURCHASE',
      returnUrl,
      locale: 'en_US',
      merchant: {
        name: 'uroojwithus',
        ...(MERCHANT_LOGO ? { logo: MERCHANT_LOGO } : {}),
      },
      // Hide the optional/clutter sections so the page stays clean.
      displayControl: {
        billingAddress: 'HIDE',
        customerEmail: 'HIDE',
        shipping: 'HIDE',
      },
    },
    order: { id: orderId, amount: amount.toFixed(2), currency: 'PKR', description: 'uroojwithus cleaning booking' },
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

/** The Checkout.js launcher — renders the card form EMBEDDED (in-app), so the
 *  customer never leaves for a separate web page. On completion it returns to
 *  `returnUrl` (server verifies the outcome there). */
export function launcherHtml(sessionId: string, cancelUrl: string, returnUrl: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>uroojwithus — Secure Payment</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F7F9FA;color:#1F2937}
  .top{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff;border-bottom:1px solid #EDF0F2}
  .brand{display:flex;align-items:center;gap:8px}
  .mark{width:30px;height:30px;border-radius:8px;background:#0B7C82;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}
  .brand b{font-size:15px;color:#0B7C82}
  .lock{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#16A34A;font-weight:700}
  .lock svg{width:12px;height:12px}
  #embed{min-height:calc(100vh - 60px)}
  #err{display:none;padding:28px 20px;text-align:center;color:#DC2626;font-size:14px}
</style>
<script src="${BASE}/static/checkout/checkout.min.js"
  data-error="errorCallback" data-cancel="${cancelUrl}" data-complete="completeCallback"></script>
<script>
  function errorCallback(err){ var e=document.getElementById('err'); if(e){ e.style.display='block'; e.textContent='Payment could not start. Please go back and try again.'; } }
  function completeCallback(resultIndicator){ window.location.href='${returnUrl}' + (resultIndicator ? ('&resultIndicator=' + encodeURIComponent(resultIndicator)) : ''); }
  Checkout.configure({ session: { id: '${sessionId}' } });
  window.addEventListener('load', function(){ try { Checkout.showEmbeddedPage('#embed'); } catch(e) { errorCallback(e); } });
</script></head>
<body>
  <div class="top">
    <div class="brand"><div class="mark">UW</div><b>uroojwithus</b></div>
    <div class="lock"><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Secure payment</div>
  </div>
  <div id="err"></div>
  <div id="embed"></div>
</body></html>`;
}
