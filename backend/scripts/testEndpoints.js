import http from 'http';
import { PassThrough } from 'stream';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';

function executeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.url = url;
    req.method = method;
    req.headers = { host: 'localhost:5000' };

    const resSocket = new PassThrough();
    const res = new http.ServerResponse(req);
    res.assignSocket(resSocket);

    let resBody = '';
    resSocket.on('data', (chunk) => {
      resBody += chunk.toString();
    });

    res.on('finish', () => {
      const parts = resBody.split('\r\n\r\n');
      const headerPart = parts[0];
      const bodyPart = parts.slice(1).join('\r\n\r\n');
      let parsed = bodyPart;
      try {
        parsed = JSON.parse(bodyPart);
      } catch (e) {
        // keep string
      }
      resolve({
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.getHeaders(),
        body: parsed
      });
    });

    app.handle(req, res);
  });
}

async function run() {
  console.log('====================================================');
  console.log('VISARTECH People — Health Endpoint Verification (Live DB)');
  console.log('====================================================');

  try {
    await connectDB();
  } catch (e) {
    console.warn('[Test] Continuing in disconnected state...');
  }

  console.log('\n[1] Testing GET /api/health:');
  const healthRes = await executeRequest('/api/health');
  console.log(`HTTP Status: ${healthRes.statusCode} ${healthRes.statusMessage || ''}`);
  console.log('Response JSON:\n', JSON.stringify(healthRes.body, null, 2));

  console.log('\n[2] Testing GET /api/health/db:');
  const dbRes = await executeRequest('/api/health/db');
  console.log(`HTTP Status: ${dbRes.statusCode} ${dbRes.statusMessage || ''}`);
  console.log('Response JSON:\n', JSON.stringify(dbRes.body, null, 2));

  console.log('\n[3] Testing Root Endpoint GET /:');
  const rootRes = await executeRequest('/');
  console.log(`HTTP Status: ${rootRes.statusCode} ${rootRes.statusMessage || ''}`);
  console.log('Response JSON:\n', JSON.stringify(rootRes.body, null, 2));

  await disconnectDB();
  process.exit(0);
}

run();
