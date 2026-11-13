# 参与指南（CONTRIBUTING）

感谢参与 AIme。这个项目的目标不是做出另一个聊天机器人，而是把"个人数字分身"这件事做真。以下规则保证协作高效。

## 认领任务

1. 浏览 [Issues](../../issues)，`good first issue` 适合新人，`M1`~`M4` 标签对应里程碑
2. 在 Issue 下评论"认领 + 预计完成时间"，即可开始
3. 一个 Issue 一个 PR，不要夹带无关改动

## 开发流程

```bash
git clone https://github.com/<owner>/AIme.git
cd AIme
git checkout -b feat/your-feature   # 分支命名：feat/xxx | fix/xxx | docs/xxx
```

- 提交信息格式：`类型: 摘要`（如 `feat: 画像引擎八层数据模型`）
- PR 描述需包含：改了什么、为什么、如何验证
- **涉及数据采集/存储/共享的 PR，描述必须加 `合规:` 段落**（见 docs/04-合规红线.md）

## 目录约定

```
docs/         设计蓝图、PRD、路线图、合规 + index.html 交互原型（也是 Pages 站点根目录）
miniprogram/  小程序工程（M1 建立）
server/       服务端与 LLM 中转（M1 建立）
.github/      Issue 模板与工作流
```

在线原型：https://egmis.github.io/AIme/

## 非代码贡献

同样有效且欢迎：

- **体验反馈**：试用 docs/index.html（或在线原型）后提 Issue，带 `feedback` 标签
- **文档**：校对、翻译（英文版 README 是当前缺口）
- **量表选型**：心理学背景的伙伴参与性格测评工具的选型讨论
- **合规审查**：法律背景伙伴审阅 docs/04

## 行为准则

- 对事不对人；评审意见针对代码与方案
- 涉及用户数据的设计讨论，默认从最保守的方案开始
- 拒绝任何将本项目用于冒充他人、欺诈目的的提议
