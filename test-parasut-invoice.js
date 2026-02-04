
const fs = require('fs');
const path = require('path');

// Load environment variables manually since we might be running standalone
try {
    const envConfig = require('dotenv').config({ path: 'api/.env' });
    if (envConfig.error) throw envConfig.error;
} catch (e) {
    // Try loading from api/node_modules/dotenv if running from root
    try {
        require('./api/node_modules/dotenv').config({ path: 'api/.env' });
    } catch (e2) {
        console.error('Could not load .env file:', e2.message);
    }
}

const CONFIG = {
    clientId: process.env.PARASUT_CLIENT_ID,
    clientSecret: process.env.PARASUT_CLIENT_SECRET,
    companyId: process.env.PARASUT_COMPANY_ID,
    username: process.env.PARASUT_USERNAME,
    password: process.env.PARASUT_PASSWORD,
    baseUrl: 'https://api.parasut.com/v4',
    authUrl: 'https://api.parasut.com/oauth/token'
};

let accessToken = null;

async function authenticate() {
    console.log('🔑 Authenticating...');
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', CONFIG.clientId);
    params.append('client_secret', CONFIG.clientSecret);
    params.append('username', CONFIG.username);
    params.append('password', CONFIG.password);
    params.append('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');

    const res = await fetch(CONFIG.authUrl, {
        method: 'POST',
        body: params
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Auth Failed: ${txt}`);
    }

    const data = await res.json();
    accessToken = data.access_token;
    console.log('✅ Authenticated.');
}

async function request(method, path, body = null) {
    const url = `${CONFIG.baseUrl}/${CONFIG.companyId}${path}`;
    const opts = {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.api+json'
        }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const json = await res.json();

    if (!res.ok) {
        console.error(`❌ Request Failed [${method} ${path}]`, JSON.stringify(json, null, 2));
        throw new Error(`API Error: ${res.status}`);
    }

    return json;
}

async function createContact() {
    console.log('👤 Creating New Customer (Forcing)...');
    const randomId = Math.floor(Math.random() * 100000);
    const contactData = {
        data: {
            type: 'contacts',
            attributes: {
                contact_type: 'person',
                name: `Test User ${randomId}`,
                email: `test${randomId}@birebiro.com`,
                tax_number: `1${randomId.toString().padEnd(10, '0')}`,
                tax_office: 'Bireysel test',
                address: 'Test Address',
                city: 'Istanbul',
                district: 'Kadikoy',
                account_type: 'customer'
            }
        }
    };

    const res = await request('POST', '/contacts', contactData);
    console.log('✅ Customer Created:', res.data.id);
    return res.data.id;
}

async function createProduct() {
    console.log('📦 Creating/Finding Product...');
    const productName = 'Duvar tablosu';

    // Search by name
    const search = await request('GET', `/products?filter[name]=${encodeURIComponent(productName)}`);
    if (search.data && search.data.length > 0) {
        console.log('✅ Product found:', search.data[0].id);
        return search.data[0].id;
    }

    const productData = {
        data: {
            type: 'products',
            attributes: {
                name: productName,
                vat_rate: 20,
                currency: 'TRL',
                unit: 'Adet',
                list_price: 1.00 // 1 TL
            }
        }
    };

    const res = await request('POST', '/products', productData);
    console.log('✅ Product Created:', res.data.id);
    return res.data.id;
}

async function createInvoice(contactId, productId) {
    console.log('🧾 Creating Invoice...');
    const invoiceData = {
        data: {
            type: 'sales_invoices',
            attributes: {
                item_type: 'invoice',
                description: 'Test Fatura (Birebiro Admin Manual Test)',
                issue_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                currency: 'TRL'
            },
            relationships: {
                contact: { data: { id: contactId, type: 'contacts' } },
                details: {
                    data: [{
                        type: 'sales_invoice_details',
                        attributes: {
                            quantity: 1,
                            unit_price: 1.00,
                            vat_rate: 20,
                            description: 'Duvar tablosu - Test'
                        },
                        relationships: {
                            product: { data: { id: productId, type: 'products' } }
                        }
                    }]
                }
            }
        }
    };

    const res = await request('POST', '/sales_invoices', invoiceData);
    console.log('✅ Invoice Created Successfully!');
    console.log('Invoice ID:', res.data.id);
    console.log('Total:', res.data.attributes.net_total + res.data.attributes.total_vat);
    return res.data;
}

async function run() {
    try {
        if (!CONFIG.password) throw new Error('Missing credentials in .env');

        await authenticate();
        const contactId = await createContact();
        const productId = await createProduct();
        await createInvoice(contactId, productId);

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

run();
