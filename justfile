# zdashboard root justfile

# 完整演示：构建 zdashboard 并启动，同时拉起 playground 的 mock 服务
demo:
    @pnpm build
    @cd playground && just serve &
    @cd playground && node ../dist/cli.js --dir . --open

# 重启演示：通过 .zdev/dashboard.json 找到旧实例并杀掉，再 demo
restart-demo:
    @echo "[restart-demo] stopping old zdashboard instance..."
    @node -e "const fs=require('fs'),path=require('path'); const p=path.join('playground','.zdev','dashboard.json'); try { const r=JSON.parse(fs.readFileSync(p,'utf8')); if (r && r.pid) { process.kill(r.pid,'SIGTERM'); console.log('[restart-demo] killed pid', r.pid); } } catch(e) { console.log('[restart-demo] no running instance found'); }"
    @echo "[restart-demo] starting fresh..."
    @just demo

# 仅构建 zdashboard
build:
    @pnpm build

# 直接用已构建的 dist 启动 zdashboard（指向 playground）
serve:
    @cd playground && node ../dist/cli.js --dir . --open

# 清理构建产物
clean:
    @rm -rf dist node_modules/.cache .vite
