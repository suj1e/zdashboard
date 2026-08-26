# zdashboard root justfile

# 完整演示：构建 zdashboard 并启动，同时拉起 playground 的 mock 服务
demo:
    @pnpm build
    @cd playground && just serve &
    @cd playground && node ../dist/cli.js --dir . --open

# 开发演示：前端 Vite HMR + 后端 tsx 直跑，改代码即时生效
dev-demo:
    @cd playground && just serve &
    @npx tsx src/cli.ts --dir playground --open &
    @pnpm dev

# 重启演示：杀掉旧实例后启动开发模式
restart-demo:
    @echo "[restart-demo] stopping old zdashboard instance..."
    @node -e "const fs=require('fs'),path=require('path'); const p=path.join('playground','.zdev','dashboard.json'); try { const r=JSON.parse(fs.readFileSync(p,'utf8')); if (r && r.pid) { process.kill(r.pid,'SIGTERM'); console.log('[restart-demo] killed pid', r.pid); } } catch(e) { console.log('[restart-demo] no running instance found'); }"
    @echo "[restart-demo] starting dev mode..."
    @just dev-demo

# 仅构建 zdashboard
build:
    @pnpm build

# 直接用已构建的 dist 启动 zdashboard（指向 playground）
serve:
    @cd playground && node ../dist/cli.js --dir . --open

# 清理构建产物
clean:
    @rm -rf dist node_modules/.cache .vite
