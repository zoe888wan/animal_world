# 🐾 动物世界 - 宠物主人社交平台

基于 **IDEA + Node.js + MySQL** 搭建。主人为宠物注册的社交媒体：发动态、约玩、买虚拟商品、打造宠物小明星。

## ⚡ 一键启动（推荐）

**前提**：MySQL 已启动，`backend/.env` 已配置，且 `backend`、`frontend` 已执行过 `npm install`。

```bash
cd animal-world
npm install          # 首次需要，安装 concurrently
npm run dev          # 同时启动后端(3001) + 前端(5173)
```

看到 `动物世界 API http://localhost:3001` 和 `Local: http://localhost:5173/` 后，浏览器打开 **http://localhost:5173** 即可访问。

> 若无法访问：确保 **不要关闭运行 `npm run dev` 的终端**，关闭后服务会停止，网页将无法访问。

## 项目结构

```
animal-world/
├── backend/       # Node.js + Express API（端口 3001）
├── frontend/      # React + Vite + TypeScript（端口 5173）
├── database/      # MySQL 建表与种子数据
└── docker-compose.yml  # 可选：MySQL Docker 快速启动
```

## 环境要求

- **Node.js** 18+
- **MySQL** 8.0
- **IDEA** 或任意 IDE

## 一、MySQL 数据库

### 方式 A：Docker（推荐）

```bash
cd animal-world
docker compose up -d
# 等待几秒后执行建表
docker exec -i animal-world-mysql mysql -uapp -papp123 animal_world < database/schema-mysql.sql
docker exec -i animal-world-mysql mysql -uapp -papp123 animal_world < database/seed-mysql.sql
```

### 方式 B：本地 MySQL

1. 创建数据库：`CREATE DATABASE animal_world CHARACTER SET utf8mb4;`
2. 在 IDEA Terminal 或 MySQL 客户端执行：
   ```bash
   mysql -u root -p animal_world < database/schema-mysql.sql
   mysql -u root -p animal_world < database/seed-mysql.sql
   ```
   3. 可选迁移：`add-features-v2.sql`（活动类型/签到/信誉分）

## 二、后端

在 IDEA 打开 `animal-world` 文件夹，打开 Terminal：

```bash
cd backend
npm install
```

复制 `.env.example` 为 `.env`，配置数据库连接（MySQL）：

```
PORT=3001
DATABASE_URL=mysql://app:app123@localhost:3306/animal_world
JWT_SECRET=your-secret-key
```

启动：

```bash
npm run dev
```

## 三、前端

新开一个 Terminal：

```bash
cd frontend
npm install
npm run dev
```

## 四、访问

浏览器打开 **http://localhost:5173** ，注册后即可使用。

- 登录/注册
- 我的宠物（添加、编辑）
- 动态（发帖、点赞、评论）
- 约玩活动
- 虚拟商城 + 支付
- 明星榜

---

## 无法访问此网页？排查步骤

| 现象 | 可能原因 | 解决办法 |
|------|----------|----------|
| 页面打不开，显示“无法访问此网页” | 前端或后端未启动 | 在 `animal-world` 目录执行 `npm run dev`，保持终端开启 |
| 页面能打开但登录/加载失败 | 后端(3001)未启动或 MySQL 未运行 | 确认 `npm run dev` 中 backend 已启动；确认 MySQL 服务已启动 |
| 端口被占用 | 5173 或 3001 被其他程序占用 | 关闭占用端口的程序，或修改 `vite.config.ts` / `backend/.env` 中的端口 |

---

## IDEA 中运行

1. 用 IDEA 打开 `animal-world` 文件夹
2. 打开底部 Terminal
3. 执行 `npm install`（首次），然后 `npm run dev` 同时启动前后端
4. 或按需分别开两个 Terminal：`cd backend && npm run dev`、`cd frontend && npm run dev`
