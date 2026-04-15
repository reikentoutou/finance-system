/**
 * 极简静态站：托管 Vite 构建的 web/dist（含 SPA 回退到 index.html）。
 * 方案 B 离线包内与 API 分开端口：默认 5173，与 Electron 默认 FINANCE_WEB_URL 一致。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, 'web', 'dist');
const port = parseInt(process.env.WEB_STATIC_PORT || '5173', 10);
const host = process.env.WEB_STATIC_HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function underRoot(rootDir, pathname) {
  const rel = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(rootDir, rel);
  const base = path.resolve(rootDir);
  if (!candidate.startsWith(base)) return null;
  return candidate;
}

/** 非法 % 序列时 decodeURIComponent 会抛错，须单独处理 */
function safeDecodeURIComponent(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('serve-web: 未找到', path.join(root, 'index.html'));
  process.exit(1);
}

http
  .createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      return res.end();
    }
    const url = new URL(req.url, `http://${host}`);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    const decodedPath = safeDecodeURIComponent(url.pathname);
    if (decodedPath === null) {
      res.writeHead(400);
      return res.end();
    }
    const filePath = underRoot(root, decodedPath);
    if (!filePath) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(filePath).pipe(res);
    }
    const indexPath = path.join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(indexPath).pipe(res);
  })
  .listen(port, host, () => {
    console.log(`serve-web: http://${host}:${port}/ (root=${root})`);
  });
