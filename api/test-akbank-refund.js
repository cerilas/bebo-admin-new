// AKBANK Sandbox Refund Test
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');

const secretKey    = process.env.AKBANK_SECRET_KEY;
const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;
const refundUrl    = process.env.AKBANK_REFUND_URL;

console.log('--- Config ---');
console.log('MERCHANT_SAFE_ID:', merchantSafeId);
console.log('TERMINAL_SAFE_ID:', terminalSafeId);
console.log('REFUND_URL      :', refundUrl);
console.log('SECRET_KEY (hex, first 20):', secretKey.substring(0, 20) + '...');

// Hex-decode the key (AKBANK secret keys are stored hex-encoded)
const keyBuffer = (/^[0-9a-fA-F]+$/.test(secretKey) && secretKey.length % 2 === 0)
  ? Buffer.from(secretKey, 'hex')
  : Buffer.from(secretKey, 'utf8');

console.log('Key buffer length:', keyBuffer.length, 'bytes');
console.log('Key decoded (first 20 chars):', keyBuffer.toString('utf8').substring(0, 20) + '...');

const randomNumber = crypto.randomBytes(64).toString('hex').toUpperCase();
const requestPayload = {
  version: '1.00',
  txnCode: '1002',
  requestDateTime: new Date().toISOString().replace('Z', ''),
  randomNumber,
  terminal: { merchantSafeId, terminalSafeId },
  order: { orderId: 'TEST-ORDER-12345' },
  customer: { emailAddress: 'test@birebiro.com' },
  transaction: { amount: '10.00', currencyCode: 949 },
};

const body = JSON.stringify(requestPayload);
const hash = crypto
  .createHmac('sha512', keyBuffer)
  .update(Buffer.from(body, 'utf8'))
  .digest('base64');

console.log('\n--- Request ---');
console.log('Body:', body);
console.log('auth-hash:', hash);

const url = new URL(refundUrl);
const req = https.request({
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
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
    console.log('\n--- Response ---');
    console.log('HTTP Status:', res.statusCode);
    console.log('auth-hash header:', res.headers['auth-hash'] || '(none)');
    try {
      console.log(JSON.stringify(JSON.parse(raw), null, 2));
    } catch (e) {
      console.log('Raw:', raw);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.setTimeout(15000, () => { req.destroy(); console.error('Timeout'); });
req.write(body);
req.end();
