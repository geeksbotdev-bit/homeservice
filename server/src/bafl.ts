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

/**
 * The Checkout.js launcher.
 *
 * It REDIRECTS to the bank's hosted card page (`showPaymentPage`) — the
 * embedded mode cannot work: the gateway serves its checkout with
 * `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`, so the iframe it
 * creates on our page is blocked by the browser and the form stays blank.
 * On completion the bank returns to `returnUrl`, where the server verifies the
 * outcome and bounces back into the app.
 */
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
  function errorCallback(err){
    var e=document.getElementById('err');
    if(e){ e.style.display='block'; e.textContent='Payment could not start. Please go back and try again.'; }
    var s=document.getElementById('spin'); if(s){ s.style.display='none'; }
  }
  function completeCallback(resultIndicator){ window.location.href='${returnUrl}' + (resultIndicator ? ('&resultIndicator=' + encodeURIComponent(resultIndicator)) : ''); }
  Checkout.configure({ session: { id: '${sessionId}' } });
  // Full-page redirect to the bank's card form (embedding is blocked by the
  // gateway's own X-Frame-Options / frame-ancestors headers).
  window.addEventListener('load', function(){ try { Checkout.showPaymentPage(); } catch(e) { errorCallback(e); } });
</script></head>
<body>
  <div class="top">
    <div class="brand"><div class="mark">UW</div><b>uroojwithus</b></div>
    <div class="lock"><svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Secure payment</div>
  </div>
  <div id="err"></div>
  <div id="spin" style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:70px 20px;color:#6B7280;font-size:14px">
    <div style="width:34px;height:34px;border:3px solid #E5E7EB;border-top-color:#0B7C82;border-radius:50%;animation:sp 0.9s linear infinite"></div>
    Taking you to the secure card page…
    <style>@keyframes sp{to{transform:rotate(360deg)}}</style>
  </div>
</body></html>`;
}
