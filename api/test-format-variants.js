// AKBANK format diagnostic — try different payload structures
require('dotenv').config({ path: '/Users/denizcanilgin/Documents/birebiro-new-admin/api/.env' });
const crypto = require('crypto');
const https  = require('https');

const secretKey      = process.env.AKBANK_SECRET_KEY;
const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;
const refundUrl      = process.env.AKBANK_REFUND_URL;

const keyBuffer = Buffer.from(secretKey, 'hex');

function hashBody(body) {
  return crypto.createHmac('sha512', keyBuffer).update(Buffer.from(body, 'utf8')).digest('base64');
}

function callAkbank(label, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const hash = hashBody(body);
    const url  = new URL(refundUrl);
    console.log(`\n[${label}] Body: ${body}`);
    const req  = https.request({
      hostname: url.hostname, port: 443, path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'auth-hash': hash,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        console.log(`[${label}] HTTP ${res.statusCode}`);
        try { console.log(JSON.stringify(JSON.parse(raw), null, 2)); }
        catch { console.log(raw); }
        resolve(res.statusCode);
      });
    });
    req.on('error', (e) => { console.error(`[${label}] Error:`, e.message); resolve(-1); });
    req.setTimeout(12000, () => { req.destroy(); resolve(-1); });
    req.write(body);
    req.end();
  });
}

(async () => {
  const random = () => crypto.randomBytes(64).toString('hex').toUpperCase();
  const dt     = () => new Date().toISOString().replace('Z', '');

  // Attempt 1: Full refund (no transaction block) — AKBANK might not need amount for full refund
  await callAkbank('full-refund-no-tx', {
    version: '1.00',
    txnCode: '1002',
    requestDateTime: dt(),
    randomNumber: random(),
    terminal: { merchantSafeId, terminalSafeId },
    order: { orderId: 'TEST-ORDER-12345' },
    customer: { emailAddress: 'test@birebiro.com' },
  });

  // Attempt 2: With numeric currencyCode (949)
  await callAkbank('partial-num-currency', {
    version: '1.00',
    txnCode: '1002',
    requestDateTime: dt(),
    randomNumber: random(),
    terminal: { merchantSafeId, terminalSafeId },
    order: { orderId: 'TEST-ORDER-12345' },
    customer: { emailAddress: 'test@birebiro.com' },
    transaction: { amount: '10.00', currencyCode: 949 },
  });

  // Attempt 3: With string currencyCode ("949")
  await callAkbank('partial-str-currency', {
    version: '1.00',
    txnCode: '1002',
    requestDateTime: dt(),
    randomNumber: random(),
    terminal: { merchantSafeId, terminalSafeId },
    order: { orderId: 'TEST-ORDER-12345' },
    customer: { emailAddress: 'test@birebiro.com' },
    transaction: { amount: '10.00', currencyCode: '949' },
  });

  // Attempt 4: amount as integer cents (1000 = 10 TL)
  await callAkbank('amount-as-integer', {
    version: '1.00',
    txnCode: '1002',
    requestDateTime: dt(),
    randomNumber: random(),
    terminal: { merchantSafeId, terminalSafeId },
    order: { orderId: 'TEST-ORDER-12345' },
    customer: { emailAddress: 'test@birebiro.com' },
    transaction: { amount: 1000, currencyCode: '949' },
  });
})();
