require('dotenv').config({ path: '/Users/denizcanilgin/Documents/birebiro-new-admin/api/.env' });
const crypto = require('crypto');
const https = require('https');

const secretKey = process.env.AKBANK_SECRET_KEY;
const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;
const refundUrl = process.env.AKBANK_REFUND_URL;
const orderId = 'BRB17737480332395985';

function keyCandidates(raw) {
  const out = [];
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) out.push(raw);
  const decoded = /^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0 ? Buffer.from(raw, 'hex').toString('utf8') : raw;
  if (decoded && !out.includes(decoded)) out.push(decoded);
  return out;
}

function hmacBase64(input, key) {
  const keyBuffer = /^[0-9a-fA-F]+$/.test(key) && key.length % 2 === 0
    ? Buffer.from(key, 'hex')
    : Buffer.from(key, 'utf8');
  return crypto.createHmac('sha512', keyBuffer).update(Buffer.from(input, 'utf8')).digest('base64');
}

function toS(v) { return v === undefined || v === null ? '' : String(v); }
function hashItems(payload) {
  const t = payload.transaction || {};
  const c = payload.customer || {};
  const tr = payload.terminal || {};
  const o = payload.order || {};
  return (
    toS(payload.paymentModel) + toS(payload.txnCode) + toS(tr.merchantSafeId) + toS(tr.terminalSafeId) +
    toS(o.orderId) + toS(payload.lang) + toS(t.amount) + toS(t.ccbRewardAmount) + toS(t.pcbRewardAmount) +
    toS(t.xcbRewardAmount) + toS(t.currencyCode) + toS(t.installCount) + toS(payload.okUrl) + toS(payload.failUrl) +
    toS(c.emailAddress) + toS(c.mobilePhone) + toS(c.homePhone) + toS(c.workPhone) + toS(payload.subMerchantId) +
    toS(payload.creditCard) + toS(payload.expiredDate) + toS(payload.cvv) + toS(payload.cardHolderName) +
    toS(payload.randomNumber) + toS(payload.requestDateTime) + toS(payload.b2bIdentityNumber) + toS(payload.merchantData) +
    toS(payload.merchantBranchNo) + toS(payload.mobileEci) + toS(payload.walletProgramData) +
    toS(payload.mobileAssignedId) + toS(payload.mobileDeviceType)
  );
}

function post(body, authHash) {
  return new Promise((resolve) => {
    const url = new URL(refundUrl);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'auth-hash': authHash,
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, raw }));
    });
    req.on('error', (e) => resolve({ status: -1, raw: e.message }));
    req.write(body);
    req.end();
  });
}

const dateNoMs = () => new Date().toISOString().replace(/\.\d{3}Z$/, '');
const random = () => crypto.randomBytes(64).toString('hex').toUpperCase();

const base = {
  version: '1.00',
  txnCode: '1002',
  requestDateTime: dateNoMs(),
  randomNumber: random(),
  terminal: { merchantSafeId, terminalSafeId },
  order: { orderId },
  customer: { emailAddress: 'denizcanilgin@gmail.com' },
};

const payloads = [
  { name: 'A-minimal', body: { ...base } },
  { name: 'B-amount-str-949', body: { ...base, transaction: { amount: '1.00', currencyCode: '949' } } },
  { name: 'C-amount-num-949', body: { ...base, transaction: { amount: '1.00', currencyCode: 949 } } },
  { name: 'D-lang-tr', body: { ...base, lang: 'tr', transaction: { amount: '1.00', currencyCode: '949' } } },
  { name: 'E-lang-TR', body: { ...base, lang: 'TR', transaction: { amount: '1.00', currencyCode: '949' } } },
  { name: 'F-paymentModel+lang', body: { ...base, paymentModel: '3D_PAY', lang: 'tr', transaction: { amount: '1.00', currencyCode: '949' } } },
  { name: 'G-full-fields-empty', body: {
    ...base,
    paymentModel: '', lang: 'tr', okUrl: '', failUrl: '', subMerchantId: '', creditCard: '', expiredDate: '', cvv: '', cardHolderName: '',
    b2bIdentityNumber: '', merchantData: '', merchantBranchNo: '', mobileEci: '', walletProgramData: '', mobileAssignedId: '', mobileDeviceType: '',
    customer: { emailAddress: 'denizcanilgin@gmail.com', mobilePhone: '', homePhone: '', workPhone: '' },
    transaction: { amount: '1.00', ccbRewardAmount: '', pcbRewardAmount: '', xcbRewardAmount: '', currencyCode: '949', installCount: '' },
  } },
];

(async () => {
  const keys = keyCandidates(secretKey);
  for (const p of payloads) {
    const json = JSON.stringify(p.body);
    for (const k of keys) {
      const h1 = hmacBase64(hashItems(p.body), k);
      const r1 = await post(json, h1);
      console.log(`${p.name} | hashItems | keyLen=${k.length} => HTTP ${r1.status} ${r1.raw}`);

      const h2 = hmacBase64(json, k);
      const r2 = await post(json, h2);
      console.log(`${p.name} | jsonBody  | keyLen=${k.length} => HTTP ${r2.status} ${r2.raw}`);
    }
  }
})();
