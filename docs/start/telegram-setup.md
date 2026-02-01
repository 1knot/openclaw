# OpenClaw 接入 Telegram（国内笔记本 + systemd + HTTP 代理 + 插件模式）

本教程记录一次“从源码自建 OpenClaw（myopenclaw）并接入 Telegram Bot”的完整流程，适用于：

- Gateway 以 `systemd --user` 服务运行
- 机器在国内，需要 HTTP 代理访问 Telegram Bot API
- OpenClaw 采用 extensions/plugin 机制，channel 默认 disabled，需要手动 enable

目标：实现 Telegram 私聊中与 OpenClaw **双向收发正常**。

---

## 1. 前置条件

- Node.js 22+
- pnpm
- Telegram 客户端可用（能与 `@BotFather` 对话创建 bot）
- 本地代理（示例：`http://127.0.0.1:10809`）

---

## 2. 创建 Telegram Bot 并获取 token

1. 在 Telegram 中打开 `@BotFather`
2. 执行 `/newbot` 创建 bot
3. 保存 BotFather 返回的 `BOT_TOKEN`

安全提醒：

- token 等同 bot 的最高权限钥匙，不要发到群里/截图公开
- 若疑似泄露，回 BotFather revoke/regen token

---

## 3. 从源码构建并切换 Gateway 入口（repo 版 OpenClaw）

在仓库目录执行（示例路径）：

```bash
cd ~/github/myopenclaw
pnpm install
pnpm plugins:sync
pnpm build
pnpm ui:build
pnpm prepack
```

将 CLI 指向此 repo（开发态）：

```bash
pnpm link -g
which openclaw
openclaw --version
```

安装/修复 systemd user service 并启动：

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway status
```

> 提示：如果你已经用 `openclaw gateway start` 跑起来了，只需要确认 `gateway status` 的 `Command:` 指向 `~/github/myopenclaw/dist/index.js`。

---

## 4. 启用 Telegram 插件（重要）

OpenClaw 的 channel provider 通过插件启用。默认很多 channel 都是 disabled。

查看插件状态：

```bash
openclaw plugins list
```

启用 Telegram：

```bash
openclaw plugins enable telegram
openclaw gateway restart
```

验证插件已加载：

```bash
openclaw plugins list | grep telegram
openclaw channels capabilities --channel telegram
```

若仍提示 `Unknown channel: telegram`，说明插件仍未加载或 gateway 未重启成功。

---

## 5. 配置 systemd user 服务代理（让 Gateway 出站走代理）

创建 override 文件（推荐做法）：

```bash
mkdir -p ~/.config/systemd/user/openclaw-gateway.service.d

cat > ~/.config/systemd/user/openclaw-gateway.service.d/proxy.conf <<'EOF'
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:10809"
Environment="HTTPS_PROXY=http://127.0.0.1:10809"
Environment="NO_PROXY=127.0.0.1,localhost"
EOF

systemctl --user daemon-reload
openclaw gateway restart
```

验证代理已注入服务环境：

```bash
systemctl --user show openclaw-gateway.service -p Environment
```

> 注意：systemd 的代理配置只影响 gateway 服务进程；如果你在 shell 里运行 `openclaw message send` 也需要代理，建议把代理 export 写入 `~/.bashrc`/`~/.zshrc`。

---

## 6. 添加 Telegram channel account（bot token）

```bash
openclaw channels add --channel telegram --name "tg-bot" --token "<YOUR_BOT_TOKEN>"
```

---

## 7. 验证收发

### 7.1 出站（OpenClaw → Telegram）

向指定 user id 或 chat_id 发一条测试消息：

```bash
openclaw message send --channel telegram --target <chat_id_or_user_id> --message "test"
```

### 7.2 入站（Telegram → OpenClaw）

在 Telegram 中给 bot 发 `/start` 或任意消息，确认 OpenClaw 能收到并在会话中响应。

辅助排查：

```bash
openclaw channels logs
openclaw status --deep
journalctl --user -u openclaw-gateway.service -n 200 --no-pager
```

---

## 8. 常见问题

### 8.1 Unknown channel: telegram

原因：telegram 插件未启用或未加载。

处理：

```bash
openclaw plugins enable telegram
openclaw gateway restart
```

### 8.2 sendMessage 网络失败

原因：没有代理或代理不生效（尤其是 systemd 与 shell 环境不同）。

处理：

- 给 systemd 服务加 `HTTP_PROXY/HTTPS_PROXY`
- 或在 shell 中临时 export 代理变量再执行 `openclaw message send`

---

## 9. 建议的“工作配置备份”

```bash
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.working-$(date +%F-%H%M%S)
```
