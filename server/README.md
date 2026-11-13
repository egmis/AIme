# 密钥代理（Cloudflare Worker）

## 为什么需要它

应用是纯前端（GitHub Pages + Capacitor 壳），直接调大模型有两个绕不过的问题：

1. **密钥会被看到**。前端代码人人可读，密钥写进去等于公开。
2. **跨域（CORS）会被拦**。DeepSeek、百炼、方舟都不给浏览器来源发 CORS 头，`fetch` 直接失败。

所以正确做法是：密钥放服务端，前端只认代理地址。这个 Worker 就是那个服务端，免费额度 10 万次请求/天。

## 部署（约 5 分钟，无需服务器）

```bash
cd server
npx wrangler login          # 浏览器授权一次
npx wrangler secret put DEEPSEEK_KEY     # 粘贴 platform.deepseek.com 的 key
npx wrangler secret put DASHSCOPE_KEY    # 粘贴阿里云百炼的 key
npx wrangler secret put ARK_KEY          # 粘贴火山方舟的 key
npx wrangler secret put APP_TOKEN        # 可选，设了之后前端要填同样的值
npx wrangler deploy
```

部署完会打印一个地址，形如：

```
https://aime-llm.你的账号.workers.dev
```

用浏览器打开 `地址/health`，应当返回：

```json
{"ok":true,"providers":[{"id":"deepseek","keySet":true,...}]}
```

`keySet: false` 表示对应密钥没配上。

## 接进应用

App → 我的 → 接入大模型 → 选 **代理** → 服务商选 DeepSeek / 通义千问 / 豆包 →
代理地址填 `https://aime-llm.你的账号.workers.dev` → 保存并测试连接。

只用某一家的 key 也完全可以，其它两家不配就是 `keySet: false`，不影响使用。

## 建议加上来源限制

默认 `Access-Control-Allow-Origin: *`，任何人都能拿你的代理当免费 API 用（有 APP_TOKEN 挡一层）。
更稳的做法是在 `wrangler.toml` 里放开 `[vars]` 的 `ALLOW_ORIGIN`：

```toml
[vars]
ALLOW_ORIGIN = "https://egmis.github.io"
```

注意：APK 里的 WebView 来源是 `https://localhost`，如果只允许 Pages 域名，APK 就用不了——
需要把它一起放行，或者干脆只依赖 `APP_TOKEN`。

## 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/{provider}/chat/completions` | `provider` ∈ `deepseek` / `qwen` / `doubao`，兼容 OpenAI 协议 |
| GET | `/health` | 探活，返回各服务商密钥是否就绪 |
| OPTIONS | 任意 | CORS 预检 |

限制：每 IP 每分钟 30 次；`max_tokens` 强制上限 800，避免被当成免费算力池。

## 不部署 Worker 的替代方案

- **自己电脑临时跑**：`npx wrangler dev`，拿到 `http://localhost:8787`，只在本机调试时用。
- **换成自己的服务器**：Worker 代码就是普通 Request/Response，改成 Node/Deno 的写法很快。
- **不接模型**：应用默认「本地模拟」，完全不联网也能跑完整流程。
