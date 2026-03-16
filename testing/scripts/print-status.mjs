import fs from 'fs';
import path from 'path';

const moduleName = process.argv.includes('--module')
  ? process.argv[process.argv.indexOf('--module') + 1]
  : 'director';

const moduleDir = path.join(process.cwd(), 'testing', moduleName);
const statusPath = path.join(moduleDir, 'status', 'latest.json');
const requestsDir = path.join(moduleDir, 'requests');
const claimsDir = path.join(moduleDir, 'claims');
const reportsDir = path.join(moduleDir, 'reports');

if (!fs.existsSync(statusPath)) {
  console.error(`status file not found: ${statusPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
const pendingRequests = fs.existsSync(requestsDir)
  ? fs.readdirSync(requestsDir)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => !name.includes('TEMPLATE'))
    .sort()
    .map((name) => name.replace(/\.md$/, ''))
    .filter((stem) => !fs.existsSync(path.join(claimsDir, `${stem}.claim.md`)))
    .filter((stem) => !fs.existsSync(path.join(reportsDir, `${stem}.report.md`)))
  : [];

console.log(JSON.stringify({
  ...data,
  next_request: pendingRequests[0] || null,
  pending_request_count: pendingRequests.length,
  pending_requests: pendingRequests,
}, null, 2));
