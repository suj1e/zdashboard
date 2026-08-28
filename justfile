# zdashboard root justfile

# 构建 zdashboard（前端 + 后端）
build:
    @pnpm build

# playground 演示：build → 杀旧实例 → 播种演示资产 → 启动（含 mock 服务）
demo:
    @pnpm build
    @node -e "const fs=require('fs'),path=require('path'); const p=path.join('playground','.zdev','dashboard.json'); try { const r=JSON.parse(fs.readFileSync(p,'utf8')); if (r && r.pid) { process.kill(r.pid,'SIGTERM'); console.log('[demo] killed pid', r.pid); } } catch(e) { console.log('[demo] no running instance'); }"
    @mkdir -p playground/.zdev/design
    @cp -rn playground/design/. playground/.zdev/design/
    @cd playground && just serve &
    @cd playground && node ../dist/cli.js --dir . --open
