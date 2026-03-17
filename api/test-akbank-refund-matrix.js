require('dotenv').config({ path: '/Users/denizcanilgin/Documents/birebiro-new-admin/api/.env' });
const https = require('https');
const crypto = require('crypto');

const refundUrl = process.env.AKBANK_REFUND_URL;
const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;
const secretKey = process.env.AKBANK_SECRET_KEY;

const orderId = 'BRB17737480332395985';
const emailAddress = 'denizcanilgin@gmail.com';

function toS(v) { return v === undefined || v === null ? '' : String(v); }

function keyCandidates(raw) {
  const keys = [];
  if (!raw) return keys;
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    keys.push({ name: 'hex-binary', key: Buffer.from(raw, 'hex') });
    const decoded = Buffer.from(raw, 'hex').toString('utf8');
    if (decoded) keys.push({ name: 'hex-decoded-utf8', key: Buffer.from(decoded, 'utf8') });
  }
  keys.push({ name: 'utf8-raw', key: Buffer.from(raw, 'utf8') });

  const uniq = [];
  const seen = new Set();
  for (const item of keys) {
    const id = `${item.name}:${item.key.toString('hex')}`;
    if (!seen.has(id)) {
      seen.add(id);
      uniq.push(item);
    }
  }
  return uniq;
}

function hashItemsMinimal(payload) {
  const t = payload.transaction || {};
  const c = payload.customer || {};
  const tr = payload.terminal || {};
  const o = payload.order || {};

  return (
    toS(payload.txnCode) +
    toS(tr.merchantSafeId) +
    toS(tr.terminalSafeId) +
    toS(o.orderId) +
    toS(t.amount) +
    toS(t.currencyCode) +
    toS(c.emailAddress) +
    toS(c.ipAddress) +
    toS(payload.randomNumber) +
    toS(payload.requestDateTime)
  );
}

function hmacBase64(input, key) {
  return crypto.createHmac('sha512', key).update(Buffer.from(input, 'utf8')).digest('base64');
}

function post(body, authHash) {
  return new Promise((resolve) => {
    const endpoint = new URL(refundUrl);
    const req = https.request({
      hostname: endpoint.hostname,
      port: endpoint.port || 443,
      path: `${endpoint.pathname}${endpoint.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'auth-hash': authHash,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (d) => { raw += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });

    req.on('error', (e) => resolve({ status: -1, body: e.message }));
    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ status: -1, body: 'timeout' });
    });

    req.write(body);
    req.end();
  });
}

function dtNoMsNoZ() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '');
}

function dtMsNoZ() {
  return new Date().toISOString().replace('Z', '');
}

function randomHex(len) {
  const bytes = Math.ceil(len / 2);
  return crypto.randomBytes(bytes).toString('hex').toUpperCase().slice(0, len);
}

(async () => {
  const dateVariants = [
    { name: 'dt-no-ms-no-z', value: dtNoMsNoZ },
    { name: 'dt-ms-no-z', value: dtMsNoZ },
  ];

  const randomVariants = [
    { name: 'rnd-32', value: () => randomHex(32) },
    { name: 'rnd-128', value: () => randomHex(128) },
  ];

  const payloadVariants = [
    {
      name: 'tx-amount-str-curr-int',
      build: () => ({ transaction: { amount: '1.00', currencyCode: 949 } }),
    },
    {
      name: 'tx-amount-num-curr-int',
      build: () => ({ transaction: { amount: 1, currencyCode: 949 } }),
    },
    {
      name: 'tx-amount-str-curr-str',
      build: () => ({ transaction: { amount: '1.00', currencyCode: '949' } }),
    },
    {
      name: 'tx-amount-int-curr-int',
      build: () => ({ transaction: { amount: 100, currencyCode: 949 } }),
    },
    {
      name: 'no-transaction',
      build: () => ({}),
    },
  ];

  const hashStrategies = [
    { name: 'hash-items-minimal', build: (payload, body) => hashItemsMinimal(payload) },
    { name: 'json-body', build: (payload, body) => body },
  ];

  const keys = keyCandidates(secretKey);

  console.log('URL:', refundUrl);
  console.log('Order:', orderId);
  console.log('Key candidates:', keys.map((k) => `${k.name}:${k.key.length}B`).join(', '));

  const interesting = [];

  for (const dv of dateVariants) {
    for (const rv of randomVariants) {
      for (const pv of payloadVariants) {
        const payload = {
          version: '1.00',
          txnCode: '1002',
          requestDateTime: dv.value(),
          randomNumber: rv.value(),
          terminal: { merchantSafeId, terminalSafeId },
          order: { orderId },
          customer: { emailAddress },
          ...pv.build(),
        };

        const body = JSON.stringify(payload);

        for (const hs of hashStrategies) {
          const hashInput = hs.build(payload, body);
          for (const keyItem of keys) {
            const authHash = hmacBase64(hashInput, keyItem.key);
            const resp = await post(body, authHash);

            const label = `${dv.name} | ${rv.name} | ${pv.name} | ${hs.name} | ${keyItem.name}`;
            console.log(`${label} => HTTP ${resp.status} ${resp.body}`);

            if (resp.status !== 400 && resp.status !== 401) {
              interesting.push({ label, status: resp.status, body: resp.body });
            }
          }
        }
      }
    }
  }

  console.log('\n=== INTERESTING (not 400/401) ===');
  if (interesting.length === 0) {
    console.log('none');
  } else {
    for (const item of interesting) {
      console.log(`${item.label} => HTTP ${item.status} ${item.body}`);
    }
  }
})();
