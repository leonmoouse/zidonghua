# 文案自动化系统

## 快速上手

### 环境要求
- Python 3.11+
- Node.js >= 18（如需运行前端）

### 安装依赖
```bash
# 后端
python -m venv .venv
source .venv/bin/activate  # Windows 使用 .venv\\Scripts\\activate
pip install -r backend/requirements.txt

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
uvicorn backend.main:app --reload --host 0.0.0.0 --port 7788

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
