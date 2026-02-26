const http = require('http');

async function testPort(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.on('error', (err) => {
            resolve({ port, success: false, code: err.code });
        });
        server.listen(port, host, () => {
            server.close(() => {
                resolve({ port, success: true });
            });
        });
    });
}

async function run() {
    const portsToTest = [3000, 3001, 3002, 3003, 3100, 3101, 8080, 8081, 0];
    console.log('Testing ports natively...');
    for (const port of portsToTest) {
        for (const host of ['127.0.0.1', '::1', '0.0.0.0', '::']) {
            try {
                const result = await testPort(port, host);
                console.log(`Port ${port} on ${host} -> ${result.success ? 'SUCCESS' : result.code}`);
            } catch (e) {
                console.log(`Port ${port} on ${host} -> EXCEPTION ${e.message}`);
            }
        }
    }
}

run();
