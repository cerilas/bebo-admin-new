

// Credentials provided by user
const CONFIG = {
    baseUrl: 'https://api.parasut.com/oauth/token',
    clientId: process.env.PARASUT_CLIENT_ID, // Will read from local .env or hardcode if needed
    clientSecret: process.env.PARASUT_CLIENT_SECRET,
    username: 'erdemozboya@gmail.com',
    password: '190397.Bi',
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob'
};

async function testAuth() {
    console.log('Testing Paraşüt Authentication...');
    console.log(`User: ${CONFIG.username}`);

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', CONFIG.clientId);
    params.append('client_secret', CONFIG.clientSecret);
    params.append('username', CONFIG.username);
    params.append('password', CONFIG.password);
    params.append('redirect_uri', CONFIG.redirectUri);

    try {
        const response = await fetch(CONFIG.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Authentication FAILED');
            console.error('Status:', response.status);
            console.error('Response:', JSON.stringify(data, null, 2));
        } else {
            console.log('✅ Authentication SUCCESSFUL');
            console.log('Access Token:', data.access_token.substring(0, 10) + '...');
            console.log('Refresh Token:', data.refresh_token ? 'Present' : 'Missing');
            console.log('Expires In:', data.expires_in);
        }
    } catch (error) {
        console.error('❌ Request Failed:', error.message);
    }
}

// Check for required env vars
if (!CONFIG.clientId || !CONFIG.clientSecret) {
    const fs = require('fs');
    console.log('CWD:', process.cwd());
    const envPath = 'api/.env';
    if (fs.existsSync(envPath)) {
        console.log(`✅ ${envPath} exists.`);
        try {
            const dotenvResult = require('./api/node_modules/dotenv').config({ path: envPath });
            if (dotenvResult.error) {
                console.error('Dotenv error:', dotenvResult.error);
            } else {
                console.log('Dotenv loaded keys:', Object.keys(dotenvResult.parsed || {}));
            }
        } catch (e) {
            console.error('Failed to load dotenv:', e.message);
        }
    } else {
        console.error(`❌ ${envPath} does NOT exist.`);
    }
    CONFIG.clientId = process.env.PARASUT_CLIENT_ID;
    CONFIG.clientSecret = process.env.PARASUT_CLIENT_SECRET;
}

if (!CONFIG.clientId || !CONFIG.clientSecret) {
    console.error('❌ PARASUT_CLIENT_ID or PARASUT_CLIENT_SECRET is missing from environment or api/.env');
    process.exit(1);
}

testAuth();
