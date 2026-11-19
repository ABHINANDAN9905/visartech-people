import dns from 'dns';
import net from 'net';
import tls from 'tls';
import { getDatabaseUri, maskUri } from '../config/db.js';

const promisesDns = dns.promises;

async function diagnose() {
  console.log('====================================================');
  console.log('VISARTECH People — MongoDB Atlas Connectivity Diagnostic');
  console.log('====================================================');

  const uri = getDatabaseUri();
  console.log(`[Diagnostic] Configured URI: ${maskUri(uri)}`);

  // Parse hostname from URI
  const match = uri.match(/@([^/?]+)/);
  if (!match) {
    console.error('[Diagnostic] Could not extract hostname from URI.');
    return;
  }
  const fullHost = match[1];
  console.log(`[Diagnostic] Target Cluster Host: ${fullHost}`);

  const srvRecordName = `_mongodb._tcp.${fullHost}`;

  // STEP 1: DNS Resolution Check
  console.log('\n--- 1. DNS RESOLUTION CHECK ---');
  let srvRecords = [];
  try {
    console.log(`[DNS] Resolving SRV: ${srvRecordName}...`);
    srvRecords = await promisesDns.resolveSrv(srvRecordName);
    console.log(`[DNS] SRV Resolution SUCCESS: Found ${srvRecords.length} node(s):`);
    srvRecords.forEach((rec, i) => {
      console.log(`   Node ${i + 1}: ${rec.name}:${rec.port} (priority: ${rec.priority}, weight: ${rec.weight})`);
    });
  } catch (err) {
    console.error(`[DNS] SRV Resolution FAILED: ${err.code || err.message}`);
  }

  // Check TXT record for authSource/replicaSet params
  try {
    console.log(`[DNS] Resolving TXT: ${fullHost}...`);
    const txtRecords = await promisesDns.resolveTxt(fullHost);
    console.log(`[DNS] TXT Resolution SUCCESS:`, txtRecords.map(t => t.join('')).join('; '));
  } catch (err) {
    console.warn(`[DNS] TXT Resolution note: ${err.code || err.message}`);
  }

  if (srvRecords.length === 0) {
    console.error('[DNS] Cannot proceed with TCP/TLS tests without resolved node hosts.');
    return;
  }

  const primaryTestNode = srvRecords[0];
  console.log(`\n[DNS] Resolving A Record for: ${primaryTestNode.name}...`);
  try {
    const lookupRes = await promisesDns.lookup(primaryTestNode.name);
    console.log(`[DNS] A Record IP: ${lookupRes.address} (family: IPv${lookupRes.family})`);
  } catch (err) {
    console.error(`[DNS] Lookup failed: ${err.message}`);
  }

  // STEP 2: RAW TCP SOCKET TEST (Check for network routing / firewall / RST)
  console.log('\n--- 2. RAW TCP SOCKET CONNECTIVITY TEST ---');
  await new Promise((resolve) => {
    console.log(`[TCP] Connecting to ${primaryTestNode.name}:${primaryTestNode.port}...`);
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(6000);

    socket.on('connect', () => {
      isConnected = true;
      console.log(`[TCP] SUCCESS: TCP 3-way handshake established with ${primaryTestNode.name}:${primaryTestNode.port}`);
      socket.end();
    });

    socket.on('timeout', () => {
      console.error(`[TCP] TIMEOUT: Connection timed out after 6000ms. (Firewall / Network block suspected)`);
      socket.destroy();
      resolve();
    });

    socket.on('error', (err) => {
      console.error(`[TCP] ERROR: ${err.code} - ${err.message}`);
      if (err.code === 'ECONNRESET') {
        console.error(`[TCP] Note: Connection was reset by peer during TCP phase.`);
      }
      resolve();
    });

    socket.on('close', () => {
      if (isConnected) {
        console.log(`[TCP] Connection closed normally.`);
      }
      resolve();
    });

    socket.connect(primaryTestNode.port, primaryTestNode.name);
  });

  // STEP 3: TLS HANDSHAKE TEST (With certificate verification ON)
  console.log('\n--- 3. TLS HANDSHAKE & CERTIFICATE VALIDATION TEST ---');
  await new Promise((resolve) => {
    console.log(`[TLS] Initiating TLS handshake with ${primaryTestNode.name}:${primaryTestNode.port}...`);
    console.log(`[TLS] SNI Servername: ${primaryTestNode.name}`);
    console.log(`[TLS] Reject Unauthorized (Certificate Verification): true`);

    const tlsSocket = tls.connect(
      {
        host: primaryTestNode.name,
        port: primaryTestNode.port,
        servername: primaryTestNode.name,
        rejectUnauthorized: true, // Verification enforced
        timeout: 8000,
      },
      () => {
        console.log(`[TLS] SUCCESS: Handshake completed successfully!`);
        console.log(`[TLS] Protocol: ${tlsSocket.getProtocol()}`);
        console.log(`[TLS] Cipher: ${JSON.stringify(tlsSocket.getCipher())}`);
        const cert = tlsSocket.getPeerCertificate();
        console.log(`[TLS] Peer Certificate Subject CN: ${cert.subject?.CN || 'N/A'}`);
        console.log(`[TLS] Peer Certificate Issuer: ${cert.issuer?.O || cert.issuer?.CN || 'N/A'}`);
        console.log(`[TLS] Valid From: ${cert.valid_from} to ${cert.valid_to}`);
        console.log(`[TLS] Authorized: ${tlsSocket.authorized}`);
        tlsSocket.end();
      }
    );

    tlsSocket.on('timeout', () => {
      console.error(`[TLS] TIMEOUT: TLS handshake timed out.`);
      tlsSocket.destroy();
      resolve();
    });

    tlsSocket.on('error', (err) => {
      console.error(`[TLS] ERROR: ${err.code || err.name} - ${err.message}`);
      if (err.code === 'ECONNRESET') {
        console.error(`[TLS] ECONNRESET observed during TLS negotiation!`);
      }
      resolve();
    });

    tlsSocket.on('close', () => {
      resolve();
    });
  });

  console.log('\n====================================================');
  console.log('Diagnostic Run Finished.');
  console.log('====================================================');
}

diagnose();
