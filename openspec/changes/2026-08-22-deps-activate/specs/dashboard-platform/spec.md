## ADDED Requirements

### Requirement: 依赖激活与交互反馈

系统 SHALL 使用已声明依赖替代手搓实现：禅道配置解析统一走 yaml 包；文件大小/时长格式化使用 filesize/date-fns；树过滤输入经 use-debounce 防抖（≥150ms）；侧栏开合记忆使用 useLocalStorage。关键操作失败（停止服务、just 启停）SHALL 以 toast 通知用户，不只写控制台。

#### Scenario: 配置解析统一

- **WHEN** .zdev/config.yaml 含注释或带引号值
- **THEN** yaml 包正确解析，不再因手搓正则误判

#### Scenario: 错误以 toast 呈现

- **WHEN** just 启停请求失败
- **THEN** 页面右下角出现 toast 错误提示
