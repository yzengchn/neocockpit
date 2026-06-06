# NeoCockpit 🚗✨

> AI-Native Content Generation Platform for Smart Cockpit
> 
> 面向智能座舱的 AI 原生内容生成平台

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)

---

输入一段文字，自动生成壁纸 / 主题 / 数字人 的完整资源包。
直达入口：[neocockpit.cn](https://neocockpit.cn)

## ✨ 核心功能

|      模式       | 输入 | 输出 |
|:-------------:|:----:|:----:|
|  🖼️ **壁纸**   | 风格描述 | 2560×1440 高清壁纸 |
|   🎨 **主题**   | 主题描述 + 图标勾选 | 背景图 + 图标精灵图 → 多分辨率资源包 |
|  👤 **数字人**   | 角色描述 | 肖像 + PBR 纹理 + WebGL 3D 预览 |
| 💡 **DIY 生图** | 自定义提示词 | AI 直接生图 |

**核心流程：** 文字描述 → LLM 优化提示词 → 多模型生成 → 自动后处理 → 打包下载

---

## 🏗️ 技术栈

**后端**
- FastAPI + SQLAlchemy
- PostgreSQL (任务状态 + 用户积分)
- Pillow (图像处理 + 切片)
- 多 AI 提供商适配器 (OpenAI / 豆包 / 通义)

**前端**
- React 18 + TypeScript
- Ant Design (暗色主题)
- TanStack Query (状态管理)
- WebGL2 (零依赖 3D 预览)

---

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+
- PostgreSQL

### 1️⃣ 后端启动

```bash
# 安装依赖
cd backend
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入：PostgreSQL URL、AI API Keys、管理员密码

# 初始化数据库
# 创建数据库后，执行 backend/db_schema.sql 导入表结构和种子数据

# 启动服务
uvicorn main:app --reload --port 8000
```

### 2️⃣ 前端启动

**用户端 (Web)**
```bash
cd frontend-web
npm install
npm run dev    # → http://localhost:5173
```

**管理端 (Admin)**
```bash
cd frontend-admin
npm install
npm run dev    # → http://localhost:5174
```

> 默认管理员账号：`admin / admin`（可在 `.env` 中修改）

---

## 🔐 特色功能

### 笔迹签名登录

- **一笔画认证** — 通过笔画轨迹作为身份凭证，无需传统密码
- **锚点提示** — 登录时显示起点（绿）和终点（红）辅助回忆
- **原始笔迹展示** — 个人中心展示量化格子图 + 原始笔迹蒙层

### 多 AI 提供商
每个任务独立选择提供商，支持故障自动切换。

### 社交互动

- **点赞系统** — 每人每任务一次，作者获得积分奖励
- **浏览统计** — 详情页浏览量展示
- **评论审核** — LLM 自动审核评论内容
- **通知系统** — 点赞、评论、违规提醒

---

## 📁 项目结构

```
neocockpit/
├── backend/               # FastAPI 后端
│   ├── main.py           # 应用入口
│   ├── db_schema.sql     # 数据库 schema + 种子数据
│   └── app/
│       ├── api/          # REST 端点
│       ├── core/         # 数据库 + 认证 + 日志
│       ├── models/       # SQLAlchemy 模型
│       ├── services/     # 业务逻辑
│       └── adapters/     # AI 提供商适配器
├── frontend-web/         # 用户端 (React)
│   └── src/
│       ├── pages/        # 页面组件
│       ├── components/   # 公共组件
│       └── services/     # API 客户端
├── frontend-admin/       # 管理端 (React)
│   └── src/
│       └── pages/Admin/  # 管理页面
├── output/               # 生成的资源文件
└── logs/                 # 日志文件
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 [MIT License](LICENSE)