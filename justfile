# zdashboard root justfile

# 完整演示：构建 zdashboard 并启动，同时拉起 playground 的 mock 服务
demo: build-serve playground-serve

# 仅构建 zdashboard
build:
    @pnpm build

# 构建后启动 zdashboard（指向 playground）
build-serve: build
    @cd playground && node ../dist/cli.js --dir . --open

# 直接用已构建的 dist 启动 zdashboard（指向 playground）
serve:
    @cd playground && node ../dist/cli.js --dir . --open

# 启动 playground 内的 demo 辅助服务（mock 日志 + mock 禅道）
playground-serve:
    @cd playground && just serve

# 清理构建产物
clean:
    @rm -rf dist node_modules/.cache .vite
