const https = require('https');
const fs = require('fs');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';
const projectRef = 'kudsqsbxbmviesiaesct';

const sql = fs.readFileSync('scripts/migrations/create-plan-supabase.sql', 'utf8');
const postData = JSON.stringify({ query: sql });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'apikey': apiKey,
    'Content-Length': Buffer.byteLength(postData),
  }
};

function run() {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`HTTP ${res.statusCode}`);
        console.log(body);
        if (res.statusCode >= 400) reject(new Error(body));
        else resolve(body);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

run()
  .then(() => console.log('\nDone'))
  .catch(e => console.error('Error:', e.message));
