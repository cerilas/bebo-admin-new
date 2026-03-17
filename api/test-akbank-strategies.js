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
  const c = payload.customer || {};
  const tr = payload.terminal || {};
  const o = payload.order || {};
  return (
    toS(payload.paymentModel) +
    toS(payload.txnCode) +
    toS(tr.merchantSafeId) +
    toS(tr.terminalSafeId) +
    toS(o.orderId) +
    toS(payload.lang) +
    toS(t.amount) +
    toS(t.ccbRewardAmount) +
    toS(t.pcbRewardAmount) +
    toS(t.xcbRewardAmount) +
    toS(t.currencyCode) +
    toS(t.installCount) +
    toS(payload.okUrl) +
    toS(payload.failUrl) +
    toS(c.emailAddress) +
    toS(c.mobilePhone) +
    toS(c.homePhone) +
    toS(c.workPhone) +
    toS(payload.subMerchantId) +
    toS(payload.creditCard) +
    toS(payload.expiredDate) +
    toS(payload.cvv) +
    toS(payload.cardHolderName) +
    toS(payload.randomNumber) +
    toS(payload.requestDateTime) +
    toS(payload.b2bIdentityNumber) +
    toS(payload.merchantData) +
    toS(payload.merchantBranchNo) +
    toS(payload.mobileEci) +
    toS(payload.walletProgramData) +
    toS(payload.mobileAssignedId) +
    toS(payload.mobileDeviceType)
  );
}

function call(label, payload, hashStrategy) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const hashInput = hashStrategy === 'hashItems' ? hashItems(payload) : body;
    const hash = crypto.createHmac('sha512', keyBuffer).update(Buffer.from(hashInput, 'utf8')).digest('base64');
    
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
        console.log(`${label} [${hashStrategy}]: HTTP ${res.statusCode}`);
        if (res.statusCode >= 400) console.log(`  → ${raw}`);
        resolve();
      });
    });
    req.on('error', (e) => { console.error(e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  const basePayloads = [
    {
      name: 'A: Minimal (no empty fields)',
      payload: {
        version: '1.00',
        txnCode: '1002',
        requestDateTime: dt(),
        randomNumber: rand(),
        terminal: { merchantSafeId, terminalSafeId },
        order: { orderId },
        customer: { emailAddress: 'denizcanilgin@gmail.com' },
        transaction: { amount: '1.00', currencyCode: '949' },
      },
    },
    {
      name: 'B: Minimal + lang',
      payload: {
        version: '1.00',
        txnCode: '1002',
        lang: 'tr',
        requestDateTime: dt(),
        randomNumber: rand(),
        terminal: { merchantSafeId, terminalSafeId },
        order: { orderId },
        customer: { emailAddress: 'denizcanilgin@gmail.com' },
        transaction: { amount: '1.00', currencyCode: '949' },
      },
    },
    {
      name: 'C: All fields (current)',
      payload: {
        version: '1.00',
        paymentModel: '',
        txnCode: '1002',
        lang: 'tr',
        requestDateTime: dt(),
        randomNumber: rand(),
        terminal: { merchantSafeId, terminalSafeId },
        order: { orderId },
        customer: { emailAddress: 'denizcanilgin@gmail.com', mobilePhone: '', homePhone: '', workPhone: '' },
        okUrl: '',
        failUrl: '',
        subMerchantId: '',
        creditCard: '',
        expiredDate: '',
        cvv: '',
        cardHolderName: '',
        b2bIdentityNumber: '',
        merchantData: '',
        merchantBranchNo: '',
        mobileEci: '',
        walletProgramData: '',
        mobileAssignedId: '',
        mobileDeviceType: '',
        transaction: { amount: '1.00', ccbRewardAmount: '', pcbRewardAmount: '', xcbRewardAmount: '', currencyCode: '949', installCount: '' },
      },
    },
  ];

  for (const p of basePayloads) {
    console.log(`\n${p.name}`);
    await call(p.name, p.payload, 'hashItems');
    await call(p.name, p.payload, 'json-body');
  }
})();
