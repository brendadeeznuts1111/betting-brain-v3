#!/usr/bin/env bun
// Test script to process live user session data from Fantasy402

const SESSION_DATA = {
    "LIST": [
        {"LoginID": "BMM228                                            ", "IPAddress": "100.0.195.20"},
        {"LoginID": "RCG23                                             ", "IPAddress": "100.12.10.74"},
        {"LoginID": "PR5319                                            ", "IPAddress": "100.14.100.219"},
        {"LoginID": "PEACH                                             ", "IPAddress": "100.16.221.226"},
        {"LoginID": "DCC306                                            ", "IPAddress": "100.16.45.190"},
        {"LoginID": "RIP189                                            ", "IPAddress": "100.17.39.143"},
        {"LoginID": "PR775308                                          ", "IPAddress": "100.19.37.174"},
        {"LoginID": "J7920                                             ", "IPAddress": "100.2.114.185"},
        {"LoginID": "CF305                                             ", "IPAddress": "100.2.54.180"},
        {"LoginID": "RX8728                                            ", "IPAddress": "100.37.137.132"},
        {"LoginID": "MOLLY100                                          ", "IPAddress": "100.37.3.174"},
        {"LoginID": "LA340_0                                           ", "IPAddress": "100.38.160.40"},
        {"LoginID": "87701                                             ", "IPAddress": "100.38.40.124"},
        {"LoginID": "WC8757                                            ", "IPAddress": "100.40.107.17"},
        {"LoginID": "J4361                                             ", "IPAddress": "100.40.165.226"},
        {"LoginID": "ANT7G7                                            ", "IPAddress": "100.40.2.36"},
        {"LoginID": "JC7249                                            ", "IPAddress": "100.40.2.36"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.106.211"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.112.100"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.112.237"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.116.223"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.116.57"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.120.193"},
        {"LoginID": "WC9311_0                                          ", "IPAddress": "100.43.125.35"},
        {"LoginID": "WLK24                                             ", "IPAddress": "100.43.5.138"}
    ],
    "INFO": ""
};

async function testSessionData() {
    console.log('👥 Testing Session Data Processing');
    console.log('==================================');

    try {
        // Test the session data processing
        const response = await fetch('http://localhost:8787/api/sessions/live', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(SESSION_DATA)
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Session data processed successfully!');
            console.log(`📊 Total sessions: ${result.data.totalSessions}`);
            console.log(`👥 Unique users: ${result.data.uniqueUsers}`);
            console.log(`🌐 Unique IPs: ${result.data.uniqueIPs}`);
            console.log(`⚠️  Risk users: ${result.data.riskUsers}`);
            console.log(`🔒 VPN detected: ${result.data.vpnDetected}`);
            console.log(`🛡️  Proxy detected: ${result.data.proxyDetected}`);
            console.log(`🚨 Suspicious patterns: ${result.data.suspiciousPatterns}`);
            console.log(`🔄 Multi-session users: ${result.data.multiSessionUsers}`);
            console.log(`🤝 Shared IP users: ${result.data.sharedIPUsers}`);
        } else {
            console.error('❌ Session data processing failed:', result.error);
        }

    } catch (error) {
        console.error('❌ Error testing session data:', error);
    }
}

// Run the test
testSessionData();
