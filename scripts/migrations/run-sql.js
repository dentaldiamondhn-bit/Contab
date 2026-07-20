const fs = require('fs');
const https = require('https');

const sql = fs.readFileSync(process.argv[2], 'utf8');
const serviceRoleKey = process.argv[3];
const projectRef = process.argv[4];

const postData = JSON.stringify({ query: sql });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(body);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();
