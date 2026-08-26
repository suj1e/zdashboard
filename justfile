# zdashboard root justfile

# 构建 zdashboard
build:
    @pnpm build

# 用已构建的 dist 启动 zdashboard（指向 playground）
serve:
    @cd playground && node ../dist/cli.js --dir . --open

# 完整演示：构建 + playground mock 服务 + 启动 zdashboard
demo: build serve

# 开发演示：playground mock + 后端 tsx + 前端 Vite HMR（改代码即时生效）
dev-demo:
    @cd playground && just serve &
    @npx tsx src/cli.ts --dir playground --open &
    @pnpm dev

# 重启开发模式：杀掉旧实例后重新启动
restart-demo:
    @echo "[restart-demo] stopping old zdashboard instance..."
    @node -e "const fs=require('fs'),path=require('path'); const p=path.join('playground','.zdev','dashboard.json'); try { const r=JSON.parse(fs.readFileSync(p,'utf8')); if (r && r.pid) { process.kill(r.pid,'SIGTERM'); console.log('[restart-demo] killed pid', r.pid); } } catch(e) { console.log('[restart-demo] no running instance found'); }"
    @echo "[restart-demo] starting dev mode..."
    @just dev-demo
