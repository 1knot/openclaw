# 🦞 OpenClaw — 个人 AI 助手

> 这是 OpenClaw 仓库的中文说明（简版），用于补充关键用法与配置示例。

OpenClaw 是一个你可以运行在自己设备上的“个人 AI 助手”。它可以接入你日常使用的聊天渠道（WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、Microsoft Teams、WebChat 等），并提供常驻网关（Gateway）作为控制面。

- 官网：https://openclaw.ai
- 文档：https://docs.openclaw.ai

## 安装（推荐）

运行环境：**Node ≥ 22**

```bash
npm install -g openclaw@latest
# 或 pnpm add -g openclaw@latest

openclaw onboard --install-daemon
```

## OpenAI Responses：把 `systemPrompt` 作为 `instructions`

当你使用 OpenAI **Responses API**（模型 `api: openai-responses` 或 `api: openai-codex-responses`）时，可以让 OpenClaw 自动把 agent 的 `systemPrompt` 写入请求 payload 的 `instructions` 字段。

在你的模型配置里添加：

```yaml
agents:
  defaults:
    models:
      "codex-proxy/gpt-5.2":
        params:
          # 将 context.systemPrompt 注入到 OpenAI Responses 的 payload.instructions
          # 若 payload.instructions 已存在，则不会覆盖。
          openaiResponsesInstructions: systemPrompt

          # 可选：当 input 的第一条就是 system prompt 时，把它剥离掉
          #（避免同一段指令被发送两次）
          openaiResponses:
            stripSystemPromptFromInput: true
```

说明：

- 如果没配置 `openaiResponsesInstructions`（或设置为 `off`），则行为不变。
- 兼容旧配置键：`openaiResponsesSendInstructions: true`（等价于 `systemPrompt`）。

---

更完整的安装、模型与安全说明请参考：

- Getting Started：https://docs.openclaw.ai/start/getting-started
- Models：https://docs.openclaw.ai/concepts/models
- Model failover：https://docs.openclaw.ai/concepts/model-failover
