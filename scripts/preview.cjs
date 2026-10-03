// Serve the real UI with a synthetic Chrome adapter for local visual checks.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  let data = fs.readFileSync(file);
  if (['/popup.html', '/options.html'].includes(pathname)) {
    data = Buffer.from(data.toString()
      .replace('<head>', '<head><script src="/tests/browser-fixture.js"></script>')
      .replace('<script src="storage.js"></script>', '<script src="storage.js"></script><script src="/storage-worker.js"></script>'));
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(data);
}).listen(4317, '127.0.0.1', () => console.log('Synthetic QuickLaunch preview: http://127.0.0.1:4317/popup.html'));
