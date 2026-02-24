const http = require('http');
http.get('http://127.0.0.1:5173', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('HTML:', data.substring(0, 500)));
}).on('error', err => console.error('Error:', err.message));
