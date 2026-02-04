
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables manually since we might be running standalone
try {
    const envConfig = require('dotenv').config({ path: 'api/.env' });
    if (envConfig.error) throw envConfig.error;
} catch (e) {
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

const INVOICE_ID = '1073116283'; // The ID from the previous step

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

async function getPdfUrl(invoiceId) {
    console.log(`📄 Requesting PDF URL for Invoice ${invoiceId}...`);
    const url = `${CONFIG.baseUrl}/${CONFIG.companyId}/sales_invoices/${invoiceId}/pdf`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.api+json'
        }
    });

    if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to get PDF URL:', txt);
        throw new Error(`API Error: ${res.status}`);
    }

    const json = await res.json();
    if (json.url) {
        return json.url;
    }
    // API v4 sometimes returns { data: { attributes: { url: ... } } } ??? 
    // Or sometimes just redirects. Let's check the response structure carefully.
    // Documentation says it returns a redirect to the PDF URL usually or a JSON with URL.
    // If it's a redirect, fetch might follow it automatically if using node-fetch? 
    // Wait, typically GET .../pdf returns 200 OK with JSON { data: { attributes: { url: "..." } } } or similar

    // Let's fallback to checking standard JSON:
    return json.data?.attributes?.url || json.url;
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function run() {
    try {
        await authenticate();

        // Debug: Get Invoice Details
        console.log(`🔍 Fetching details for Invoice ${INVOICE_ID}...`);
        const invoiceUrl = `${CONFIG.baseUrl}/${CONFIG.companyId}/sales_invoices/${INVOICE_ID}`;
        const res = await fetch(invoiceUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const json = await res.json();
        console.log('Invoice Details:', JSON.stringify(json, null, 2));

        // Try to find PDF from likely places
        // e.g., active_e_document or special attributes

    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

run();
