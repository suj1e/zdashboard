# 提案:删除 apply 插件,view 扫描 .zdev/apply(feat-drop-apply-plugin-view-scan)

## 需求复述

用户判断(2026-08-29):apply 插件非必需——它自合并重构起已是纯只读观察器,所有数据(openSpec change 文档、`.zdev/apply/runs/*/state.json`、plan.md)都是文件;而用户是唯一用户且批量进度在对话中消费,dashboard 驾驶舱价值有限。方案 A(拍板):**删除整个 apply 插件**,view 约定扫描目录增加 `.zdev/apply`(点目录例外),文件树可直接浏览 `CURRENT`、`runs/*/state.json`、`plan.md`。

## 要解决的问题

1. apply 插件 ~1500 行(7 源文件 + 8 测试文件 + 2 viewers)的持续维护面,含一个已知偶发 flaky 测试(view-header lazy-chunk 超时,随插件删除根治)。
2. 与 view 的功能重叠:单 change Tab 本质是「openspec/changes 文档 + 勾选进度解析」,批量 Tab 本质是「.zdev/apply 文件的可视化投影」。

## 成功标准

1. `src/plugins/apply/` 整目录删除;host(builtin/cli/测试)无 apply 残留引用;`grep -rn "apply" src/ --include="*.ts*"` 仅剩无关命中(如 `undefined`/`applause` 类词形或注释)。
2. view 文件树出现 `.zdev/apply (<n>)` 分组(存在时),可浏览 CURRENT/runs/plan.md/state.json;`.zdev` 外的其他点目录不被误扫(walkDir 点目录例外仅对显式列入 scanDirs 的路径生效)。
3. 图标导航:apply 从 IconRail/HomeGrid 消失;`?p=apply`、`?p=apply-batch` 旧深链接回首页(既有非法 mode 回落逻辑)。
4. 基线测试套件减去 apply 测试后全绿(预期 372 → ~200 量级);typecheck/build 通过;控制台零错误。
5. 播放器 playground 不受影响(ext-plugins demo/bare 照常)。

## 非目标

- 不做批量可视化替代品(state.json 以 JSON 预览消费;需要驾驶舱时从 git 历史复活)。
- 不动 zskills(zapply skill 本身照常工作,其状态文件照常写入)。
- 不删 `.zdev/apply` 目录与 zapply run 历史数据。

## 依赖

- 无前置(基于 main@v2.8.4)。

## 优先级

- P3:简化型需求,随空档交付。
