# zdashboard root justfile

# 完整演示：构建 zdashboard 并启动，同时拉起 playground 的 mock 服务
demo:
    @pnpm build
    @cd playground && just serve &
    @cd playground && node ../dist/cli.js --dir . --open

# 仅构建 zdashboard
build:
    @pnpm build

# 直接用已构建的 dist 启动 zdashboard（指向 playground）
serve:
    @cd playground && node ../dist/cli.js --dir . --open

# 清理构建产物
clean:
    @rm -rf dist node_modules/.cache .vite
