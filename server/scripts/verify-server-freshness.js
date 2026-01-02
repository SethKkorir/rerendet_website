
import fetch from 'node-fetch';

const ADMIN_EMAIL = 'admin@rerendetcoffee.com';
const ADMIN_PASS = 'Admin123!';
const BASE_URL = 'http://127.0.0.1:5000'; // Avoid localhost to bypass AirTunes (IPv6)

async function testPolicyFlow() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await fetch(`${BASE_URL}/api/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${loginData.message}`);

        const token = loginData.token;
        console.log('✅ Login successful. Token received.');

        console.log('2. Updating Settings with notifyCustomers: true ...');
        const start = Date.now();

        // Minimal payload to trigger notification
        const payload = {
            notifyCustomers: true,
            policies: {
                privacyPolicy: `Test Update ${Date.now()}`
            }
        };

        const updateRes = await fetch(`${BASE_URL}/api/admin/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const end = Date.now();
        const duration = end - start;

        const updateData = await updateRes.json();

        console.log(`⏱️ Response time: ${duration}ms`);

        if (updateRes.ok) {
            console.log('✅ Status: 200 OK');
            if (duration < 1000) {
                console.log('⚠️  FAST RESPONSE (< 1s): This suggests the "await" logic is NOT running. Server is likely STALE.');
            } else {
                console.log('🐢 SLOW RESPONSE (> 1s): This suggests the server IS sending emails synchronously. Setup looks CORRECT.');
            }
        } else {
            console.log('❌ Update Failed:', updateData);
        }

    } catch (err) {
        console.error('❌ Test Error:', err.message);
    }
}

testPolicyFlow();
