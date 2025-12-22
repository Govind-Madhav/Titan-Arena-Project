
const API_URL = 'http://localhost:5000/api';

async function testAdmin() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@titan.com',
                password: 'AdminSecretPassword123!'
            })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login Failed: ${JSON.stringify(loginData)}`);

        const token = loginData.data.token;
        console.log('   Login successful. Token obtained.', token.substring(0, 10) + '...');

        console.log('2. Fetching Tournaments...');
        const res = await fetch(`${API_URL}/admin/tournaments`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        console.log(`   Status: ${res.status}`);

        if (res.ok) {
            console.log('   Success! Data Count:', data.data ? data.data.length : 'N/A');
            console.log('   Sample:', JSON.stringify(data.data[0] || {}, null, 2));
        } else {
            console.error('   API Error:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('   Script Error:', error.message);
    }
}

testAdmin();
