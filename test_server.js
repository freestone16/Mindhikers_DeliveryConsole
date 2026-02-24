import { createServer } from 'http';

const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World');
});

server.listen(0, '127.0.0.1', () => {
    console.log('Server running on port ' + server.address().port);
});
