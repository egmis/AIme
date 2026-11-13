/**
 * AIme 大模型代理（Cloudflare Worker）
 *
 * 作用：把 DeepSeek / 通义千问 / 豆包 的密钥留在服务端，前端只认代理地址。
 * 路由：POST /{provider}/chat/completions   provider ∈ deepseek | qwen | doubao
 * 其它：GET /health 探活
 *
 * 环境变量（用 wrangler secret put 写入，不要写进代码）：
 *   DEEPSEEK_KEY    platform.deepseek.com 的 API Key
 *   DASHSCOPE_KEY   阿里云百炼的 API Key
 *   ARK_KEY         火山方舟的 API Key
 *   APP_TOKEN       可选。设置后前端必须带 x-app-token 头才能调用
 *   ALLOW_ORIGIN    可选。默认 *，可改成你的 Pages 域名
 */

const PROVIDERS = {
  deepseek: { base: "https://api.deepseek.com",                keyEnv: "DEEPSEEK_KEY", model: "deepseek-flash" },
  qwen:     { base: "https://dashscope.aliyuncs.com/compatible-mode/v1", keyEnv: "DASHSCOPE_KEY", model: "qwen-plus" },
  doubao:   { base: "https://ark.cn-beijing.volces.com/api/v3", keyEnv: "ARK_KEY",      model: "doubao-seed-2-0-mini-260215" }
};

const RATE_LIMIT = 30;      // 每 IP 每分钟最多请求数
const hits = new Map();     // 实例内存计数，够用且不花钱

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-app-token",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, cors(env))
  });
}

function allowed(ip) {
  const now = Math.floor(Date.now() / 60000);
  const rec = hits.get(ip);
  if (!rec || rec.minute !== now) {
    hits.set(ip, { minute: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return true;
  }
  rec.count += 1;
  return rec.count <= RATE_LIMIT;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        providers: Object.keys(PROVIDERS).map(k => ({
          id: k,
          keySet: !!env[PROVIDERS[k].keyEnv],
          defaultModel: PROVIDERS[k].model
        }))
      }, 200, env);
    }

    const m = url.pathname.match(/^\/([a-z]+)\/chat\/completions$/);
    if (!m || request.method !== "POST") {
      return json({ error: { message: "用法：POST /{deepseek|qwen|doubao}/chat/completions" } }, 404, env);
    }

    const providerId = m[1];
    const p = PROVIDERS[providerId];
    if (!p) return json({ error: { message: "未知服务商：" + providerId } }, 404, env);

    // 访问令牌（可选）
    if (env.APP_TOKEN && request.headers.get("x-app-token") !== env.APP_TOKEN) {
      return json({ error: { message: "访问令牌不正确（x-app-token）" } }, 401, env);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!allowed(ip)) {
      return json({ error: { message: "请求过于频繁，稍后再试（" + RATE_LIMIT + " 次/分钟）" } }, 429, env);
    }

    const key = env[p.keyEnv];
    if (!key) return json({ error: { message: "服务端未配置 " + p.keyEnv } }, 500, env);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: { message: "请求体不是合法 JSON" } }, 400, env);
    }

    if (!body.model) body.model = p.model;
    if (!Array.isArray(body.messages)) {
      return json({ error: { message: "缺少 messages" } }, 400, env);
    }
    // 限长，避免被当作免费算力
    if (body.max_tokens == null || body.max_tokens > 2000) body.max_tokens = 800;

    const upstream = await fetch(p.base + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
      },
      body: JSON.stringify(body)
    });

    const headers = Object.assign({}, cors(env));
    const ct = upstream.headers.get("Content-Type");
    if (ct) headers["Content-Type"] = ct;
    if (!upstream.ok) headers["X-Upstream-Status"] = String(upstream.status);

    // 流式响应直接透传，前端按 SSE 解析
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
