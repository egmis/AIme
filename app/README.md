# app/ · 安卓打包层

这里不写业务代码，只负责把 `docs/index.html` 包成可安装的 APK。

## 结构

```
app/
├── package.json             Capacitor 依赖
├── capacitor.config.json    appId / appName / webDir
└── www/index.html           构建时由 CI 从 docs/index.html 复制，不提交
```

## 为什么用 Capacitor

`docs/index.html` 是零依赖的纯 HTML，Capacitor 可以把它原样装进原生 WebView，得到一个真正能安装的 APK，不改一行前端代码。适合快速验证交互、发给朋友试用。

它的能力边界要说清楚：

- ✅ 能装、能跑、能全屏、能读本地存储
- ❌ 用不上微信登录、微信支付、小程序分享
- ❌ 大模型调用仍需走你自己的服务端（密钥不能放客户端）

所以它是**验证用外壳**，不是最终形态。最终形态见 docs/03-路线图.md 的 M1（小程序）+ 后续 uni-app / 原生方案。

## 本地构建（需 JDK 17 + Android SDK）

```bash
cd app
npm install
mkdir -p www && cp ../docs/index.html www/index.html
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

## 云端构建（推荐，无需本地环境）

推送到 main 后 GitHub Actions 自动构建，或手动触发：

1. 打开仓库 **Actions** 标签
2. 左侧选 **Build Android APK** → 右侧 **Run workflow** → main → Run
3. 约 3–6 分钟后，进入该次运行页面，底部 **Artifacts** 下载 `AIme-debug-apk`

APK 是 debug 签名，可直接安装（手机需允许"未知来源"）。上架应用商店需换成 release 签名，届时用你自己的 keystore，通过仓库 Secrets 注入，**不要提交密钥文件**。
