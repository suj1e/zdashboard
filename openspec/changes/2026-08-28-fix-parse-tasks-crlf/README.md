# 2026-08-28-fix-parse-tasks-crlf

parse-tasks TASK_RE 对 CRLF tasks.md 全量失配(计 0 任务),改 \r?\n 切分
