// AKBANK Hash Format Diagnostic - Try all key interpretations
require('dotenv').config();
const crypto = require('crypto');
const https  = require('https');

const secretKey     = process.env.AKBANK_SECRET_KEY;
const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;
const refundUrl     = process.env.AKBANK_REFUND_URL;

// Key candidates to test
const keyHex    = Buffer.from(secretKey, 'hex');          // 64 bytes (hex-decoded)
const keyUtf8   = Buffer.from(secretKey, 'utf8');         // 128 bytes (raw string)
const keyBase64 = Buffer.from(secretKey, 'base64');       // attempt base64 decode

console.log('Key lengths - hex:', keyHex.length, '| utf8:', keyUtf8.length, '| base64:', keyBase64.length);

function makePayload() {
  return JSON.stringify({
    version: '1.00',
    txnCode: '1002',
    requestDateTime: new Date().toISOString().replace('Z', ''),
    randomNumber: crypto.randomBytes(64).toString('hex').toUpperCase(),
    terminal: { merchantSafeId, terminalSafeId },
    order: { orderId: 'TEST-ORDER-12345' },
    customer: { emailAddress: 'test@birebiro.com' },
    transaction: { amount: '10.00', currencyCode: '949' },
  });
}

function callAkbank(label, keyBuffer, body) {
  return new Promise((resolve) => {
    const hash = crypto.createHmac('sha512', keyBuffer).update(Buffer.from(body, 'utf8')).digest('base64');
    const url  = new URL(refundUrl);
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
        console.log(`[${label}] HTTP ${res.statusCode} → ${raw.trim()}`);
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
  const body = makePayload();
  await callAkbank('hex-key (64B)', keyHex, body);

  const body2 = makePayload();
  await callAkbank('utf8-key (128B)', keyUtf8, body2);

  const body3 = makePayload();
  await callAkbank('base64-key', keyBase64, body3);
})();
