#!/usr/bin/env node
// 模拟服务:每秒输出一行日志,ANSI 彩色,无限运行;SIGTERM/SIGINT 干净退出
const C = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
const ts = () => new Date().toISOString().slice(11, 23);
let n = 0;
console.log(`${C.cyan}[serve]${C.reset} ${C.bold}mock-server${C.reset} v1.0.0 starting...`);
console.log(`${C.cyan}[serve]${C.reset} listening on ${C.dim}http://localhost:9999${C.reset}`);
const timer = setInterval(() => {
  n++;
  const line = `[req] GET /api/items?page=${n} ${C.dim}200${C.reset}`;
  const kind = n % 10;
  if (kind === 7) console.log(`${C.yellow}${ts()} [warn]${C.reset} slow query took ${120 + n}ms`);
  else if (kind === 0) console.log(`${C.red}${ts()} [error]${C.reset} upstream timeout (retry ${n / 10})`);
  else console.log(`${C.green}${ts()}${C.reset} ${line}`);
  if (kind === 5) console.log(`${C.dim}  -> cache hit ratio 0.9${n / 5}${C.reset}`);
}, 1000);
const bye = (sig) => { clearInterval(timer); console.log(`${C.cyan}[serve]${C.reset} received ${sig}, shutting down`); process.exit(0); };
process.on('SIGTERM', () => bye('SIGTERM'));
process.on('SIGINT', () => bye('SIGINT'));
