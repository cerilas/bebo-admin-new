require('dotenv').config({ path: '/Users/denizcanilgin/Documents/birebiro-new-admin/api/.env' });
const https = require('https');
const crypto = require('crypto');

const url = process.env.AKBANK_REFUND_URL;
const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;
const secretKey = process.env.AKBANK_SECRET_KEY;
const orderId = 'BRB17737480332395985';

const keyBuffer = (/^[0-9a-fA-F]+$/.test(secretKey) && secretKey.length % 2 === 0)
  ? Buffer.from(secretKey, 'hex')
  : Buffer.from(secretKey, 'utf8');

const rand = () => crypto.randomBytes(64).toString('hex').toUpperCase();
const dt = () => new Date().toISOString().replace(/\.\d{3}Z$/, '');

function toS(v) { return v === undefined || v === null ? '' : String(v); }
function hashItems(payload) {
  const t = payload.transaction || {};
  const tr = payload.terminal || {};
  const o = payload.order || {};
  return (
    toS(payload.paymentModel) + toS(payload.txnCode) + toS(tr.merchantSafeId) + toS(tr.terminalSafeId) + toS(o.orderId) + toS(payload.lang) +
    toS(t.amount) + toS(t.ccbRewardAmount) + toS(t.pcbRewardAmount) + toS(t.xcbRewardAmount) + toS(t.currencyCode) + toS(t.installCount) +
    '' + '' + '' + '' + '' + '' + '' + '' + '' +
    toS(payload.randomNumber) + toS(payload.requestDateTime) + '' + '' + '' + '' + '' + ''
  );
}

function call(payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const hash = crypto.createHmac('sha512', keyBuffer).update(Buffer.from(hashItems(payload), 'utf8')).digest('base64');
    const endpoint = new URL(url);
    const req = https.request({
      hostname: endpoint.hostname,
      port: 443,
      path: endpoint.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'auth-hash': hash,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        console.log('status=', res.statusCode, 'body=', raw);
        resolve();
      });
    });
    req.on('error', (e) => { console.error(e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  const base = {
    version: '1.00',
    txnCode: '1002',
    requestDateTime: dt(),
    randomNumber: rand(),
    terminal: { merchantSafeId, terminalSafeId },
    order: { orderId },
  };

  console.log('\nA: no transaction');
  await call({ ...base });

  console.log('\nB: transaction amount=1.00');
  await call({ ...base, transaction: { amount: '1.00', currencyCode: '949' } });

  console.log('\nC: transaction amount=100');
  await call({ ...base, transaction: { amount: '100', currencyCode: '949' } });

  console.log('\nD: transaction amount int 100');
  await call({ ...base, transaction: { amount: 100, currencyCode: 949 } });
})();
