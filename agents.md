# 文案自动化 · Backend/Infra 规范（Qdrant Cloud 版）
**版本**：v1.0  
**状态**：正式发布  
**适用范围**：仅后端与向量检索层（前端交互已定）

---

## 1. 目标与非目标

### 1.1 目标
- 交付一个**可并发**、**可迁移**、**可落盘备份**的后端服务，为既定前端提供 API：
  - P0：根据关键词，从四个视角生成标题。
  - 页2：根据作者/语气/写作目的与标题，检索模板/语气/证据宪章。
  - P2/P3/P4：两路并行生成 A/B 文案，逐步套入**模板→语气→证据**，产出最终文案 A/B。
  - 将最终文案以**卡片**形式返回，同时**写入磁盘**备份。
- 使用 **Qdrant Cloud** 托管向量检索；使用本地 **BAAI/bge-m3** 进行向量化。
- 全量行为均由 REST API 暴露给前端，满足**多任务同时执行**。

### 1.2 非目标
- 不涉及账号/鉴权体系、支付、权限。
- 不包含 CI/CD 与运维脚本。
- 不限制具体云商或操作系统；仅规定能力与接口。

---

## 2. 术语与缩略语
- **DS**：后端调用的"大语言模型"（OpenAI 兼容 Chat Completions 接口）。
- **BGE-M3**：`BAAI/bge-m3` 本地向量模型（dense）。
- **Qdrant Cloud**：Qdrant 官方云服务（HTTPS + API Key）。
- **宪章**：三类知识单元数据——模板宪章、语气宪章、证据宪章。
- **Job**：一次完整的 P1x→P2→P3→P4 流水线任务。

---

## 3. 架构与运行时

### 3.1 组件
- **API 服务**：FastAPI（或等效）实现 REST。
- **向量化组件**：本地加载 BGE-M3，提供 `embed(texts)->float32[n×d]`。
- **向量检索**：Qdrant Cloud 集合 `muban`/`yuqi`/`cross`/`daojia`。
- **作业编排**：异步 I/O + 线程池，支持多 Job 并行（最小 8 并发）。
- **存储**：
  - 最终文案：`backend/outputs/<jobId>/final_A.md|final_B.md`
  - 作者/语气：`backend/data/authors.json`
  - 宪章原始示例：`backend/charters/`

### 3.2 可迁移性
- **MUST**：所有路径、端口、密钥、外部地址均由 `.env` 配置。
- **MUST**：仅需复制仓库 + 安装依赖 + 放置 BGE-M3 + 配置 `.env` 即可在新机器运行。
- **MUST**：Qdrant 使用 Cloud，不要求本地安装。

---

## 4. 目录结构（后端视角）

```
<PROJECT_ROOT>/
├─ agents.md # 本规范（供实现/审阅）
├─ README.md # 快速上手说明
├─ .env.example # 环境变量样例（不含真实密钥）
├─ .gitignore
├─ frontend/ # 前端工程（由你维护）
└─ backend/
   ├─ charters/ # 宪章示例（输入素材）
   │   ├─ 模板宪章示例.json
   │   ├─ 语气映射宪章示例.json
   │   └─ 证据宪章示例.json
   ├─ data/
   │   └─ authors.json # 作者/语气列表（可被 API 写入）
   ├─ outputs/ # 最终文案落盘（按 jobId 分目录）
   ├─ docs/ # 可选：接口文档/架构图
   └─ api_spec/ # 可选：OpenAPI 草案
```

---

## 5. 环境与配置

### 5.1 运行环境
- Python 3.10+（建议 3.11）
- Windows / macOS / Linux
- 可访问互联网（Qdrant Cloud，DS 网关）

### 5.2 依赖建议（由 Codex 自行添加到 requirements）
- FastAPI / Uvicorn
- httpx
- qdrant-client
- FlagEmbedding（加载 BGE-M3）
- numpy / orjson
- python-dotenv
- （可选）SQLAlchemy（若落地 Job 状态到 SQLite）

### 5.3 `.env` 变量（**MUST** 支持）
| 变量名 | 说明 | 示例 |
|---|---|---|
| `DS_BASE_URL` | DS 网关（OpenAI 兼容） | `https://your-llm-gateway.example.com/v1` |
| `DS_API_KEY` | DS 密钥 | `sk-***` |
| `DS_MODEL` | DS 模型名 | `deepseek-chat` |
| `MODELS_PATH` | 本地 BGE-M3 路径 | `D:\hf_models\BAAI\bge-m3` |
| `QDRANT_URL` | Qdrant Cloud 端点 | `https://<cluster-id>.<region>.qdrant.cloud` |
| `QDRANT_API_KEY` | Qdrant API Key | `***` |
| `PROJECT_ROOT` | 项目根目录 | `D:\文案自动化` |
| `PORT` | 服务端口 | `7788` |
| `CORS_ALLOW_ORIGINS` | CORS 允许源 | `*` |

**MUST**：服务启动时校验关键配置（缺失即报错并退出）。

---

## 6. 数据与向量库规范

### 6.1 文本预处理（**SHOULD**）
- 统一 UTF-8。
- 去 BOM、去不可见控制字符、合并多空白。
- 保留中文标点，不做简繁转（除非另有库要求）。

### 6.2 向量模型
- **MUST**：使用本地 `BAAI/bge-m3` 生成 dense 向量（float32）。
- **MUST**：自动探测维度 `d`（通过对固定字符串 `["probe"]` 做一次编码）。
- **MUST**：批量向量化时 `batch_size` 不小于 8；内存不足时分批。

### 6.3 Qdrant 集合（Collections）
四个集合，均使用 **COSINE** 距离：
- `muban`（模板）：用于结构/句式召回  
  payload 示例：
  ```json
  {
    "type": "muban",
    "source": "模板宪章示例.json",
    "text": "句式公式1；句式公式2；……",
    "created_at": "2025-10-21T12:00:00Z",
    "tags": ["结构","句式"]
  }
  ```
- `yuqi`（语气）：用于语气签名召回
  ```json
  { "type":"yuqi", "source":"语气映射宪章示例.json", "text":"稳重科普/经验型带教...", "created_at":"...", "tags":["语气","签名"] }
  ```
- `cross`（证据-现代/跨域）
- `daojia`（证据-道家/经典）
  ```json
  { "type":"evidence", "bucket":"cross|daojia", "source":"证据宪章示例.json", "text":"证据片段...", "created_at":"...", "tags":["证据"] }
  ```

### 6.4 初始化流程（MUST 提供）
从 backend/charters/ 读取三份示例 JSON：

- 模板：以"句式/结构单元"为粒度拆分多条 text。
- 语气：以"高频签名 token/语气特征"为粒度拆分多条 text。
- 证据：
  - cross：现代综述/科学解释
  - daojia：经典引文/要点

统一做向量化，Upsert 到四个集合。

**MUST**：可重复执行（幂等，不会无限增副本；至少提供"重建/清空后重建"的能力）。

**MUST**：失败时返回可诊断的错误消息。

---

## 7. 流水线（Pipeline）规范

### 7.1 总述
Job 由以下阶段构成：INIT → P1x → P2 → P3 → P4 → DONE

P1x 为三子步并发（P1 / P1.5 / P1.9）：

- P1 模板宪章：集合 muban，k=2
  Query = 作者 + 主写作目的 + 次要目的（;分隔）
- P1.5 语气宪章：集合 yuqi，k=1
  Query = 语气（为空则回退用 作者）
- P1.9 证据宪章：集合 cross、daojia，各 k=1
  Query = 最终标题

后续串行：P2（初级 A/B）→ P3（中级 A/B）→ P4（最终 A/B）。

### 7.2 P0（第一页：四视角标题生成）
输入：keywords（string）

处理：调用 DS 让模型仅返回 严格 JSON：
```json
{ "behavior":[], "emotion":[], "mechanism":[], "philosophy":[] }
```
各数组长度 MUST=3；元素为中文标题，≤ 28 字符，禁止解释文本。

失败重试：若非 JSON，SHOULD 进行 1 次重试（提示模型"严格输出 JSON"）。

### 7.3 P2（根据模板宪章生成初级文案 A/B）
输入：题目 + 模板宪章1/2（text）

处理：两次调用 DS，分别生成《初级文案A》《初级文案B》。

约束：段落结构与模板要素一致；不要引入语气/证据信息。

### 7.4 P3（将 A/B 套入语气宪章）
输入：初级文案A/B + 语气宪章（text）

输出：中级文案A/B

约束：显著体现语气特征，不得改变核心要点。

### 7.5 P4（将 A/B 融合证据宪章）
输入：中级文案A/B + 证据（cross 1 + daojia 1 合并）

输出：最终文案A/B

约束：融入证据以增强可信度；避免堆砌引用；保持阅读流畅。

### 7.6 并发与稳定性
**MUST**：P1 / P1.5 / P1.9 并发执行；后续串行。

**MUST**：为每步设置合理超时（建议 120s）与最多 2 次重试（指数退避）。

**SHOULD**：在 DS 抖动时做轻微退避；在向量检索失败时给出可替代降级（例如返回空命中并继续）。

---

## 8. REST API 契约

### 8.1 通用
Base URL 例：http://localhost:{PORT}

Response：application/json; charset=utf-8

成功状态：200/201

失败状态：4xx/5xx，错误体 MUST：
```json
{ "error": { "code": "STRING", "message": "人类可读描述", "details": { } } }
```

**SHOULD**：在响应头中返回 x-request-id（UUID）便于追踪。

### 8.2 P0：四视角标题
POST /api/p0/titles

Req：
```json
{ "keywords": "string (1..200 chars)" }
```

Resp：
```json
{
  "behavior": ["t1","t2","t3"],
  "emotion": ["t1","t2","t3"],
  "mechanism": ["t1","t2","t3"],
  "philosophy": ["t1","t2","t3"]
}
```

### 8.3 作者/语气
GET /api/authors → string[]

POST /api/authors

Req: {"name":"string (1..40)"}

Resp: {"ok": true, "authors": ["..."]}

语气默认：若新作者无语气，自动附带 ["默认"]

GET /api/voices?author=<name> → string[]

若作者不存在，返回 [] 且不报错。

### 8.4 启动流水线
POST /api/pipeline/start

Req：
```json
{
  "title": "string (1..120)",
  "author": "string (1..40)",
  "tone": "string (0..40)",
  "intent_main": "string (enum:8)",
  "intent_secondary": ["string (enum:8)"]
}
```
intent 的 8 个枚举见 §10。

Resp：{"job_id": "YYYYMMDD-HHMMSS-ffffff"}

GET /api/pipeline/status?job_id=...

Resp：
```json
{ "stage": "INIT|P1x|P2|P3|P4|DONE|ERROR", "progress": 0.0, "message": "..." }
```

GET /api/pipeline/result?job_id=...

成功：
```json
{
  "final_A": "string",
  "final_B": "string",
  "files": {
    "A": "backend/outputs/<jobId>/final_A.md",
    "B": "backend/outputs/<jobId>/final_B.md"
  }
}
```

未完成：{ "stage": "P3", "progress": 0.6 }

失败：错误体（见 8.1）

### 8.5 管理端（可选，MAY）
POST /api/admin/vector-init：重建四集合索引（幂等）。

GET /api/admin/health：依赖健康（DS/Qdrant/BGE）。

受本地 only 或管理密钥保护。

---

## 9. 业务规则与校验

### 标题（P0 输出）：
**MUST**：严格 JSON；每视角恰好 3 条；避免重复；不含解释性文字。

### 作者/语气：
**MUST**：作者名唯一（大小写敏感度由实现者决策，推荐不敏感）。

**MUST**：authors.json 写入原子化（写临时文件后替换）。

### 向量检索：
**MUST**：muban(k=2)、yuqi(k=1)、cross(k=1)、daojia(k=1)。

**SHOULD**：保留 score 供调试（无需返回前端）。

### 结果落盘：
**MUST**：A/B 同时写入；文件编码 UTF-8；若写入失败，Job 标记为 ERROR。

### 并发：
**MUST**：多个 Job 不得互相覆盖输出；job_id 全局唯一。

### 错误处理：
**MUST**：任何一步失败，都要将 Job 状态置为 ERROR 并返回 message。

---

## 10. 枚举（写作目的，供前端传参/后端校验）
1. 排查修复/ Troubleshooting（从症状到根因）
2. 神话粉碎/ 反常识观点（改认知为主）
3. 机制解释/ 科学原理（让人"懂了"）
4. 教程/ How-to（改行为为主）
5. 转化文案/ 方案推荐（解决"为什么选你"）
6. 取舍决策/ 方案对比（帮助做选择）
7. 立场社论/ 观点针砭（建立权威与风格）
8. 动员类/ 号召行动（点燃+可执行）

---

## 11. DS 调用与提示词（Prompt）规范

### 11.1 通用
**MUST**：使用 OpenAI 兼容 /v1/chat/completions。

**MUST**：加入 system 提示明确角色/约束。

**SHOULD**：temperature 在 0.6~0.9 之间按步骤微调；max_tokens 适度冗余。

**MUST**：P0 要求严格 JSON 输出；必要时加格式说明与示例。

### 11.2 P0（标题）
system：你是资深中文标题编辑，注意精炼有冲击力，只返回JSON，不要解释。

user：包含关键词与四视角要求 + 期望 JSON 架构。

### 11.3 P2（模板→初级）
system：你是中文资深文案，依据模板句式快速产出段落。

user：给出题目与单一模板文本，要求生成《初级文案X》。

### 11.4 P3（套语气）
system：你是文案风格调校器，严格套入给定语气要素。

user：给出语气宪章与《初级文案X》，要求输出《中级文案X》。

### 11.5 P4（融证据）
system：你是事实/论证增强器，请在不改变大意的情况下把证据融入文案，增强可信度。

user：给出合并后的证据文本与《中级文案X》，要求输出《最终文案X》。

---

## 12. 观测性与日志
**MUST**：INFO 级日志覆盖关键阶段；ERROR 包含上下文（但不得泄露密钥或用户原文）。

**SHOULD**：每个请求/Job 打印 job_id 与 x-request-id。

**SHOULD**：记录 DS/Qdrant 耗时用于后期优化。

---

## 13. 安全与合规
**MUST**：密钥只通过 .env 注入；不得写入仓库。

**MUST**：不在日志打印任何密钥/Authorization 头。

**SHOULD**：为管理端接口加本地白名单或管理密钥保护。

---

## 14. 测试与验收

### 14.1 单元测试（SHOULD）
- 文本预处理、embed 维度一致性。
- Qdrant 检索包装：空返回/异常回退。
- JSON schema 校验（特别是 P0）。

### 14.2 集成测试（MUST）
- 端到端跑通：P0→P1x→P2→P3→P4。
- 多 Job 并发（≥3）互不干扰，输出文件存在且不覆盖。

### 14.3 验收标准（MUST）
- P0 返回四视角各 3 条标题（合法 JSON、中文、≤28 字）。
- 启动 Job 后，/status 阶段依次推进至 DONE。
- /result 返回 final_A/B，磁盘存在对应文件。
- 更换电脑后仅通过 .env 与本地模型路径调整即可运行。
- 使用 Qdrant Cloud，未安装本地向量库服务。

---

## 15. 运行手册（摘要）
1. 准备 .env（见 §5.3）。
2. 放置三份宪章示例于 backend/charters/。
3. 一键初始化向量库（提供管理接口或脚本触发）。
4. 启动后端（默认 :7788）。
5. 前端接入：
   - 页1：POST /api/p0/titles
   - 页2：作者/语气接口 + POST /api/pipeline/start；轮询 /status；完成取 /result。

---

## 16. 变更控制
版本号遵循 MAJOR.MINOR.PATCH。

API 改动或行为变化需在 agents.md 变更记录中说明并加日期。