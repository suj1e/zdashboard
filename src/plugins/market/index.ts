/**
 * market server 侧:defineBuiltin 接入 + 代理/目录路由(目录与取数分离)。
 *
 * - GET /__market/proxy?url=<完整 URL>:host 白名单收敛 SSRF 面(design 安全红线);
 *   8s 超时降级 502;内存缓存 ≤200 条 TTL 10min,X-Market-Cache: hit|miss。
 * - GET /__market/catalog/<market>:内置目录 JSON,未知 market 404,零 IO 离线可浏览。
 */
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';
import { catalogFor, isMarketName } from './sources/index.js';

/** 代理 allowlist:仅此双 host(任意外发 = 0,design 安全红线) */
export const ALLOWED_PROXY_HOSTS = ['cdn.jsdelivr.net', 'data.jsdelivr.com'] as const;

/** 端口限定:仅缺省/80/443 放行,防 CDN 域名解析到固定 IP 后的非标端口探测 */
const ALLOWED_PROXY_PORTS = new Set(['', '80', '443']);

const PROXY_TIMEOUT_MS = 8_000; // 上游超时,超时降级 502
const PROXY_CACHE_MAX_ENTRIES = 200; // 内存缓存条目上限,超出淘汰最旧
const PROXY_CACHE_TTL_MS = 10 * 60 * 1000; // 缓存有效期 10min
const CATALOG_PREFIX = '/__market/catalog/';

interface ProxyCacheEntry {
  body: string;
  contentType: string;
  cachedAt: number;
}

export const apply = defineBuiltin({
  manifest,
  setup(ctx) {
    // 缓存随插件 setup 生命周期(cordis 重载即重建,测试天然隔离)
    const cache = new Map<string, ProxyCacheEntry>();

    ctx.route('/__market/proxy', async (req, res) => {
      const raw = new URL(req.url || '/', 'http://localhost').searchParams.get('url');
      if (!raw) { res.writeHead(400); res.end('missing url'); return; }
      let target: URL;
      try { target = new URL(raw); } catch { res.writeHead(400); res.end('bad url'); return; }
      if (target.protocol !== 'https:' && target.protocol !== 'http:') { res.writeHead(403); res.end('scheme not allowed'); return; }
      if (!(ALLOWED_PROXY_HOSTS as readonly string[]).includes(target.hostname)) { res.writeHead(403); res.end('host not allowed'); return; }
      if (!ALLOWED_PROXY_PORTS.has(target.port)) { res.writeHead(403); res.end('port not allowed'); return; }

      // 缓存命中:未过 TTL 直接回源副本,零上游请求
      const hit = cache.get(raw);
      if (hit && Date.now() - hit.cachedAt < PROXY_CACHE_TTL_MS) {
        res.writeHead(200, { 'Content-Type': hit.contentType, 'X-Market-Cache': 'hit', 'Cache-Control': 'no-cache' });
        res.end(hit.body);
        return;
      }
      if (hit) cache.delete(raw); // 过期清除

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
      try {
        // redirect: 'error' — jsdelivr 直链无跨域重定向需求,30x 跨 host 跳转不经 allowlist 复核,拒绝跟随
        const upstream = await fetch(raw, { signal: controller.signal, redirect: 'error' });
        if (!upstream.ok) { res.writeHead(502); res.end('upstream error'); return; }
        const body = await upstream.text();
        const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
        cache.set(raw, { body, contentType, cachedAt: Date.now() });
        if (cache.size > PROXY_CACHE_MAX_ENTRIES) {
          // Map 迭代序 = 插入序,淘汰最旧一条回到上限
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        res.writeHead(200, { 'Content-Type': contentType, 'X-Market-Cache': 'miss', 'Cache-Control': 'no-cache' });
        res.end(body);
      } catch {
        // 上游断网/超时中止:统一 502,前端降级
        if (!res.headersSent) { res.writeHead(502); res.end('upstream failed'); }
      } finally {
        clearTimeout(timer);
      }
    });

    // 注册不带尾斜杠:core/server 前缀分发按 rp + '/' 命中 /__market/catalog/<market>
    ctx.route('/__market/catalog', async (req, res) => {
      // 命中方式为前缀匹配(/__market/catalog/logos),取首段为 market 名
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      const market = pathname.startsWith(CATALOG_PREFIX)
        ? pathname.slice(CATALOG_PREFIX.length).split('/')[0]
        : '';
      if (!market || !isMarketName(market)) {
        res.writeHead(404);
        res.end('unknown market');
        return;
      }
      return catalogFor(market);
    });
  },
});
