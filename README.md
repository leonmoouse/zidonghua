# 文案自动化系统

## 快速上手

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn

### 安装依赖
```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 环境配置
1. 复制 `.env.example` 为 `.env`
2. 根据实际情况配置环境变量

### 启动项目
```bash
# 启动后端服务
cd backend
npm start

# 启动前端服务
cd frontend
npm start
```

### 项目结构
```
├─ agents.md                    # Codex 实现规范
├─ README.md                    # 项目快速上手
├─ .gitignore
├─ .env.example                 # 环境变量样例
├─ frontend\                    # 前端工程
└─ backend\
   ├─ charters\                 # 宪章示例文件
   ├─ data\                     # 运行期数据
   ├─ outputs\                  # 最终文案备份
   ├─ docs\                     # 接口文档
   └─ api_spec\                 # OpenAPI规范
```

## 开发指南
详见 `agents.md` 文件。
