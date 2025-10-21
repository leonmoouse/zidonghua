# 前端快速上手指南

本目录包含文案自动化项目的前端（React + TypeScript + Vite）实现。下列步骤帮助你在本地启动或构建该应用。

## 1. 环境要求
- Node.js 18+
- npm 9+（或 pnpm / yarn，命令需自行替换）

## 2. 安装依赖
```bash
npm install
```

## 3. 开发调试
1. 复制 `.env.local.example` 为 `.env.local` 并根据需要填写 API 地址：
   ```bash
   cp .env.local.example .env.local
   ```
2. 启动开发服务器：
   ```bash
   npm run dev
   ```
3. 打开终端输出中的本地地址（默认 http://localhost:5173）。

## 4. 构建与预览
```bash
npm run build
npm run preview
```

## 5. 目录说明
```
frontend/
├─ src/
│  ├─ components/   # UI 组件
│  ├─ lib/          # API、类型、校验、配置
│  ├─ pages/        # 三步向导页面
│  ├─ styles/       # Tailwind 入口
│  ├─ App.tsx       # 应用根组件
│  └─ router.tsx    # 路由定义
```

## 6. 环境变量
- `VITE_API_BASE_URL`（必填）：后端 API 根地址，例如 `http://localhost:7788`
- `VITE_POLL_INTERVAL_MS`（可选）：轮询状态接口的间隔，默认 1200ms
- `VITE_REQUEST_TIMEOUT_MS`（可选）：请求超时时间，默认 20000ms

所有变量都写在 `.env.local` 中，构建时会注入。

## 7. 设计约定
- UI 文案使用中文。
- 状态仅存于内存（不写入本地存储）。
- TailwindCSS 用于快速布局，可根据需求追加自定义样式。

