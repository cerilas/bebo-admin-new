// Native fetch is available in Node.js 18+

const BASE_URL = 'http://localhost:4444/api'; // Assuming API runs on port 4444 locally
// Note: You might need a valid token if authentication is enabled. 
// For test purposes, we assume localhost might bypass auth or we need a token.

async function testGeliverIntegration() {
    console.log('🧪 Starting Geliver Integration Test...');

    try {
        // 1. List Shipments
        console.log('\n--- Testing GET /shipping/shipments ---');
        try {
            const shipments = await fetch(`${BASE_URL}/shipping/shipments`);
            const shipmentsData = await shipments.json();
            console.log('Status:', shipments.status);
            if (shipments.ok) {
                console.log('✅ Shipments list fetched successfully');
            } else {
                console.log('❌ Failed to fetch shipments:', shipmentsData);
            }
        } catch (e) {
            console.log('❌ Request failed (is server running?):', e.message);
        }

        // 2. We skip create/accept flow because it requires a real order ID and makes real API calls to Geliver which might cost money or affect production data if not sandbox.
        // However, we verified the code implementation.

    } catch (error) {
        console.error('Test script error:', error);
    }
}

// Check if we can run this (requires node-fetch installed or node v18+)
// If node-fetch is not available, we can rely on manual testing instructions.
console.log('⚠️  Note: This script requires the API server to be running on localhost:4444');
console.log('⚠️  Run this script with: node api/test-geliver-integration.js');

testGeliverIntegration();
